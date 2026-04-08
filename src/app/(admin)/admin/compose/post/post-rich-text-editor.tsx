"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  ChevronDown,
  Image as ImageIcon,
  Italic,
  Link2,
  Quote,
  Check,
} from "lucide-react";
import {
  createEditor,
  Editor,
  Element as SlateElement,
  Range,
  Text,
  Transforms,
  type Descendant,
} from "slate";
import {
  Editable,
  Slate,
  ReactEditor,
  useSlate,
  withReact,
  type RenderElementProps,
  type RenderLeafProps,
} from "slate-react";
import { withHistory } from "slate-history";
import { renderSlateContentHtml, serializeSlateContent } from "@/lib/slate-content";

type PostRichTextEditorProps = {
  initialValue: Descendant[];
};

type MarkFormat = "bold" | "italic" | "code";
type BlockFormat = "paragraph" | "heading-one" | "heading-two" | "heading-three" | "block-quote";

type ImageElement = {
  type: "image";
  url: string;
  alt?: string | null;
  children: Text[];
};

type LinkElement = {
  type: "link";
  url: string;
  children: Text[];
};

type InsertDialogState =
  | {
      dialogKey: number;
      kind: "link";
      selection: Range | null;
      url: string;
      text: string;
    }
  | {
      dialogKey: number;
      kind: "image";
      selection: Range | null;
      url: string;
      alt: string;
    }
  | null;

const HEADING_CHOICES = {
  paragraph: { label: "正文", icon: <Quote className="h-4 w-4 rotate-180" /> },
  "heading-one": { label: "一级标题", icon: <Heading1 className="h-4 w-4" /> },
  "heading-two": { label: "二级标题", icon: <Heading2 className="h-4 w-4" /> },
  "heading-three": { label: "三级标题", icon: <Heading3 className="h-4 w-4" /> },
} as const satisfies Record<
  "paragraph" | Exclude<BlockFormat, "paragraph" | "block-quote">,
  { label: string; icon: ReactNode | null }
>;

export function PostRichTextEditor({ initialValue }: PostRichTextEditorProps) {
  const editor = useState(
    () => withCustomElements(withHistory(withReact(createEditor())) as Editor) as Editor,
  )[0];
  const [value, setValue] = useState<Descendant[]>(() => initialValue);
  const isEditorEmpty = isEmptySlateDocument(value);
  const [insertDialog, setInsertDialog] = useState<InsertDialogState>(null);
  const insertDialogSeq = useRef(0);

  return (
    <section className="flex min-h-[18rem] flex-col gap-0">
      <input type="hidden" name="content" value={JSON.stringify(serializeSlateContent(value))} />
      <input type="hidden" name="contentHtml" value={renderSlateContentHtml(value)} />
      <Slate editor={editor} initialValue={initialValue} onChange={setValue}>
        <Toolbar
          onOpenLinkDialog={() =>
            setInsertDialog({
              dialogKey: ++insertDialogSeq.current,
              kind: "link",
              selection: cloneSelection(editor.selection),
              url: "",
              text: editor.selection ? Editor.string(editor, editor.selection) : "",
            })
          }
          onOpenImageDialog={() =>
            setInsertDialog({
              dialogKey: ++insertDialogSeq.current,
              kind: "image",
              selection: cloneSelection(editor.selection),
              url: "",
              alt: "",
            })
          }
        />
        <Editable
          className="block min-h-[18rem] max-h-[calc(100dvh-24rem)] w-full cursor-text overflow-y-auto px-0 py-2 text-[1.05rem] leading-9 text-zinc-800 outline-none transition dark:text-zinc-200"
          placeholder="开始写你的正文。可以用工具栏插入标题、引用、链接和图片。"
          renderElement={(props) => renderElement(props, isEditorEmpty)}
          renderLeaf={renderLeaf}
          spellCheck
          onMouseDown={(event) => {
            if (event.target !== event.currentTarget) {
              return;
            }

            event.preventDefault();
            ReactEditor.focus(editor);
            Transforms.select(editor, Editor.end(editor, []));
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              if (skipLinkOnArrow(editor, "backward")) {
                event.preventDefault();
                return;
              }
            }

            if (event.key === "ArrowRight") {
              if (skipLinkOnArrow(editor, "forward")) {
                event.preventDefault();
                return;
              }
            }

            if (event.key === "Backspace") {
              if (removeAdjacentLinkAtSelection(editor, "backward")) {
                event.preventDefault();
                return;
              }
            }

            if (event.key === "Delete") {
              if (removeAdjacentLinkAtSelection(editor, "forward")) {
                event.preventDefault();
                return;
              }
            }

            if (!event.metaKey && !event.ctrlKey) {
              return;
            }

            switch (event.key.toLowerCase()) {
              case "b":
                event.preventDefault();
                toggleMark(editor, "bold");
                break;
              case "i":
                event.preventDefault();
                toggleMark(editor, "italic");
                break;
              case "`":
                event.preventDefault();
                toggleMark(editor, "code");
                break;
              default:
                break;
            }
          }}
        />
      </Slate>
      <InsertResourceDialog
        key={insertDialog?.dialogKey ?? "closed"}
        editor={editor}
        dialog={insertDialog}
        onClose={() => setInsertDialog(null)}
      />
    </section>
  );
}

