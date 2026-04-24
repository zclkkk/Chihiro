"use client";

import Link from "next/link";
import type { CategoryOption } from "@/types/domain";
import { CategoryActionMenu } from "@/app/(admin)/admin/workbench/category-action-menu";

type WorkbenchCategoryPanelProps = {
  postCategories: CategoryOption[];
};

export function WorkbenchCategoryPanel({ postCategories }: WorkbenchCategoryPanelProps) {
  const items = [...postCategories].sort((left, right) => left.name.localeCompare(right.name));

  return (
    <section className="border-b border-zinc-200/80 pb-5 dark:border-zinc-800/80">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200/80 pb-2 dark:border-zinc-800/80">
        <Link
          href="/admin/categories/new"
          className="inline-flex items-center gap-1.5 border-b border-transparent px-0 py-1 text-sm font-medium text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
        >
          添加分类
        </Link>
      </div>

      <div className="mt-6">
        {items.length > 0 ? (
          <div className="grid gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 border-b border-zinc-200/80 pb-3 last:border-b-0 dark:border-zinc-800/80"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/categories/${item.id}`}
                      className="text-sm font-medium text-zinc-950 transition hover:text-primary dark:text-zinc-50"
                    >
                      {item.name}
                    </Link>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/80 px-2.5 py-0.5 text-[0.66rem] font-medium text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
                      <span className="text-zinc-900 dark:text-zinc-50">{item.contentCount}</span>
                      <span>文章数</span>
                    </span>
                  </div>
                  <p className="mt-1 text-[0.72rem] text-zinc-500 dark:text-zinc-400">{item.slug}</p>
                  {item.description ? (
                    <p className="mt-1.5 max-h-10 overflow-hidden text-[0.72rem] leading-6 text-zinc-500 dark:text-zinc-400">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <Link
                    href={`/admin/categories/${item.id}`}
                    className="inline-flex items-center gap-1.5 border-b border-transparent px-0 py-1 text-xs font-medium text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
                  >
                    编辑分类
                  </Link>
                  <CategoryActionMenu categoryId={item.id} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-zinc-200/80 px-5 py-8 text-sm text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
            还没有分类。
          </div>
        )}
      </div>
    </section>
  );
}
