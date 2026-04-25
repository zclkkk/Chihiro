import { PublicSiteUnavailableScreen } from "@/components/public-site-unavailable-screen";
import Link from "next/link";
import { Suspense } from "react";
import { getContentPreview, getContentText } from "@/lib/content";
import { getUpdateAnchorPath } from "@/lib/routes";
import { SearchDialog } from "@/components/search-dialog";
import { UpdatesPageContentSkeleton } from "@/components/site-route-skeletons";
import { StaggerReveal, StaggerRevealItem } from "@/components/stagger-reveal";
import { isPublicSiteUnavailableError, listPublicUpdates } from "@/server/public-content";

type UpdatesPageProps = {
  searchParams: Promise<{
    sort?: string;
    page?: string;
  }>;
};

type PublishedUpdate = Awaited<ReturnType<typeof listPublicUpdates>>[number];

export default async function UpdatesPage({ searchParams }: UpdatesPageProps) {
  const { sort, page } = await searchParams;
  const activeSort = getSortValue(sort);
  const currentPage = getPageValue(page);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-16 sm:px-10">
      <header>
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
            Updates
          </p>
          <h1 className="mt-4 flex flex-wrap items-baseline gap-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            <span>足迹</span>
            <span className="text-base font-medium tracking-normal text-zinc-400 dark:text-zinc-500">
              ·
            </span>
            <span className="text-base font-medium tracking-normal text-zinc-500 dark:text-zinc-400">
              最近动态
            </span>
          </h1>
        </div>
      </header>

      <Suspense fallback={<UpdatesPageContentSkeleton />}>
        <UpdatesPageContent activeSort={activeSort} currentPage={currentPage} />
      </Suspense>
    </main>
  );
}

async function UpdatesPageContent({
  activeSort,
  currentPage,
}: {
  activeSort: SortValue;
  currentPage: number;
}) {
  let allUpdates;

  try {
    allUpdates = await listPublicUpdates();
  } catch (error) {
    if (isPublicSiteUnavailableError(error)) {
      return <PublicSiteUnavailableScreen />;
    }

    throw error;
  }

  const sortedUpdates = sortUpdates(allUpdates, activeSort);
  const totalPages = Math.max(1, Math.ceil(sortedUpdates.length / UPDATES_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedUpdates = sortedUpdates.slice(
    (safeCurrentPage - 1) * UPDATES_PER_PAGE,
    safeCurrentPage * UPDATES_PER_PAGE,
  );
  const updatePageById = new Map<number, number>();

  sortedUpdates.forEach((item, index) => {
    updatePageById.set(item.id, Math.floor(index / UPDATES_PER_PAGE) + 1);
  });

  const groups = groupUpdatesByYear(paginatedUpdates);
  const updatesCountLabel =
    sortedUpdates.length === allUpdates.length
      ? `${allUpdates.length} updates total`
      : `${sortedUpdates.length} of ${allUpdates.length} updates total`;

  const buildUpdatesHref = ({
    nextSort = activeSort,
    nextPage = 1,
  }: {
    nextSort?: SortValue;
    nextPage?: number;
  } = {}) => {
    const params = new URLSearchParams();

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
    <>
      <StaggerRevealItem className="mt-8 flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-wrap items-center gap-4">
          <SearchDialog
            buttonLabel="Search"
            placeholder="Search updates"
            emptyState="No matching updates found."
            idleState="Search by title or a line from the update."
            showResultTitle={false}
            items={allUpdates.map((item) => ({
              id: item.id,
              href: getUpdateAnchorPath({
                updateId: item.id,
                sort: activeSort,
                page: updatePageById.get(item.id),
              }),
              title: item.title,
              publishedAt: item.publishedAt,
              overline: "Update",
              preview: getContentPreview(item.contentHtml, item.content),
              searchableTitle: false,
              searchText: [
                item.authorName ?? "",
                getContentText(item.contentHtml, item.content),
              ].join(" "),
            }))}
          />
        </div>
      </StaggerRevealItem>

      <StaggerRevealItem className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500 dark:text-zinc-400">
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
                    ? "text-primary"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </StaggerRevealItem>

      <StaggerReveal className="mt-10 space-y-10" delayChildren={0.04}>
        {paginatedUpdates.length > 0 ? (
          groups.map((group) => (
            <StaggerRevealItem key={group.year} className="space-y-6" offset={20}>
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                  {group.year}
                </h2>
                <div className="h-px flex-1 bg-zinc-200/80 dark:bg-zinc-800/80" />
              </div>

              <StaggerReveal className="grid gap-6" delayChildren={0.02} staggerChildren={0.065}>
                {group.items.map((item) => {
                  const preview = getContentPreview(item.contentHtml, item.content);

                  return (
                    <StaggerRevealItem key={item.id}>
                      <article
                        id={`update-${item.id}`}
                        className="grid gap-4 border-b border-zinc-200/80 py-6 last:border-b-0 dark:border-zinc-800/80 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-6 scroll-mt-24"
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
                          <p className="reading-copy updates-copy mt-3 max-w-3xl text-base leading-8 text-zinc-600 dark:text-zinc-300">
                            {renderUpdatePreview(preview)}
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                            <span>{formatFeedTime(item.publishedAt)}</span>
                            <span>{item.authorName ?? "未署名"}</span>
                          </div>
                        </div>
                      </article>
                    </StaggerRevealItem>
                  );
                })}
              </StaggerReveal>
            </StaggerRevealItem>
          ))
        ) : (
          <StaggerRevealItem className="border-b border-dashed border-zinc-200/80 pb-8 text-sm text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
            No updates matched this filter yet.
          </StaggerRevealItem>
        )}
      </StaggerReveal>

      <StaggerRevealItem className="mt-10 flex flex-wrap items-center justify-between gap-4 pt-2 text-sm text-zinc-500 dark:text-zinc-400">
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
                      ? "text-primary"
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
      </StaggerRevealItem>
    </>
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

function formatFeedTime(value: string | null) {
  if (!value) {
    return "--:--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function renderUpdatePreview(preview: string) {
  const trimmedPreview = preview.trimStart();
  const leadingWhitespace = preview.slice(0, preview.length - trimmedPreview.length);
  const [firstCharacter = "", ...restCharacters] = Array.from(trimmedPreview);

  if (!firstCharacter) {
    return preview;
  }

  return (
    <>
      {leadingWhitespace}
      <span className="updates-drop-cap" aria-hidden="true">
        {firstCharacter}
      </span>
      <span className="sr-only">{firstCharacter}</span>
      {restCharacters.join("")}
    </>
  );
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