function Toolbar({
  onOpenLinkDialog,
  onOpenImageDialog,
}: {
  onOpenLinkDialog: () => void;
  onOpenImageDialog: () => void;
}) {
  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-0 bg-[color:var(--background)]/95 py-3 text-sm text-zinc-500 backdrop-blur-md supports-[backdrop-filter]:bg-[color:var(--background)]/85 dark:text-zinc-400">
      <ToolbarHeadingDropdown />
      <ToolbarMarkButton format="bold" label="粗体" icon={<Bold className="h-4 w-4" />} />
      <ToolbarMarkButton format="italic" label="斜体" icon={<Italic className="h-4 w-4" />} />
      <ToolbarMarkButton format="code" label="代码" icon={<Code2 className="h-4 w-4" />} />
      <ToolbarBlockButton format="block-quote" label="引用" icon={<Quote className="h-4 w-4" />} />
      <ToolbarActionButton
        label="链接"
        icon={<Link2 className="h-4 w-4" />}
        onClick={onOpenLinkDialog}
      />
      <ToolbarActionButton
        label="图片"
        icon={<ImageIcon className="h-4 w-4" />}
        onClick={onOpenImageDialog}
      />
    </div>
  );
}

function ToolbarMarkButton({
  format,
  label,
  icon,
}: {
  format: MarkFormat;
  label: string;
  icon: ReactNode;
}) {
  const editor = useSlate();
  const active = isMarkActive(editor, format);

  return (
    <ToolbarIconButton
      label={label}
      active={active}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
    >
      {icon}
    </ToolbarIconButton>
  );
}

function ToolbarBlockButton({
  format,
  label,
  icon,
}: {
  format: BlockFormat;
  label: string;
  icon: ReactNode;
}) {
  const editor = useSlate();
  const active = isBlockActive(editor, format);

  return (
    <ToolbarIconButton
      label={label}
      active={active}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleBlock(editor, format);
      }}
    >
      {icon}
    </ToolbarIconButton>
  );
}

function ToolbarHeadingDropdown() {
  const editor = useSlate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const activeFormat = getActiveHeadingFormat(editor);
  const activeLabel = activeFormat ? HEADING_CHOICES[activeFormat].label : "正文";

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current) {
        return;
      }

      if (!ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={`标题层级：${activeLabel}`}
        title={`标题层级：${activeLabel}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 items-center gap-1 px-1.5 text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        <span className="text-sm font-medium">{activeLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.12)] dark:border-zinc-800/80 dark:bg-zinc-950 dark:shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
          {Object.entries(HEADING_CHOICES).map(([format, choice]) => {
            const selected = format === (activeFormat ?? "paragraph");

            return (
              <button
                key={format}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  if (format === "paragraph") {
                    toggleBlock(editor, "paragraph");
                  } else {
                    toggleBlock(editor, format as Exclude<BlockFormat, "paragraph" | "block-quote">);
                  }
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition ${
                  selected
                    ? "bg-zinc-100 text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900/70 dark:hover:text-zinc-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-4 w-4 items-center justify-center text-zinc-400 dark:text-zinc-500">
                    {choice.icon}
                  </span>
                  <span>{choice.label}</span>
                </span>
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] transition ${
                    selected
                      ? "border-current bg-current text-white dark:text-zinc-950"
                      : "border-zinc-300 text-transparent dark:border-zinc-700"
                  }`}
                >
                  <Check className="h-3 w-3" />
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ToolbarActionButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <ToolbarIconButton label={label} onMouseDown={(event) => event.preventDefault()} onClick={onClick}>
      {icon}
    </ToolbarIconButton>
  );
}

