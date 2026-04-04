import Link from "next/link";
import { formatContentTerm, getContentText } from "@/lib/content";
import { SearchDialog } from "@/components/search-dialog";
import { listAllPublishedUpdates } from "@/server/repositories/updates";

type UpdatesPageProps = {
  searchParams: Promise<{
    category?: string;
    tag?: string | string[];
    sort?: string;
    page?: string;
  }>;
};

type PublishedUpdate = Awaited<ReturnType<typeof listAllPublishedUpdates>>[number];

export default async function UpdatesPage({ searchParams }: UpdatesPageProps) {
  const { category, tag, sort, page } = await searchParams;
  const selectedTags = Array.from(
    new Set((Array.isArray(tag) ? tag : tag ? [tag] : []).filter(Boolean)),
  );
  const activeSort = getSortValue(sort);
  const currentPage = getPageValue(page);
  const allUpdates = await listAllPublishedUpdates();

  const filteredUpdates = allUpdates.filter((update) => {
    if (category === "uncategorized") {
      if (update.category) {
        return false;
      }
    } else if (category && update.category?.slug !== category) {
      return false;
    }

    if (
      selectedTags.length > 0 &&
      !selectedTags.every((item) => update.tags.some((tagItem) => tagItem.slug === item))
    ) {
      return false;
    }

    return true;
  });

  const sortedUpdates = sortUpdates(filteredUpdates, activeSort);
  const totalPages = Math.max(1, Math.ceil(sortedUpdates.length / UPDATES_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedUpdates = sortedUpdates.slice(
    (safeCurrentPage - 1) * UPDATES_PER_PAGE,
    safeCurrentPage * UPDATES_PER_PAGE,
  );
  const groups = groupUpdatesByYear(paginatedUpdates);

  const activeFilters = [
    ...(category ? [`Category: ${getCategoryFilterLabel(category, allUpdates)}`] : []),
    ...(selectedTags.length > 0
      ? [`Tags: ${selectedTags.map((item) => getTagFilterLabel(item, allUpdates)).join(", ")}`]
      : []),
    ...(activeSort !== "latest"
      ? [`Sort: ${activeSort === "earliest" ? "Earliest" : "Latest"}`]
      : []),
  ];
  const updatesCountLabel =
    sortedUpdates.length === allUpdates.length
      ? `${allUpdates.length} updates total`
      : `${sortedUpdates.length} of ${allUpdates.length} updates total`;

  const buildUpdatesHref = ({
    nextCategory = category,
    nextTags = selectedTags,
    nextSort = activeSort,
    nextPage = 1,
  }: {
    nextCategory?: string | null;
    nextTags?: string[];
    nextSort?: SortValue;
    nextPage?: number;
  } = {}) => {
    const params = new URLSearchParams();

    if (nextCategory) {
      params.set("category", nextCategory);
    }

    nextTags.forEach((item) => {
      params.append("tag", item);
    });

    if (nextSort !== "latest") {
      params.set("sort", nextSort);
    }

    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }

    const query = params.toString();
    return query ? `/updates?${query}` : "/updates";
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-16 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
            Updates
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            动态
          </h1>
          {activeFilters.length > 0 ? (
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
              <span>{activeFilters.join(" · ")}</span>
              <Link
                href="/updates"
                className="font-medium text-primary transition hover:opacity-80 dark:text-sky-300"
              >
                Clear
              </Link>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <SearchDialog
            buttonLabel="Search"
            placeholder="Search updates"
            emptyState="No matching updates found."
            idleState="Search by title, category, tag, or a line from the update."
            items={allUpdates.map((item) => ({
              id: item.id,
              href: `/updates/${item.slug}`,
              title: item.title,
              publishedAt: item.publishedAt,
              overline: item.category?.name ?? "Uncategorized",
              preview: item.summary ?? getContentPreview(item.contentHtml, item.content),
              searchText: [
                item.title,
                item.summary ?? "",
                item.category?.name ?? "",
                ...item.tags.map((tagItem) => tagItem.name),
                getContentText(item.contentHtml, item.content),
              ].join(" "),
            }))}
          />
        </div>
      </header>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        <p>{updatesCountLabel}</p>
        <div className="flex flex-wrap items-center gap-3">
          {SORT_OPTIONS.map((option) => {
            const isActive = option.value === activeSort;

            return (
              <Link
                key={option.value}
                href={buildUpdatesHref({ nextSort: option.value })}
                className={`transition ${
                  isActive
                    ? "text-primary dark:text-sky-300"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-10 space-y-10">
        {paginatedUpdates.length > 0 ? (
          groups.map((group) => (
            <section key={group.year} className="space-y-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                  {group.year}
                </h2>
                <div className="h-px flex-1 bg-zinc-200/80 dark:bg-zinc-800/80" />
              </div>

              <div className="grid gap-6">
                {group.items.map((item) => (
                  <article
                    key={item.id}
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
                          {item.category?.name ?? "Uncategorized"}
                        </span>
                        {item.tags.map((tagItem) => (
                          <span
                            key={tagItem.id}
                            className="text-xs font-medium text-zinc-400 dark:text-zinc-500"
                          >
                            #{tagItem.name}
                          </span>
                        ))}
                      </div>

                      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 transition group-hover:text-primary dark:text-zinc-50 dark:group-hover:text-sky-300">
                        <Link href={`/updates/${item.slug}`}>{item.title}</Link>
                      </h2>

                      <p className="reading-copy mt-3 max-w-3xl text-base leading-8 text-zinc-600 dark:text-zinc-300">
                        {item.summary ?? "No summary yet."}
                      </p>

                      <div className="mt-4 grid gap-2">
                        {getContentPreviewParagraphs(item.contentHtml, item.content).map(
                          (paragraph) => (
                            <p
                              key={paragraph}
                              className="reading-copy max-w-3xl text-sm leading-7 text-zinc-500 dark:text-zinc-400"
                            >
                              {paragraph}
                            </p>
                          ),
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="border-b border-dashed border-zinc-200/80 pb-8 text-sm text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
            No updates matched this filter yet.
          </div>
        )}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 pt-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href={buildUpdatesHref({ nextPage: Math.max(1, safeCurrentPage - 1) })}
          aria-disabled={safeCurrentPage === 1}
          className={`transition ${
            safeCurrentPage === 1
              ? "pointer-events-none opacity-40"
              : "hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Previous
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span>
            Page {safeCurrentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            {getVisiblePageItems(safeCurrentPage, totalPages).map((item, index) =>
              item === "ellipsis" ? (
                <span key={`ellipsis-${index}`} aria-hidden="true" className="select-none">
                  ...
                </span>
              ) : (
                <Link
                  key={item}
                  href={buildUpdatesHref({ nextPage: item })}
                  className={`transition ${
                    item === safeCurrentPage
                      ? "text-primary dark:text-sky-300"
                      : "hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  {item}
                </Link>
              ),
            )}
          </div>
        </div>
        <Link
          href={buildUpdatesHref({ nextPage: Math.min(totalPages, safeCurrentPage + 1) })}
          aria-disabled={safeCurrentPage === totalPages}
          className={`transition ${
            safeCurrentPage === totalPages
              ? "pointer-events-none opacity-40"
              : "hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Next
        </Link>
      </div>
    </main>
  );
}

const SORT_OPTIONS = [
  { value: "latest", label: "Latest" },
  { value: "earliest", label: "Earliest" },
] as const;
const UPDATES_PER_PAGE = 10;
const MAX_VISIBLE_PAGE_LINKS = 5;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function getSortValue(value?: string): SortValue {
  if (value === "earliest") {
    return value;
  }

  return "latest";
}

function sortUpdates(updates: PublishedUpdate[], sort: SortValue) {
  const nextUpdates = [...updates];

  if (sort === "earliest") {
    nextUpdates.sort((left, right) => compareUpdateDates(left.publishedAt, right.publishedAt));
    return nextUpdates;
  }

  nextUpdates.sort((left, right) => compareUpdateDates(right.publishedAt, left.publishedAt));
  return nextUpdates;
}

function groupUpdatesByYear(updates: PublishedUpdate[]) {
  const groups = new Map<string, PublishedUpdate[]>();

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

function compareUpdateDates(left: string | null | undefined, right: string | null | undefined) {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return leftTime - rightTime;
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

function getPageValue(value?: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function getVisiblePageItems(currentPage: number, totalPages: number) {
  if (totalPages <= MAX_VISIBLE_PAGE_LINKS) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "ellipsis", totalPages] as const;
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ] as const;
}

function getCategoryFilterLabel(slug: string, updates: PublishedUpdate[]) {
  if (slug === "uncategorized") {
    return "未分类";
  }

  return (
    updates.find((update) => update.category?.slug === slug)?.category?.name ?? formatContentTerm(slug)
  );
}

function getTagFilterLabel(slug: string, updates: PublishedUpdate[]) {
  return (
    updates.flatMap((update) => update.tags).find((tag) => tag.slug === slug)?.name ??
    formatContentTerm(slug)
  );
}

function getContentPreview(contentHtml: string | null, content: unknown) {
  return getContentText(contentHtml, content) || "No preview available yet.";
}

function getContentPreviewParagraphs(contentHtml: string | null, content: unknown) {
  const text = getContentPreview(contentHtml, content);
  return text ? [text] : [];
}
