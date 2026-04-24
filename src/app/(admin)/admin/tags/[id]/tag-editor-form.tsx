"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { ConfirmActionDialog } from "@/app/(admin)/admin/confirm-action-dialog";
import { EmptyPanel } from "@/app/(admin)/admin/ui";
import {
  createTagAction,
  deleteTagAction,
  updateTagAction,
  type TagFormState,
} from "@/app/(admin)/admin/tags/actions";
import type { TagItem } from "@/types/domain";

const initialState: TagFormState = {
  error: null,
  createdTag: null,
};

type TagEditorFormProps = {
  tag?: TagItem;
};

export function TagEditorForm({ tag }: TagEditorFormProps) {
  const router = useRouter();
  const isCreateMode = !tag;
  const [state, formAction] = useActionState(
    isCreateMode ? createTagAction : updateTagAction,
    initialState,
  );

  useEffect(() => {
    if (!state.error && !isCreateMode) {
      router.replace("/admin/workbench?tab=tags");
    }
  }, [router, state.error, isCreateMode]);

  return (
    <form action={formAction} className="grid gap-6">
      {tag ? <input type="hidden" name="id" value={tag.id} /> : null}

      <section className="grid gap-6">
        <label className="grid gap-2 border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
          <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
            名称
          </span>
          <input
            name="name"
            type="text"
            required
            defaultValue={tag?.name ?? ""}
            className="h-12 bg-transparent px-0 text-2xl font-semibold tracking-tight text-zinc-950 outline-none transition placeholder:text-zinc-300 focus:outline-none dark:text-zinc-50 dark:placeholder:text-zinc-600"
            placeholder="输入标签名称"
          />
        </label>

        <label className="grid gap-2 border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
          <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
            Slug
          </span>
          <input
            name="slug"
            type="text"
            required
            defaultValue={tag?.slug ?? ""}
            className="h-11 bg-transparent px-0 text-base text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:outline-none dark:text-zinc-200 dark:placeholder:text-zinc-600"
            placeholder="例如: release-notes"
          />
        </label>

        {tag ? (
          <div className="grid gap-3 rounded-2xl border border-zinc-200/80 bg-white/70 p-4 text-sm text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-300">
            <div className="flex items-center justify-between gap-4">
              <span>文章</span>
              <span className="font-medium text-zinc-950 dark:text-zinc-50">{tag.postCount}</span>
            </div>
          </div>
        ) : null}
      </section>

      {state.error ? <EmptyPanel text={state.error} /> : null}

      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:border-zinc-800/70 dark:bg-zinc-950/75 supports-[backdrop-filter]:dark:bg-zinc-950/65">
        <div className="min-w-0 text-xs text-zinc-500 dark:text-zinc-400">
          {isCreateMode ? "创建后会回到标签列表。" : "点击保存会更新标签名称和 slug。"}
        </div>
        <div className="flex items-center gap-2">
          {tag ? <DeleteTagButton tagId={tag.id} /> : null}
          <SaveButton isCreateMode={isCreateMode} />
        </div>
      </div>
    </form>
  );
}

function SaveButton({ isCreateMode }: { isCreateMode: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center border border-transparent bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
    >
      {pending ? "保存中..." : isCreateMode ? "创建标签" : "保存标签"}
    </button>
  );
}

function DeleteTagButton({ tagId }: { tagId: string }) {
  return (
    <ConfirmActionDialog
      triggerLabel="删除标签"
      triggerClassName="inline-flex h-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:border-rose-800 dark:hover:bg-rose-950/50"
      title="删除这个标签？"
      description="删除后无法撤销，已关联的文章会保留，但标签关联会被移除。"
      confirmLabel="删除标签"
      action={deleteTagAction}
      fields={[{ name: "id", value: tagId }]}
      confirmTone="danger"
    />
  );
}
