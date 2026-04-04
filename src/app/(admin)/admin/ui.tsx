import { ContentStatus } from "@prisma/client";
import type { ReactNode } from "react";
import { formatAdminDate } from "@/app/(admin)/admin/utils";
import type { PostItem } from "@/server/repositories/posts";
import type { UpdateItem } from "@/server/repositories/updates";

export function AdminPageHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="border-b border-zinc-200/80 pb-8 dark:border-zinc-800/80">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
        {eyebrow}
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {title}
      </h1>
    </header>
  );
}

export function AdminSectionCard({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-zinc-200/80 bg-white/72 p-6 dark:border-zinc-800/80 dark:bg-zinc-950/50">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "success" | "muted" | "neutral";
}) {
  const toneClassName =
    tone === "success"
      ? "border-emerald-200/70 bg-emerald-50/55 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/20 dark:text-emerald-300"
      : tone === "muted"
        ? "border-amber-200/70 bg-amber-50/55 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-amber-300"
        : tone === "neutral"
          ? "border-sky-200/70 bg-sky-50/55 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/20 dark:text-sky-300"
          : "border-zinc-200/80 bg-zinc-50/55 text-zinc-700 dark:border-zinc-800/80 dark:bg-zinc-900/55 dark:text-zinc-200";

  return (
    <div className={`border p-4 ${toneClassName}`}>
      <p className="text-xs font-medium uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export function StatusBadge({ status }: { status: ContentStatus }) {
  const className =
    status === ContentStatus.PUBLISHED
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-300"
      : status === ContentStatus.DRAFT
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/25 dark:text-amber-300"
        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-400";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[0.66rem] font-medium uppercase tracking-[0.12em] ${className}`}
    >
      {status}
    </span>
  );
}

export function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-zinc-200/80 px-5 py-8 text-sm text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
      {text}
    </div>
  );
}

export function AdminActionButton({
  children,
  tone = "primary",
}: {
  children: ReactNode;
  tone?: "primary" | "secondary";
}) {
  const className =
    tone === "secondary"
      ? "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
      : "border-transparent bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white";

  return (
    <button
      type="submit"
      className={`inline-flex items-center justify-center border px-3 py-2 text-xs font-medium transition ${className}`}
    >
      {children}
    </button>
  );
}

export function ContentListPanel<T extends PostItem | UpdateItem>({
  title,
  eyebrow,
  items,
  emptyText,
  renderMeta,
  renderActions,
  showHeader = true,
}: {
  title: string;
  eyebrow: string;
  items: T[];
  emptyText: string;
  renderMeta: (item: T) => ReactNode;
  renderActions: (item: T) => ReactNode;
  showHeader?: boolean;
}) {
  return (
    <section className="border-b border-zinc-200/80 pb-5 dark:border-zinc-800/80">
      {showHeader ? (
        <div>
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {title}
          </h2>
        </div>
      ) : null}

      <div className={showHeader ? "mt-6" : ""}>
        {items.length > 0 ? (
          <div className="grid gap-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="border-b border-zinc-200/80 pb-5 last:border-b-0 dark:border-zinc-800/80"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                      {item.title}
                    </h3>
                    {"draftSnapshot" in item &&
                      item.status === ContentStatus.PUBLISHED &&
                      item.draftSnapshot ? (
                        <span className="inline-flex items-center border border-amber-200/80 bg-amber-50/80 px-2 py-0.5 text-[0.68rem] font-medium text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-amber-300">
                          有修订
                        </span>
                      ) : null}
                  </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs leading-6 text-zinc-500 dark:text-zinc-400">
                      <StatusBadge status={item.status} />
                      {renderMeta(item)}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-col items-end gap-2">{renderActions(item)}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyPanel text={emptyText} />
        )}
      </div>
    </section>
  );
}

export function DraftListPanel({
  title,
  eyebrow,
  items,
  kind,
}: {
  title: string;
  eyebrow: string;
  items: Array<PostItem | UpdateItem>;
  kind: "Post" | "Update";
}) {
  return (
    <AdminSectionCard title={title} eyebrow={eyebrow}>
      {items.length > 0 ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="border-b border-zinc-200/80 pb-4 last:border-b-0 dark:border-zinc-800/80"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                    {kind}
                  </p>
                  <p className="mt-2 font-medium text-zinc-950 dark:text-zinc-50">{item.title}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                {item.slug} · Updated {formatAdminDate(item.updatedAt)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPanel text={`No ${kind.toLowerCase()} drafts`} />
      )}
    </AdminSectionCard>
  );
}
