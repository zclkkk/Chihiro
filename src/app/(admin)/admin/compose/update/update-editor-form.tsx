"use client";

import { ContentStatus } from "@prisma/client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  discardUpdateRevisionAction,
  saveUpdateAction,
  type SaveUpdateEditorState,
} from "@/app/(admin)/admin/compose/update/actions";
import { ContentEditorShell } from "@/app/(admin)/admin/compose/content-editor-shell";
import { ContentPreviewDialog } from "@/app/(admin)/admin/compose/content-preview-dialog";
import { ConfirmActionDialog } from "@/app/(admin)/admin/confirm-action-dialog";
import { PublishedAtField } from "@/app/(admin)/admin/compose/post/published-at-field";
import { PostRichTextEditor } from "@/app/(admin)/admin/compose/post/post-rich-text-editor";
import { formatAdminDateTime } from "@/app/(admin)/admin/utils";
import { getRenderedContentHtml } from "@/lib/content";
import { createSlateContentValue, slateContentToText } from "@/lib/slate-content";
import type { UpdateItem } from "@/server/repositories/updates";

const initialState: SaveUpdateEditorState = {
  error: null,
  redirectTo: null,
};

type UpdateEditorFormProps = {
  update: UpdateItem | null;
  authorName: string;
};

type UpdatePreviewState = {
  title: string;
  subtitle: string | null;
  meta: string;
  body: string;
};

export function UpdateEditorForm({ update, authorName }: UpdateEditorFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveUpdateAction, initialState);
  const editableUpdate = getEditableUpdate(update);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [previewState, setPreviewState] = useState<UpdatePreviewState | null>(null);
  const draftSavedAt = getDraftSavedAt(update);
  const hasSavedRevision = Boolean(update?.status === ContentStatus.PUBLISHED && draftSavedAt);
  const bottomPrompt = getBottomPrompt(update, draftSavedAt);
  const status = update?.status ?? ContentStatus.DRAFT;

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo);
    }
  }, [router, state.redirectTo]);

  return (
    <>
      <ContentEditorShell
        formRef={formRef}
        formAction={formAction}
        hiddenFields={
          <>
            <input type="hidden" name="updateId" value={update?.id ?? ""} />
            <input type="hidden" name="currentStatus" value={status} />
          </>
        }
        stateError={state.error}
        main={
          <div className="grid gap-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              动态只需要填写内容，标题会自动从内容生成。
            </p>

            <PostRichTextEditor initialValue={createSlateContentValue(editableUpdate?.content)} />
          </div>
        }
        sidebar={
          <>
            <label className="grid gap-2 border-t border-zinc-200/80 pt-5 dark:border-zinc-800/80">
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                发布日期
              </span>
              <PublishedAtField defaultValue={editableUpdate?.publishedAt} />
            </label>
          </>
        }
        footerLeft={
          <>
            <p className="min-w-0 text-xs text-zinc-500 dark:text-zinc-400">{bottomPrompt}</p>
            {hasSavedRevision ? <DiscardRevisionButton updateId={update?.id ?? 0} /> : null}
          </>
        }
        footerRight={
          <>
          <PreviewButton
            onClick={() => setPreviewState(buildUpdatePreviewState(formRef.current, authorName))}
          />
            <SaveButton />
            <PublishButton isPublished={status === ContentStatus.PUBLISHED} />
          </>
        }
      />
      <ContentPreviewDialog
        open={Boolean(previewState)}
        title={previewState?.title ?? "预览"}
        subtitle={previewState?.subtitle}
        meta={previewState?.meta ? <span>{previewState.meta}</span> : null}
        body={
          <div
            className="reading-copy space-y-4 text-base leading-8 text-zinc-700 dark:text-zinc-300"
            dangerouslySetInnerHTML={{ __html: previewState?.body ?? "" }}
          />
        }
        onOpenChange={(open) => {
          if (!open) {
            setPreviewState(null);
          }
        }}
      />
    </>
  );
}