function getActiveHeadingFormat(editor: Editor) {
  const [match] = Editor.nodes(editor, {
    match: (node) => isBlockElement(node) && node.type !== "paragraph" && node.type !== "block-quote",
  });

  if (!match || !SlateElement.isElement(match[0])) {
    return null;
  }

  if (
    match[0].type === "heading-one" ||
    match[0].type === "heading-two" ||
    match[0].type === "heading-three"
  ) {
    return match[0].type;
  }

  return null;
}

function focusSelection(editor: Editor, selection: Range | null) {
  ReactEditor.focus(editor);

  if (selection) {
    Transforms.select(editor, selection);
  }
}

function ToolbarIconButton({
  label,
  active = false,
  onMouseDown,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onMouseDown?: (event: MouseEvent<HTMLButtonElement>) => void;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        title={label}
        onMouseDown={onMouseDown}
        onClick={onClick}
        className={`inline-flex h-9 w-9 items-center justify-center text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 ${
          active ? "text-primary dark:text-sky-300" : ""
        }`}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-950 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 dark:bg-zinc-100 dark:text-zinc-950">
        {label}
      </span>
    </div>
  );
}

function InsertResourceDialog({
  editor,
  dialog,
  onClose,
}: {
  editor: Editor;
  dialog: InsertDialogState;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(dialog?.url ?? "");
  const [text, setText] = useState(dialog?.kind === "link" ? dialog.text : "");
  const [alt, setAlt] = useState(dialog?.kind === "image" ? dialog.alt : "");

  useEffect(() => {
    if (!dialog || typeof document === "undefined") {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;

    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [dialog]);

  if (!dialog || typeof document === "undefined") {
    return null;
  }

  const title = dialog.kind === "link" ? "插入链接" : "插入图片";
  const description =
    dialog.kind === "link" ? "输入链接地址，并填写页面里展示的文字。" : "输入图片外链和可选说明。";

  return createPortal(
    <div
      className="fixed inset-0 z-[95] bg-zinc-950/35 backdrop-blur-[2px] dark:bg-black/50"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <form
          className="w-full max-w-md rounded-[1.75rem] border border-zinc-200/80 bg-white p-6 shadow-[0_30px_120px_rgba(15,23,42,0.18)] dark:border-zinc-800/80 dark:bg-zinc-950"
          onClick={(event) => event.stopPropagation()}
          onSubmit={(event) => {
            event.preventDefault();

            if (!url.trim()) {
              return;
            }

            focusSelection(editor, dialog.selection);

            if (dialog.kind === "link") {
              insertLink(editor, url, text, dialog.selection);
            } else {
              insertImage(editor, url, alt, dialog.selection);
            }

            onClose();
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
                {dialog.kind === "link" ? "链接" : "图片"}
              </p>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {title}
              </h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center text-zinc-400 transition hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
              aria-label="关闭"
            >
              ×
            </button>
          </div>

          <label className="mt-6 grid gap-2">
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              {dialog.kind === "link" ? "链接地址" : "图片地址"}
            </span>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
              autoFocus
              className="h-11 border-b border-zinc-200/80 bg-transparent px-0 text-sm text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-primary/50 dark:border-zinc-800/80 dark:text-zinc-200 dark:placeholder:text-zinc-600"
            />
          </label>

          {dialog.kind === "link" ? (
            <label className="mt-5 grid gap-2">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">显示文字</span>
              <input
                type="text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="例如：查看原文"
                className="h-11 border-b border-zinc-200/80 bg-transparent px-0 text-sm text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-primary/50 dark:border-zinc-800/80 dark:text-zinc-200 dark:placeholder:text-zinc-600"
              />
            </label>
          ) : null}

          {dialog.kind === "image" ? (
            <label className="mt-5 grid gap-2">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">图片说明</span>
              <input
                type="text"
                value={alt}
                onChange={(event) => setAlt(event.target.value)}
                placeholder="可选"
                className="h-11 border-b border-zinc-200/80 bg-transparent px-0 text-sm text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-primary/50 dark:border-zinc-800/80 dark:text-zinc-200 dark:placeholder:text-zinc-600"
              />
            </label>
          ) : null}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center px-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center px-1 text-sm font-medium text-primary transition hover:opacity-80 dark:text-sky-300"
            >
              {dialog.kind === "link" ? "插入链接" : "插入图片"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function renderElement({ attributes, children, element }: RenderElementProps, isEditorEmpty: boolean) {
  switch (element.type) {
    case "link":
      return (
        <a
          {...attributes}
          contentEditable={false}
          href={element.url}
          className="inline-flex text-primary underline decoration-current dark:text-sky-300"
          rel="noreferrer noopener"
        >
          {children}
        </a>
      );
    case "heading-one":
      return (
        <h1
          {...attributes}
          className="mt-8 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
        >
          {children}
        </h1>
      );
    case "heading-two":
      return (
        <h2
          {...attributes}
          className="mt-6 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
        >
          {children}
        </h2>
      );
    case "heading-three":
      return (
        <h3
          {...attributes}
          className="mt-5 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
        >
          {children}
        </h3>
      );
    case "block-quote":
      return (
        <blockquote
          {...attributes}
          className="border-l-2 border-zinc-200 pl-4 text-zinc-600 dark:border-zinc-800 dark:text-zinc-300"
        >
          {children}
        </blockquote>
      );
    case "image":
      return (
        <figure
          {...attributes}
          contentEditable={false}
          className="my-8 overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={element.url}
            alt={element.alt ?? "Image"}
            className="block h-auto w-full"
            loading="lazy"
            decoding="async"
          />
          {element.alt ? (
            <figcaption className="px-0 pt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {element.alt}
            </figcaption>
          ) : null}
          <span className="sr-only">{children}</span>
        </figure>
      );
    default:
      return (
        <p
          {...attributes}
          className={`cursor-text ${isEditorEmpty ? "min-h-[18rem]" : ""}`}
        >
          {children}
        </p>
      );
  }
}

function renderLeaf({ attributes, children, leaf }: RenderLeafProps) {
  let content = children;

  if (leaf.bold) {
    content = <strong>{content}</strong>;
  }

  if (leaf.italic) {
    content = <em>{content}</em>;
  }

  if (leaf.code) {
    content = (
      <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-zinc-800">
        {content}
      </code>
    );
  }

  return <span {...attributes}>{content}</span>;
}

function withCustomElements(editor: Editor) {
  const { isInline, isVoid } = editor;

  editor.isInline = (element) => {
    return SlateElement.isElement(element) && element.type === "link" ? true : isInline(element);
  };
  editor.isVoid = (element) => {
    return SlateElement.isElement(element) && element.type === "image" ? true : isVoid(element);
  };

  return editor;
}

function isEmptySlateDocument(value: Descendant[]) {
  if (value.length !== 1) {
    return false;
  }

  const [node] = value;

  if (!SlateElement.isElement(node) || node.type !== "paragraph") {
    return false;
  }

  if (node.children.length !== 1) {
    return false;
  }

  const [child] = node.children;
  return Text.isText(child) && child.text.length === 0;
}

function isMarkActive(editor: Editor, format: MarkFormat) {
  const marks = Editor.marks(editor);
  return marks ? Boolean(marks[format]) : false;
}

function toggleMark(editor: Editor, format: MarkFormat) {
  const active = isMarkActive(editor, format);

  if (active) {
    Editor.removeMark(editor, format);
    return;
  }

  Editor.addMark(editor, format, true);
}

function isBlockActive(editor: Editor, format: BlockFormat) {
  const [match] = Editor.nodes(editor, {
    match: (node) => isBlockElement(node) && node.type === format,
  });

  return Boolean(match);
}

function toggleBlock(editor: Editor, format: BlockFormat) {
  const isActive = isBlockActive(editor, format);

  Transforms.setNodes(
    editor,
    {
      type: isActive ? "paragraph" : format,
    },
    {
      match: (node) => isBlockElement(node),
    },
  );
}

function insertLink(editor: Editor, url: string, text: string, selection?: Range | null) {
  if (!url.trim()) {
    return;
  }

  const currentSelection = selection ?? editor.selection;
  const displayText = text.trim() || url.trim();
  const linkNode: LinkElement = {
    type: "link",
    url: url.trim(),
    children: [{ text: displayText }],
  };

  if (!currentSelection) {
    const endPoint = Editor.end(editor, []);
    Transforms.select(editor, endPoint);
    Transforms.insertNodes(editor, linkNode);
    moveCaretAfterCurrentLink(editor);
    return;
  }

  if (Range.isCollapsed(currentSelection)) {
    Transforms.select(editor, currentSelection);
    Transforms.insertNodes(editor, linkNode);
    moveCaretAfterCurrentLink(editor);
    return;
  }

  Transforms.delete(editor, { at: currentSelection });
  Transforms.select(editor, currentSelection.anchor);
  Transforms.insertNodes(editor, linkNode);
  moveCaretAfterCurrentLink(editor);
}

function moveCaretAfterCurrentLink(editor: Editor) {
  const linkEntry = Editor.above(editor, {
    match: (node) => SlateElement.isElement(node) && node.type === "link",
  });

  if (!linkEntry) {
    return;
  }

  const after = Editor.after(editor, linkEntry[1]);

  if (after) {
    Transforms.select(editor, after);
    return;
  }

  const nextPath = linkEntry[1].slice(0, -1).concat(linkEntry[1][linkEntry[1].length - 1] + 1);

  try {
    Transforms.select(editor, Editor.start(editor, nextPath));
  } catch {
    // If Slate hasn't normalized the trailing text yet, keep the current caret position.
  }
}

function insertImage(editor: Editor, url: string, alt: string, selection?: Range | null) {
  const image: ImageElement = {
    type: "image",
    url: url.trim(),
    alt: alt.trim() || "Image",
    children: [{ text: "" }],
  };

  if (selection) {
    Transforms.select(editor, selection);
  }

  Transforms.insertNodes(editor, image);
}

function cloneSelection(selection: Range | null) {
  if (!selection) {
    return null;
  }

  return {
    anchor: { ...selection.anchor },
    focus: { ...selection.focus },
  };
}

function removeAdjacentLinkAtSelection(editor: Editor, direction: "backward" | "forward") {
  const selection = editor.selection;

  if (!selection || !Range.isCollapsed(selection)) {
    return false;
  }

  const [currentNode] = Editor.node(editor, selection.anchor.path);

  if (!Text.isText(currentNode)) {
    return false;
  }

  if (direction === "backward" && selection.anchor.offset !== 0) {
    return false;
  }

  if (direction === "forward" && selection.anchor.offset !== currentNode.text.length) {
    return false;
  }

  const adjacentPoint =
    direction === "backward" ? Editor.before(editor, selection.anchor) : Editor.after(editor, selection.anchor);

  if (!adjacentPoint) {
    return false;
  }

  const adjacentLinkEntry = Editor.above(editor, {
    at: adjacentPoint,
    match: (node) => SlateElement.isElement(node) && node.type === "link",
  });

  if (!adjacentLinkEntry) {
    return false;
  }

  Transforms.removeNodes(editor, { at: adjacentLinkEntry[1] });
  return true;
}

function skipLinkOnArrow(editor: Editor, direction: "backward" | "forward") {
  const selection = editor.selection;

  if (!selection || !Range.isCollapsed(selection)) {
    return false;
  }

  const linkEntry = Editor.above(editor, {
    at: selection,
    match: (node) => SlateElement.isElement(node) && node.type === "link",
  });

  if (linkEntry) {
    const targetPoint =
      direction === "backward"
        ? Editor.before(editor, linkEntry[1]) ?? Editor.start(editor, linkEntry[1].slice(0, -1))
        : Editor.after(editor, linkEntry[1]) ?? Editor.end(editor, linkEntry[1].slice(0, -1));

    if (targetPoint) {
      Transforms.select(editor, targetPoint);
      return true;
    }

    return false;
  }

  const [currentNode] = Editor.node(editor, selection.anchor.path);

  if (!Text.isText(currentNode)) {
    return false;
  }

  if (direction === "backward" && selection.anchor.offset !== 0) {
    return false;
  }

  if (direction === "forward" && selection.anchor.offset !== currentNode.text.length) {
    return false;
  }

  const adjacentPoint =
    direction === "backward" ? Editor.before(editor, selection.anchor) : Editor.after(editor, selection.anchor);

  if (!adjacentPoint) {
    return false;
  }

  const adjacentLinkEntry = Editor.above(editor, {
    at: adjacentPoint,
    match: (node) => SlateElement.isElement(node) && node.type === "link",
  });

  if (!adjacentLinkEntry) {
    return false;
  }

  const targetPoint =
    direction === "backward"
      ? Editor.before(editor, adjacentLinkEntry[1]) ?? Editor.start(editor, adjacentLinkEntry[1].slice(0, -1))
      : Editor.after(editor, adjacentLinkEntry[1]) ?? Editor.end(editor, adjacentLinkEntry[1].slice(0, -1));

  if (!targetPoint) {
    return false;
  }

  Transforms.select(editor, targetPoint);
  return true;
}

function isBlockElement(node: unknown): node is SlateElement & { type: BlockFormat } {
  return (
    SlateElement.isElement(node) &&
    (node.type === "paragraph" ||
      node.type === "heading-one" ||
      node.type === "heading-two" ||
      node.type === "heading-three" ||
      node.type === "block-quote")
  );
}
