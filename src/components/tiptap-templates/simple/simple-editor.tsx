"use client"

import { Code2, FileCode2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { JSONContent } from "@tiptap/react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Image } from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Spacer } from "@/components/tiptap-ui-primitive/spacer"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar"

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu"
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button"
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu"
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button"
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover"
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover"
import { MarkButton } from "@/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button"

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon"
import { LinkIcon } from "@/components/tiptap-icons/link-icon"

// --- Hooks ---
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint"

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils"
import { CodeBlockLowlightWithControls } from "@/lib/code-block-lowlight-with-controls"

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss"

const MainToolbarContent = ({
  editor,
  onHighlighterClick,
  onLinkClick,
  isMobile,
  showThemeToggle,
}: {
  editor: NonNullable<ReturnType<typeof useEditor>>
  onHighlighterClick: () => void
  onLinkClick: () => void
  isMobile: boolean
  showThemeToggle: boolean
}) => {
  return (
    <>
      <ToolbarGroup>
        <UndoRedoButton editor={editor} action="undo" />
        <UndoRedoButton editor={editor} action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu editor={editor} modal={false} levels={[2, 3, 4]} />
        <ListDropdownMenu
          editor={editor}
          modal={false}
          types={["bulletList", "orderedList", "taskList"]}
        />
        <BlockquoteButton editor={editor} />
        <CodeBlockButton editor={editor} />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton editor={editor} type="bold" />
        <MarkButton editor={editor} type="italic" />
        <MarkButton editor={editor} type="strike" />
        <MarkButton editor={editor} type="code" />
        <MarkButton editor={editor} type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover editor={editor} />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover editor={editor} /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton editor={editor} type="superscript" />
        <MarkButton editor={editor} type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton editor={editor} align="left" />
        <TextAlignButton editor={editor} align="center" />
        <TextAlignButton editor={editor} align="right" />
        <TextAlignButton editor={editor} align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton editor={editor} text="Add" />
      </ToolbarGroup>

      {showThemeToggle ? (
        <>
          <Spacer />
          {isMobile && <ToolbarSeparator />}
        </>
      ) : null}
    </>
  )
}

const MobileToolbarContent = ({
  editor,
  type,
  onBack,
}: {
  editor: NonNullable<ReturnType<typeof useEditor>>
  type: "highlighter" | "link"
  onBack: () => void
}) => (
  <>
    <ToolbarGroup>
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent editor={editor} />
    ) : (
      <LinkContent editor={editor} />
    )}
  </>
)

type SimpleEditorProps = {
  initialContent?: JSONContent | null
  initialContentHtml?: string | null
  contentFieldName?: string
  htmlFieldName?: string
  onDirtyChange?: (isDirty: boolean) => void
  showThemeToggle?: boolean
}

const EMPTY_DOCUMENT: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
}

