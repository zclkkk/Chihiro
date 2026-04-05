"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  createCategoryAction,
  saveCategoryAction,
  type SaveCategoryEditorState,
} from "@/app/(admin)/admin/categories/actions";
import { EmptyPanel } from "@/app/(admin)/admin/ui";
import type { CategoryOption } from "@/server/repositories/categories";

const initialState: SaveCategoryEditorState = {
  error: null,
  redirectTo: null,
  createdCategory: null,
};

type CategoryEditorFormProps = {
  category?: CategoryOption;
};

export function CategoryEditorForm({ category }: CategoryEditorFormProps) {
  const router = useRouter();
  const isCreateMode = !category;
  const [state, formAction] = useActionState(
    isCreateMode ? createCategoryAction : saveCategoryAction,
    initialState,
  );

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo);
    }
  }, [router, state.redirectTo]);

  return (
    <form action={formAction} className="grid gap-6">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}

      <section className="grid gap-6">
        <label className="grid gap-2 border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
          <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
            名称
          </span>
          <input
            name="name"
            type="text"
            required
            defaultValue={category?.name ?? ""}
            className="h-12 bg-transparent px-0 text-2xl font-semibold tracking-tight text-zinc-950 outline-none transition placeholder:text-zinc-300 focus:outline-none dark:text-zinc-50 dark:placeholder:text-zinc-600"
            placeholder="输入分类名称"
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
            defaultValue={category?.slug ?? ""}
            className="h-11 bg-transparent px-0 text-base text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:outline-none dark:text-zinc-200 dark:placeholder:text-zinc-600"
            placeholder="例如: product-notes"
          />
        </label>

        <label className="grid gap-2 border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
          <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
            描述
          </span>
          <textarea
            name="description"
            rows={5}
            defaultValue={category?.description ?? ""}
            className="min-h-32 bg-transparent px-0 py-1 text-base leading-8 text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:outline-none dark:text-zinc-200 dark:placeholder:text-zinc-600"
            placeholder="为这个分类写一段简介"
          />
        </label>
      </section>

      {state.error ? <EmptyPanel text={state.error} /> : null}

      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:border-zinc-800/70 dark:bg-zinc-950/75 supports-[backdrop-filter]:dark:bg-zinc-950/65">
        <div className="min-w-0 text-xs text-zinc-500 dark:text-zinc-400">
          {isCreateMode ? "当前将创建文章分类。" : "当前是文章分类。"}
        </div>
        <SaveButton />
      </div>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center border border-transparent bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
    >
      {pending ? "保存中..." : "保存分类"}
    </button>
  );
}
