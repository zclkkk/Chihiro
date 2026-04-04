"use client";

import { ContentStatus } from "@prisma/client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import {
  discardUpdateRevisionAction,
  saveUpdateAction,
  type SaveUpdateEditorState,
} from "@/app/(admin)/admin/compose/update/actions";
import { ConfirmActionDialog } from "@/app/(admin)/admin/confirm-action-dialog";
import { EmptyPanel } from "@/app/(admin)/admin/ui";
import { PublishedAtField } from "@/app/(admin)/admin/compose/post/published-at-field";
import { formatAdminDateTime } from "@/app/(admin)/admin/utils";
import type { CategoryOption } from "@/server/repositories/categories";
import type { TagOption } from "@/server/repositories/tags";
import type { UpdateItem } from "@/server/repositories/updates";

const initialState: SaveUpdateEditorState = {
  error: null,
  redirectTo: null,
};

type UpdateEditorFormProps = {
  update: UpdateItem | null;
  categories: CategoryOption[];
  tags: TagOption[];
  siteUrlBase: string;
};

export function UpdateEditorForm({ update, categories, tags, siteUrlBase }: UpdateEditorFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveUpdateAction, initialState);
  const editableUpdate = getEditableUpdate(update);
  const [selectedTagIds, setSelectedTagIds] = useState(
    () => new Set(editableUpdate?.tags.map((tag) => tag.id) ?? []),
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    editableUpdate?.category?.id ? String(editableUpdate.category.id) : "",
  );
  const draftSavedAt = getDraftSavedAt(update);
  const hasSavedRevision = Boolean(update?.status === ContentStatus.PUBLISHED && draftSavedAt);
  const bottomPrompt = getBottomPrompt(update, draftSavedAt);
  const selectedCategorySlug =
    categories.find((category) => String(category.id) === selectedCategoryId)?.slug ??
    "uncategorized";
  const updateUrlPrefix = `${siteUrlBase}/updates/${selectedCategorySlug}/`;
  const contentValue = typeof editableUpdate?.content === "string" ? editableUpdate.content : "";
  const status = update?.status ?? ContentStatus.DRAFT;

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo);
    }
  }, [router, state.redirectTo]);

  return (
    <form action={formAction} className="grid gap-6">
      <input type="hidden" name="updateId" value={update?.id ?? ""} />
      <input type="hidden" name="currentStatus" value={status} />

      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-14">
        <div className="grid gap-8">
          <div className="grid gap-2">
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={editableUpdate?.title ?? ""}
              placeholder="输入动态标题"
              className="h-14 border-b border-zinc-200/80 bg-transparent px-0 text-3xl font-semibold tracking-tight text-zinc-950 outline-none transition placeholder:text-zinc-300 focus:border-primary/50 dark:border-zinc-800/80 dark:text-zinc-50 dark:placeholder:text-zinc-600"
            />
          </div>

          <label className="grid gap-2">
            <div className="flex items-center border-b border-zinc-200/80 text-sm text-zinc-600 transition focus-within:border-primary/50 dark:border-zinc-800/80 dark:text-zinc-300">
              <span className="shrink-0 whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                {updateUrlPrefix}
              </span>
              <input
                name="slug"
                type="text"
                defaultValue={editableUpdate?.slug ?? ""}
                placeholder="留空则根据id生成"
                className="h-11 min-w-0 flex-1 bg-transparent px-0 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
              />
            </div>
          </label>

          <label className="grid gap-2">
            <textarea
              name="summary"
              rows={3}
              defaultValue={editableUpdate?.summary ?? ""}
              placeholder="为动态写一段简短介绍"
              className="min-h-28 border-b border-zinc-200/80 bg-transparent px-0 py-2 text-base leading-8 text-zinc-600 outline-none transition placeholder:text-zinc-400 focus:border-primary/50 dark:border-zinc-800/80 dark:text-zinc-300 dark:placeholder:text-zinc-600"
            />
          </label>

          <label className="grid gap-2">
            <textarea
              name="content"
              rows={16}
              defaultValue={contentValue}
              placeholder="先用纯文本写动态内容。保存时会按段落自动生成基础 HTML。"
              className="min-h-[22rem] border-none bg-transparent px-0 py-1 text-lg leading-9 text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:outline-none dark:text-zinc-200 dark:placeholder:text-zinc-600"
            />
          </label>
        </div>

        <aside className="grid gap-8 lg:sticky lg:top-28">
          <label className="grid gap-2 border-t border-zinc-200/80 pt-5 dark:border-zinc-800/80">
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
              发布日期
            </span>
            <PublishedAtField defaultValue={editableUpdate?.publishedAt} />
          </label>

          <label className="grid gap-3 border-t border-zinc-200/80 pt-5 dark:border-zinc-800/80">
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
              分类
            </span>
            <select
              name="categoryId"
              defaultValue={editableUpdate?.category?.id ? String(editableUpdate.category.id) : ""}
              onChange={(event) => setSelectedCategoryId(event.target.value)}
              className="h-11 border-b border-zinc-200/80 bg-transparent px-0 text-sm text-zinc-700 outline-none transition focus:border-primary/50 dark:border-zinc-800/80 dark:text-zinc-200"
            >
              <option value="">未分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="grid gap-4 border-t border-zinc-200/80 pt-5 dark:border-zinc-800/80">
            <legend className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
              标签
            </legend>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
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
                      defaultChecked={selectedTagIds.has(tag.id)}
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
        </aside>
      </section>

      {state.error ? (
        <p className="border-l-2 border-rose-300 pl-4 text-sm text-rose-700 dark:border-rose-400/40 dark:text-rose-200">
          {state.error}
        </p>
      ) : null}

      <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:border-zinc-800/70 dark:bg-zinc-950/75 supports-[backdrop-filter]:dark:bg-zinc-950/65">
        <div className="flex min-w-0 items-center gap-3">
          <p className="min-w-0 text-xs text-zinc-500 dark:text-zinc-400">{bottomPrompt}</p>
          {hasSavedRevision ? <DiscardRevisionButton updateId={update?.id ?? 0} /> : null}
        </div>
        <div className="flex items-center gap-2">
          <SaveButton />
          <PublishButton isPublished={status === ContentStatus.PUBLISHED} />
        </div>
      </div>
    </form>
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
    slug: update.draftSnapshot.slug,
    summary: update.draftSnapshot.summary,
    content: update.draftSnapshot.content,
    contentHtml: update.draftSnapshot.contentHtml,
    publishedAt: update.draftSnapshot.publishedAt,
    category: update.draftSnapshot.category,
    coverAsset: update.draftSnapshot.coverAsset,
    tags: update.draftSnapshot.tags,
  };
}

function getDraftSavedAt(update: UpdateItem | null) {
  if (!update?.draftSnapshot) {
    return null;
  }

  return update.draftSnapshot.savedAt ?? null;
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="intent"
      value="save"
      disabled={pending}
      className="inline-flex items-center justify-center border border-transparent bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
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
      className="inline-flex items-center justify-center border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
    >
      {pending ? "发布中..." : isPublished ? "更新并发布" : "发布动态"}
    </button>
  );
}

function DiscardRevisionButton({ updateId }: { updateId: number }) {
  return (
    <ConfirmActionDialog
      triggerLabel="删除修订"
      triggerClassName="inline-flex items-center border-b border-transparent px-0 py-1 text-xs font-medium text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
      title="删除这条草稿？"
      description="删除后会恢复到上一个已发布版本，当前草稿内容会被丢弃。"
      confirmLabel="删除修订"
      action={discardUpdateRevisionAction}
      fields={[{ name: "updateId", value: updateId }]}
      confirmTone="danger"
    />
  );
}
