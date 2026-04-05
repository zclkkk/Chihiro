"use client";

import { ContentStatus } from "@prisma/client";
import { Check } from "lucide-react";
import { createPortal } from "react-dom";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  discardPostRevisionAction,
  savePostDraftAction,
  type SavePostEditorState,
} from "@/app/(admin)/admin/compose/post/actions";
import { ContentEditorShell } from "@/app/(admin)/admin/compose/content-editor-shell";
import { ContentPreviewDialog } from "@/app/(admin)/admin/compose/content-preview-dialog";
import { ConfirmActionDialog } from "@/app/(admin)/admin/confirm-action-dialog";
import { PublishedAtField } from "@/app/(admin)/admin/compose/post/published-at-field";
import { PostRichTextEditor } from "@/app/(admin)/admin/compose/post/post-rich-text-editor";
import { formatAdminDateTime } from "@/app/(admin)/admin/utils";
import { escapeHtmlText, stripHtml } from "@/lib/content";
import { createCategoryAction } from "@/app/(admin)/admin/categories/actions";
import { createTagAction } from "@/app/(admin)/admin/tags/actions";
import { createSlateContentValue } from "@/lib/slate-content";
import type { CategoryOption } from "@/server/repositories/categories";
import type { TagOption } from "@/server/repositories/tags";
import type { PostItem } from "@/server/repositories/posts";

const initialState: SavePostEditorState = {
  error: null,
};

type PostEditorFormProps = {
  post: PostItem | null;
  categories: CategoryOption[];
  tags: TagOption[];
  siteUrlBase: string;
  authorName: string;
};

type PostPreviewState = {
  title: string;
  subtitle: string | null;
  meta: string;
  body: string;
};

