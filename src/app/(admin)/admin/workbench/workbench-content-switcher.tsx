"use client";

import Link from "next/link";
import { usePathname, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { type ReactNode } from "react";

type WorkbenchContentSwitcherProps = {
  postsPanel: ReactNode;
  updatesPanel: ReactNode;
  categoriesPanel: ReactNode;
  tagsPanel: ReactNode;
  activeSort: "created" | "updated";
};

export function WorkbenchContentSwitcher({
  postsPanel,
  updatesPanel,
  categoriesPanel,
  tagsPanel,
  activeSort,
}: WorkbenchContentSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = getWorkbenchTabValue(searchParams.get("tab"));

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 pb-2 dark:border-zinc-800/80">
        <div className="flex w-fit items-center gap-6">
          <TabButton
            active={activeTab === "posts"}
            href={getWorkbenchHref(pathname, searchParams, "posts", activeSort)}
            label="文章"
          />
          <TabButton
            active={activeTab === "updates"}
            href={getWorkbenchHref(pathname, searchParams, "updates", activeSort)}
            label="动态"
          />
          <TabButton
            active={activeTab === "categories"}
            href={getWorkbenchHref(pathname, searchParams, "categories", activeSort)}
            label="分类"
          />
          <TabButton
            active={activeTab === "tags"}
            href={getWorkbenchHref(pathname, searchParams, "tags", activeSort)}
            label="标签"
          />
        </div>
        {activeTab === "posts" || activeTab === "updates" ? (
          <div className="flex items-center gap-4 text-sm">
            <SortLink
              active={activeSort === "updated"}
              href={getWorkbenchHref(pathname, searchParams, activeTab, "updated")}
            >
              更改时间
            </SortLink>
            <SortLink
              active={activeSort === "created"}
              href={getWorkbenchHref(pathname, searchParams, activeTab, "created")}
            >
              创建时间
            </SortLink>
          </div>
        ) : null}
      </div>

      <div>
        {activeTab === "posts"
          ? postsPanel
          : activeTab === "updates"
            ? updatesPanel
            : activeTab === "categories"
              ? categoriesPanel
              : tagsPanel}
      </div>
    </section>
  );
}

function SortLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`border-b pb-1 transition ${
        active
          ? "border-zinc-950 text-zinc-950 dark:border-zinc-100 dark:text-zinc-50"
          : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
      }`}
    >
      {children}
    </Link>
  );
}

function TabButton({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`relative inline-flex items-center justify-center px-1 py-1 text-sm font-medium transition ${
        active
          ? "text-zinc-950 dark:text-zinc-50 after:absolute after:inset-x-0 after:-bottom-2 after:h-0.5 after:rounded-full after:bg-zinc-950 dark:after:bg-zinc-100"
          : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      }`}
    >
      {label}
    </Link>
  );
}

function getWorkbenchTabValue(value: string | null): "posts" | "updates" | "categories" | "tags" {
  if (value === "updates") {
    return "updates";
  }

  if (value === "categories") {
    return "categories";
  }

  if (value === "tags") {
    return "tags";
  }

  return "posts";
}

function getWorkbenchHref(
  pathname: string,
  searchParams: ReadonlyURLSearchParams,
  tab: "posts" | "updates" | "categories" | "tags",
  sort?: "created" | "updated",
) {
  const params = new URLSearchParams(searchParams.toString());
  params.set("tab", tab);

  if (sort) {
    params.set("sort", sort);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