export function SimpleEditor({
  initialContent = null,
  initialContentHtml = null,
  contentFieldName = "content",
  htmlFieldName = "contentHtml",
  onDirtyChange,
  showThemeToggle = false,
}: SimpleEditorProps) {
  const isMobile = useIsBreakpoint()
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  )
  const [isCodeView, setIsCodeView] = useState(false)
  const [codeValue, setCodeValue] = useState(() => initialContentHtml ?? "")
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [serializedContent, setSerializedContent] = useState("null")
  const [serializedHtml, setSerializedHtml] = useState("")
  const initialSignatureRef = useRef<string | null>(null)
  const activeMobileView = isMobile ? mobileView : "main"

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      CodeBlockLowlightWithControls,
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
    ],
    content: initialContent ?? initialContentHtml ?? EMPTY_DOCUMENT,
    onCreate({ editor }) {
      const nextContent = JSON.stringify(editor.getJSON())
      const nextHtml = editor.getHTML()

      initialSignatureRef.current = getEditorSignature(nextContent, nextHtml)
      setSerializedContent(nextContent)
      setSerializedHtml(nextHtml)
      onDirtyChange?.(false)
    },
    onUpdate({ editor }) {
      const nextContent = JSON.stringify(editor.getJSON())
      const nextHtml = editor.getHTML()

      setSerializedContent(nextContent)
      setSerializedHtml(nextHtml)
      onDirtyChange?.(getEditorSignature(nextContent, nextHtml) !== initialSignatureRef.current)
    },
  })

  useEffect(() => {
    void toolbarRef.current
  }, [])

  function toggleCodeView() {
    if (!editor) {
      return
    }

    if (!isCodeView) {
      syncCodeValue(editor.getHTML())
      setIsCodeView(true)
      return
    }

    setIsCodeView(false)
  }

  function syncCodeValue(nextCodeValue: string) {
    setCodeValue(nextCodeValue)

    if (!editor || !isCodeView) {
      return
    }

    const nextHtml = nextCodeValue.trim() || "<p></p>"

    editor.commands.setContent(nextHtml)
    const nextContent = JSON.stringify(editor.getJSON())
    const renderedHtml = editor.getHTML()

    setSerializedContent(nextContent)
    setSerializedHtml(renderedHtml)
    onDirtyChange?.(getEditorSignature(nextContent, renderedHtml) !== initialSignatureRef.current)
  }

  return (
    <div className="simple-editor-wrapper">
      <input type="hidden" name={contentFieldName} value={serializedContent} />
      <input type="hidden" name={htmlFieldName} value={serializedHtml} />
      <EditorContext.Provider value={{ editor }}>
        {editor ? (
          <div className="simple-editor-secondary-toolbar">
            <ModeToggle isCodeView={isCodeView} onToggleCodeView={toggleCodeView} />
          </div>
        ) : null}

        <Toolbar
          ref={toolbarRef}
        >
          {!isCodeView && editor && activeMobileView === "main" ? (
            <MainToolbarContent
              editor={editor}
              onHighlighterClick={() => setMobileView("highlighter")}
              onLinkClick={() => setMobileView("link")}
              isMobile={isMobile}
              showThemeToggle={showThemeToggle}
            />
          ) : !isCodeView && editor ? (
            <MobileToolbarContent
              editor={editor}
              type={activeMobileView === "highlighter" ? "highlighter" : "link"}
              onBack={() => setMobileView("main")}
            />
          ) : null}
        </Toolbar>

        {isCodeView ? (
          <div className="simple-editor-code-pane">
            <textarea
              value={codeValue}
              onChange={(event) => syncCodeValue(event.target.value)}
              wrap="soft"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              aria-label="Source code editor"
              className="simple-editor-code-input"
            />
          </div>
        ) : (
          <EditorContent
            editor={editor}
            role="presentation"
            className="simple-editor-content"
          />
        )}
      </EditorContext.Provider>
    </div>
  )
}

function getEditorSignature(content: string, html: string) {
  return `${content}\n${html}`
}

function ModeToggle({
  isCodeView,
  onToggleCodeView,
}: {
  isCodeView: boolean
  onToggleCodeView: () => void
}) {
  return (
    <div className="simple-editor-mode-switch" aria-label="编辑模式切换">
      <Button
        type="button"
        variant={!isCodeView ? "primary" : "ghost"}
        onClick={() => {
          if (isCodeView) {
            onToggleCodeView()
          }
        }}
        size="small"
        className="simple-editor-mode-switch__button"
      >
        <FileCode2 className="tiptap-button-icon" />
        富文本
      </Button>
      <Button
        type="button"
        variant={isCodeView ? "primary" : "ghost"}
        onClick={() => {
          if (!isCodeView) {
            onToggleCodeView()
          }
        }}
        size="small"
        className="simple-editor-mode-switch__button"
      >
        <Code2 className="tiptap-button-icon" />
        源码
      </Button>
    </div>
  )
}
