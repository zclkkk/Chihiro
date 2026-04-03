"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "@/app/(admin)/admin/utils";

export function AdminSidebar({
  totalCount,
  publishedCount,
  draftCount,
}: {
  totalCount: number;
  publishedCount: number;
  draftCount: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="lg:sticky lg:top-8 lg:self-start">
      <div className="border-r border-zinc-200/80 pr-8 dark:border-zinc-800/80">
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
          Chihiro Admin
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          后台
        </h1>

        <nav className="mt-6 grid gap-1">
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`border-l px-4 py-2 transition ${
                  isActive
                    ? "border-zinc-900 text-zinc-950 dark:border-zinc-100 dark:text-zinc-50"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
                }`}
              >
                <p className="text-sm font-medium">{item.label}</p>
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 border-t border-zinc-200/80 pt-5 dark:border-zinc-800/80">
          <div className="grid gap-3 text-sm text-zinc-600 dark:text-zinc-300">
            <div className="flex items-center justify-between gap-3">
              <span>总内容</span>
              <span className="font-medium">{totalCount}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>已发布</span>
              <span className="font-medium">{publishedCount}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>草稿</span>
              <span className="font-medium">{draftCount}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