function getBottomPrompt(update: UpdateItem | null, draftSavedAt: string | null) {
  if (!update) {
    return "当前是新撰写。可以先保存为草稿，也可以直接发布。";
  }

  if (draftSavedAt) {
    return `当前正在编辑 ${formatAdminDateTime(draftSavedAt)} 保存的草稿，公开页仍在使用上一个已发布版本。`;
  }

  if (update.status === ContentStatus.PUBLISHED) {
    return "当前是已发布动态。保存会保留草稿，只有点击更新并发布才会更新公开页。";
  }

  return "当前是已保存的草稿。可以继续编辑，也可以直接发布。";
}

function getEditableUpdate(update: UpdateItem | null) {
  if (!update?.draftSnapshot) {
    return update;
  }

  return {
    ...update,
    title: update.draftSnapshot.title,
    content: update.draftSnapshot.content,
    contentHtml: update.draftSnapshot.contentHtml,
    publishedAt: update.draftSnapshot.publishedAt,
  };
}

function getDraftSavedAt(update: UpdateItem | null) {
  if (!update?.draftSnapshot) {
    return null;
  }

  return update.draftSnapshot.savedAt ?? null;
}

function buildUpdatePreviewState(form: HTMLFormElement | null, authorName: string): UpdatePreviewState | null {
  if (!form) {
    return null;
  }

  const formData = new FormData(form);
  const content = parseSlateContent(formData);
  const publishedAt = getFormValue(formData, "publishedAt");
  const title = getPreviewTitle(content);
  const body = getRenderedContentHtml(null, content) ?? "<p>暂无内容。</p>";
  const formattedPublishedAt = publishedAt ? formatAdminDateTime(publishedAt) : null;

  return {
    title,
    subtitle: "足迹预览",
    meta: [authorName, formattedPublishedAt ? `发布时间：${formattedPublishedAt}` : "未设置发布时间"].join(
      " · ",
    ),
    body: `
      <div class="reading-copy space-y-6 text-base leading-8 text-zinc-800 dark:text-zinc-200">
        ${body}
      </div>
    `,
  };
}

function getPreviewTitle(content: unknown) {
  const firstLine = slateContentToText(createSlateContentValue(content))
    .split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine ? firstLine.slice(0, 32) : "未命名动态";
}

function parseSlateContent(formData: FormData) {
  const raw = getFormValue(formData, "content");

  if (!raw) {
    return createSlateContentValue(null);
  }

  try {
    return createSlateContentValue(JSON.parse(raw));
  } catch {
    return createSlateContentValue(raw);
  }
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="intent"
      value="save"
      disabled={pending}
      className="inline-flex h-10 w-full items-center justify-center px-1 text-sm font-medium text-primary transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {pending ? "保存中..." : "保存动态"}
    </button>
  );
}

function PublishButton({ isPublished }: { isPublished: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="intent"
      value="publish"
      disabled={pending}
      className="inline-flex h-10 w-full items-center justify-center px-1 text-[0.98rem] font-semibold text-primary underline decoration-1 underline-offset-4 transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60 dark:text-sky-300 sm:w-auto"
    >
      {pending ? "发布中..." : isPublished ? "更新并发布" : "发布动态"}
    </button>
  );
}

function DiscardRevisionButton({ updateId }: { updateId: number }) {
  return (
    <ConfirmActionDialog
      triggerLabel="删除修订"
      triggerClassName="inline-flex h-8 w-full items-center justify-center rounded-full border border-transparent px-2.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-300 dark:hover:bg-rose-500/10 sm:w-auto"
      title="删除这条草稿？"
      description="删除后会恢复到上一个已发布版本，当前草稿内容会被丢弃。"
      confirmLabel="删除修订"
      action={discardUpdateRevisionAction}
      fields={[{ name: "updateId", value: updateId }]}
      confirmTone="danger"
    />
  );
}

function PreviewButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 w-full items-center justify-center px-1 text-sm font-medium text-zinc-500 transition hover:text-primary dark:text-zinc-400 dark:hover:text-sky-300 sm:w-auto"
    >
      预览
    </button>
  );
}
