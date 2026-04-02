import Link from "next/link";
import { SearchDialog } from "@/components/search-dialog";
import { formatUpdateTerm, getPublishedUpdates } from "@/lib/updates";

export default function UpdatesPage() {
  const updates = getPublishedUpdates();
  const groups = groupUpdatesByYear(updates);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-16 sm:px-10">
      <p className="text-sm uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">Updates</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        动态
      </h1>

      <div className="mt-8 flex flex-wrap items-center justify-end gap-4">
        <SearchDialog
          buttonLabel="Search"
          placeholder="Search updates"
          emptyState="No matching updates found."
          idleState="Search by title, category, tag, or a line from the update."
          items={updates.map((item) => ({
            id: item.id,
            href: item.href,
            title: item.title,
            publishedAt: item.publishedAt,
            overline: formatUpdateTerm(item.category),
            preview: item.summary,
            searchText: [
              item.title,
              item.summary,
              formatUpdateTerm(item.category),
              ...item.tags.map((tag) => formatUpdateTerm(tag)),
              ...item.content,
            ].join(" "),
          }))}
        />
      </div>

      <div className="mt-10 space-y-10">
        {groups.map((group) => (
          <section key={group.year} className="space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                {group.year}
              </h2>
              <div className="h-px flex-1 bg-zinc-200/80 dark:bg-zinc-800/80" />
            </div>

            <div className="grid gap-6">
              {group.items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="group grid gap-4 border-b border-zinc-200/80 py-6 transition last:border-b-0 hover:bg-zinc-50/50 dark:border-zinc-800/80 dark:hover:bg-zinc-900/30 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-6"
                >
                  <div className="min-w-[4.5rem]">
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                      {formatFeedMonth(item.publishedAt)}
                    </p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                      {formatFeedDay(item.publishedAt)}
                    </p>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary dark:bg-sky-300/12 dark:text-sky-300">
                        {formatUpdateTerm(item.category)}
                      </span>
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs font-medium text-zinc-400 dark:text-zinc-500"
                        >
                          #{formatUpdateTerm(tag)}
                        </span>
                      ))}
                    </div>

                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 transition group-hover:text-primary dark:text-zinc-50 dark:group-hover:text-sky-300">
                      {item.title}
                    </h2>

                    <p className="mt-3 max-w-3xl text-base leading-8 text-zinc-600 dark:text-zinc-300">
                      {item.summary}
                    </p>

                    <div className="mt-4 grid gap-2">
                      {item.content.slice(0, 1).map((paragraph) => (
                        <p key={paragraph} className="max-w-3xl text-sm leading-7 text-zinc-500 dark:text-zinc-400">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function groupUpdatesByYear(updates: ReturnType<typeof getPublishedUpdates>) {
  const groups = new Map<string, typeof updates>();

  for (const update of updates) {
    const year = update.publishedAt ? String(new Date(update.publishedAt).getFullYear()) : "Unknown";
    const current = groups.get(year) ?? [];
    current.push(update);
    groups.set(year, current);
  }

  return Array.from(groups.entries()).map(([year, items]) => ({
    year,
    items,
  }));
}

function formatFeedMonth(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
  }).format(date);
}

function formatFeedDay(value: string | null) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
  }).format(date);
}