export function PostEditorForm({ post, categories, tags, siteUrlBase, authorName }: PostEditorFormProps) {
  const [state, formAction] = useActionState(savePostDraftAction, initialState);
  const editablePost = getEditablePost(post);
  const [categoryItems, setCategoryItems] = useState(() => sortCategories(categories));
  const [tagItems, setTagItems] = useState(() => sortTags(tags));
  const [selectedTagIds, setSelectedTagIds] = useState(
    () => new Set(editablePost?.tags.map((tag) => tag.id) ?? []),
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    editablePost?.category?.id ? String(editablePost.category.id) : "",
  );
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [previewState, setPreviewState] = useState<PostPreviewState | null>(null);
  const handleCreatedCategoryRef = useRef<(category: CategoryOption) => void>(() => {});
  const handleCreatedTagRef = useRef<(tag: TagOption) => void>(() => {});
  const formRef = useRef<HTMLFormElement | null>(null);
  const draftSavedAt = getDraftSavedAt(post);
  const hasSavedRevision = Boolean(post?.status === ContentStatus.PUBLISHED && draftSavedAt);
  const bottomPrompt = getBottomPrompt(post, draftSavedAt);
  const selectedCategorySlug =
    categoryItems.find((category) => String(category.id) === selectedCategoryId)?.slug ??
    "uncategorized";
  const postUrlPrefix = `${siteUrlBase}/posts/${selectedCategorySlug}/`;
  const initialContentValue = createSlateContentValue(editablePost?.content);

  return (
    <>
      <ContentEditorShell
        formRef={formRef}
        formAction={formAction}
        hiddenFields={
          <>
            <input type="hidden" name="postId" value={post?.id ?? ""} />
            <input type="hidden" name="currentStatus" value={post?.status ?? ContentStatus.DRAFT} />
          </>
        }
        stateError={state.error}
        main={
          <>
            <div className="grid gap-2">
              <input
                id="title"
                name="title"
                type="text"
                required
                defaultValue={editablePost?.title ?? ""}
                placeholder="输入文章标题"
                className="h-14 border-b border-zinc-200/80 bg-transparent px-0 text-3xl font-semibold tracking-tight text-zinc-950 outline-none transition placeholder:text-zinc-300 focus:border-primary/50 dark:border-zinc-800/80 dark:text-zinc-50 dark:placeholder:text-zinc-600"
              />
            </div>

            <label className="grid gap-2">
              <div className="flex items-center border-b border-zinc-200/80 text-sm text-zinc-600 transition focus-within:border-primary/50 dark:border-zinc-800/80 dark:text-zinc-300">
                <span className="shrink-0 whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                  {postUrlPrefix}
                </span>
                <input
                  name="slug"
                  type="text"
                  defaultValue={editablePost?.slug ?? ""}
                  placeholder="留空则根据id生成"
                  className="h-11 min-w-0 flex-1 bg-transparent px-0 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                />
              </div>
            </label>

            <label className="grid gap-2">
              <textarea
                name="summary"
                rows={3}
                defaultValue={editablePost?.summary ?? ""}
                placeholder="为文章写一段简短介绍"
                className="min-h-28 border-b border-zinc-200/80 bg-transparent px-0 py-2 text-base leading-8 text-zinc-600 outline-none transition placeholder:text-zinc-400 focus:border-primary/50 dark:border-zinc-800/80 dark:text-zinc-300 dark:placeholder:text-zinc-600"
              />
            </label>

            <PostRichTextEditor initialValue={initialContentValue} />
          </>
        }
        sidebar={
          <>
            <label className="grid gap-2 border-t border-zinc-200/80 pt-5 dark:border-zinc-800/80">
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                发布日期
              </span>
              <PublishedAtField defaultValue={editablePost?.publishedAt} />
            </label>

            <label className="grid gap-3 border-t border-zinc-200/80 pt-5 dark:border-zinc-800/80">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                  分类
                </span>
                <button
                  type="button"
                  onClick={() => setIsCategoryDialogOpen(true)}
                  className="text-xs font-medium text-zinc-500 transition hover:text-primary dark:text-zinc-400 dark:hover:text-sky-300"
                >
                  创建分类
                </button>
              </div>
            <select
              name="categoryId"
              value={selectedCategoryId}
              onChange={(event) => setSelectedCategoryId(event.target.value)}
              className="h-11 border-b border-zinc-200/80 bg-transparent px-0 text-sm text-zinc-700 outline-none transition focus:border-primary/50 dark:border-zinc-800/80 dark:text-zinc-200"
            >
                <option value="">未分类</option>
                {categoryItems.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="grid gap-4 border-t border-zinc-200/80 pt-5 dark:border-zinc-800/80">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                  标签
                </span>
                <button
                  type="button"
                  onClick={() => setIsTagDialogOpen(true)}
                  className="text-xs font-medium text-zinc-500 transition hover:text-primary dark:text-zinc-400 dark:hover:text-sky-300"
                >
                  创建标签
                </button>
              </div>
              {tagItems.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tagItems.map((tag) => (
                    <label
                      key={tag.id}
                      className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-medium transition ${
                        selectedTagIds.has(tag.id)
                          ? "bg-primary text-white dark:bg-sky-300 dark:text-zinc-950"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="tagIds"
                        value={tag.id}
                        checked={selectedTagIds.has(tag.id)}
                        onChange={(event) => {
                          setSelectedTagIds((current) => {
                            const next = new Set(current);

                            if (event.target.checked) {
                              next.add(tag.id);
                            } else {
                              next.delete(tag.id);
                            }

                            return next;
                          });
                        }}
                        className="sr-only"
                      />
                      <span>{tag.name}</span>
                      <span
                        aria-hidden="true"
                        className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-[0.2rem] border ${
                          selectedTagIds.has(tag.id)
                            ? "border-current/40 bg-white/15 dark:bg-zinc-950/15"
                            : "border-current/30"
                        }`}
                      >
                        {selectedTagIds.has(tag.id) ? <Check className="h-3 w-3" /> : null}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">还没有可用标签。</p>
              )}
            </fieldset>
          </>
        }
        footerLeft={
          <>
            <p className="min-w-0 text-xs text-zinc-500 dark:text-zinc-400">{bottomPrompt}</p>
            {hasSavedRevision ? <DiscardRevisionButton postId={post?.id ?? 0} /> : null}
          </>
        }
        footerRight={
          <>
            <PreviewButton
              onClick={() =>
                setPreviewState(buildPostPreviewState(formRef.current, categoryItems, tagItems, authorName))
              }
            />
            <SaveButton hasExistingPost={Boolean(post)} />
            <PublishButton hasExistingPost={Boolean(post)} />
          </>
        }
      />
      <InlineCreateCategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        onCreated={(category) => {
          setCategoryItems((current) =>
            sortCategories(
              dedupeById([...current.filter((item) => item.id !== category.id), category]),
            ),
          );
          setSelectedCategoryId(String(category.id));
        }}
        onCreatedRef={handleCreatedCategoryRef}
      />
      <InlineCreateTagDialog
        open={isTagDialogOpen}
        onOpenChange={setIsTagDialogOpen}
        onCreated={(tag) => {
          setTagItems((current) => sortTags(dedupeById([...current.filter((item) => item.id !== tag.id), tag])));
          setSelectedTagIds((current) => {
            const next = new Set(current);
            next.add(tag.id);
            return next;
          });
        }}
        onCreatedRef={handleCreatedTagRef}
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

function getBottomPrompt(post: PostItem | null, draftSavedAt: string | null) {
  if (!post) {
    return "当前是新撰写。可以先保存为草稿，也可以直接发布。";
  }

  if (draftSavedAt) {
    return `当前正在编辑 ${formatAdminDateTime(draftSavedAt)} 保存的草稿，公开页仍在使用上一个已发布版本。`;
  }

  if (post.status === ContentStatus.PUBLISHED) {
    return "当前是已发布文章。保存会保留草稿，只有点击更新并发布才会更新公开页。";
  }

  return "当前是已保存的草稿。可以继续编辑，也可以直接发布。";
}

function getEditablePost(post: PostItem | null) {
  if (!post?.draftSnapshot) {
    return post;
  }

  return {
    ...post,
    title: post.draftSnapshot.title,
    slug: post.draftSnapshot.slug,
    summary: post.draftSnapshot.summary,
    content: post.draftSnapshot.content,
    contentHtml: post.draftSnapshot.contentHtml,
    authorName: post.draftSnapshot.authorName,
    publishedAt: post.draftSnapshot.publishedAt,
    category: post.draftSnapshot.category,
    coverAsset: post.draftSnapshot.coverAsset,
    tags: post.draftSnapshot.tags,
  };
}

function getDraftSavedAt(post: PostItem | null) {
  if (!post?.draftSnapshot) {
    return null;
  }

  return post.draftSnapshot.savedAt ?? null;
}

function buildPostPreviewState(
  form: HTMLFormElement | null,
  categories: CategoryOption[],
  tags: TagOption[],
  authorName: string,
): PostPreviewState | null {
  if (!form) {
    return null;
  }

  const formData = new FormData(form);
  const title = getFormValue(formData, "title") || "未命名文章";
  const summary = getFormValue(formData, "summary");
  const contentHtml = getFormValue(formData, "contentHtml");
  const categoryId = getFormValue(formData, "categoryId");
  const selectedTagIds = new Set(
    formData
      .getAll("tagIds")
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const category = categories.find((item) => String(item.id) === categoryId);
  const selectedTags = tags.filter((tag) => selectedTagIds.has(tag.id));
  const publishedAt = getFormValue(formData, "publishedAt");
  const categoryLabel = category?.name ? escapeHtmlText(category.name) : "未分类";
  const tagLabels =
    selectedTags.length > 0
      ? selectedTags.map((tag) => `<span class="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">#${escapeHtmlText(tag.name)}</span>`).join("")
      : "";
  const previewContentHtml = contentHtml && stripHtml(contentHtml) ? contentHtml : "<p>暂无内容。</p>";
  const formattedPublishedAt = publishedAt ? formatAdminDateTime(publishedAt) : null;

  return {
    title,
    subtitle: summary || null,
    meta: [
      authorName,
      formattedPublishedAt ? `发布时间：${formattedPublishedAt}` : "未设置发布时间",
      category ? `分类：${category.name}` : "未分类",
    ].join(" · "),
    body: `
      <article class="mx-auto max-w-3xl">
        <div class="mt-5 flex flex-wrap gap-2">
          <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary dark:bg-sky-400/10 dark:text-sky-300">${categoryLabel}</span>
          ${tagLabels}
        </div>
        <div class="reading-copy mt-10 space-y-6 text-base leading-8 text-zinc-800 dark:text-zinc-200">
          ${previewContentHtml}
        </div>
      </article>
    `,
  };
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function PreviewButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center px-1 text-sm font-medium text-zinc-500 transition hover:text-primary dark:text-zinc-400 dark:hover:text-sky-300"
    >
      预览
    </button>
  );
}

function SaveButton({ hasExistingPost }: { hasExistingPost: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center px-1 text-sm font-medium text-primary transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "保存中..." : hasExistingPost ? "保存草稿" : "创建草稿"}
    </button>
  );
}

function PublishButton({ hasExistingPost }: { hasExistingPost: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="intent"
      value="publish"
      disabled={pending}
      className="inline-flex items-center justify-center border border-transparent bg-zinc-950 px-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
    >
      {pending ? "发布中..." : hasExistingPost ? "更新并发布" : "发布文章"}
    </button>
  );
}

function DiscardRevisionButton({ postId }: { postId: number }) {
  return (
    <ConfirmActionDialog
      triggerLabel="删除修订"
      triggerClassName="inline-flex h-8 items-center justify-center rounded-full border border-transparent px-2.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-300 dark:hover:bg-rose-500/10"
      title="删除这份修订？"
      description="删除后会恢复到上一次已发布的版本，当前保存的草稿内容会被丢弃。"
      confirmLabel="删除修订"
      action={discardPostRevisionAction}
      fields={[{ name: "postId", value: postId }]}
      confirmTone="danger"
    />
  );
}

function InlineCreateCategoryDialog({
  open,
  onOpenChange,
  onCreated,
  onCreatedRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (category: CategoryOption) => void;
  onCreatedRef: React.MutableRefObject<(category: CategoryOption) => void>;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction] = useActionState(createCategoryAction, {
    error: null,
    redirectTo: null,
    createdCategory: null,
  });

  useEffect(() => {
    onCreatedRef.current = onCreated;
  }, [onCreated, onCreatedRef]);

  useEffect(() => {
    if (!state.createdCategory) {
      return;
    }

    onCreatedRef.current(state.createdCategory);
    onOpenChange(false);
    formRef.current?.reset();
  }, [onCreatedRef, onOpenChange, state.createdCategory]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] bg-zinc-950/35 backdrop-blur-[2px] dark:bg-black/50"
      onClick={() => onOpenChange(false)}
    >
      <div className="flex min-h-full items-center justify-center px-4 py-16">
        <form
          ref={formRef}
          action={formAction}
          onClick={(event) => event.stopPropagation()}
          className="w-full max-w-lg rounded-[1.75rem] border border-zinc-200/80 bg-white p-6 shadow-[0_30px_120px_rgba(15,23,42,0.16)] dark:border-zinc-800/80 dark:bg-zinc-950"
        >
          <input type="hidden" name="inlineCreate" value="1" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
                分类
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                创建分类
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
              aria-label="关闭创建分类弹窗"
            >
              ×
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                名称
              </span>
              <input
                name="name"
                type="text"
                required
                placeholder="输入分类名称"
                className="h-12 rounded-2xl border border-zinc-200/80 bg-transparent px-4 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-primary/50 dark:border-zinc-800/80 dark:text-zinc-50 dark:placeholder:text-zinc-600"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                Slug
              </span>
              <input
                name="slug"
                type="text"
                required
                placeholder="例如: product-notes"
                className="h-12 rounded-2xl border border-zinc-200/80 bg-transparent px-4 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-primary/50 dark:border-zinc-800/80 dark:text-zinc-50 dark:placeholder:text-zinc-600"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                描述
              </span>
              <textarea
                name="description"
                rows={4}
                placeholder="为这个分类写一段简介"
                className="min-h-28 rounded-[1.25rem] border border-zinc-200/80 bg-transparent px-4 py-3 text-base leading-7 text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-primary/50 dark:border-zinc-800/80 dark:text-zinc-200 dark:placeholder:text-zinc-600"
              />
            </label>

            {state.error ? (
              <p className="text-sm text-rose-600 dark:text-rose-300">{state.error}</p>
            ) : null}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
            >
              取消
            </button>
            <InlineCreateSubmitButton label="创建分类" />
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function InlineCreateTagDialog({
  open,
  onOpenChange,
  onCreated,
  onCreatedRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (tag: TagOption) => void;
  onCreatedRef: React.MutableRefObject<(tag: TagOption) => void>;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction] = useActionState(createTagAction, {
    error: null,
    redirectTo: null,
    createdTag: null,
  });

  useEffect(() => {
    onCreatedRef.current = onCreated;
  }, [onCreated, onCreatedRef]);

  useEffect(() => {
    if (!state.createdTag) {
      return;
    }

    onCreatedRef.current(state.createdTag);
    onOpenChange(false);
    formRef.current?.reset();
  }, [onCreatedRef, onOpenChange, state.createdTag]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] bg-zinc-950/35 backdrop-blur-[2px] dark:bg-black/50"
      onClick={() => onOpenChange(false)}
    >
      <div className="flex min-h-full items-center justify-center px-4 py-16">
        <form
          ref={formRef}
          action={formAction}
          onClick={(event) => event.stopPropagation()}
          className="w-full max-w-lg rounded-[1.75rem] border border-zinc-200/80 bg-white p-6 shadow-[0_30px_120px_rgba(15,23,42,0.16)] dark:border-zinc-800/80 dark:bg-zinc-950"
        >
          <input type="hidden" name="inlineCreate" value="1" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
                标签
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                创建标签
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
              aria-label="关闭创建标签弹窗"
            >
              ×
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                名称
              </span>
              <input
                name="name"
                type="text"
                required
                placeholder="输入标签名称"
                className="h-12 rounded-2xl border border-zinc-200/80 bg-transparent px-4 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-primary/50 dark:border-zinc-800/80 dark:text-zinc-50 dark:placeholder:text-zinc-600"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                Slug
              </span>
              <input
                name="slug"
                type="text"
                required
                placeholder="例如: release-notes"
                className="h-12 rounded-2xl border border-zinc-200/80 bg-transparent px-4 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-primary/50 dark:border-zinc-800/80 dark:text-zinc-50 dark:placeholder:text-zinc-600"
              />
            </label>

            {state.error ? (
              <p className="text-sm text-rose-600 dark:text-rose-300">{state.error}</p>
            ) : null}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
            >
              取消
            </button>
            <InlineCreateSubmitButton label="创建标签" />
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function InlineCreateSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-2xl border border-transparent bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
    >
      {pending ? "创建中..." : label}
    </button>
  );
}

function sortCategories(categories: CategoryOption[]) {
  return [...categories].sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"));
}

function sortTags(tags: TagOption[]) {
  return [...tags].sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"));
}

function dedupeById<T extends { id: string | number }>(items: T[]) {
  const seen = new Set<string | number>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}
