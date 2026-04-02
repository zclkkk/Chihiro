import Link from "next/link";
import { ArchiveTimeline, type ArchiveYearGroup } from "@/components/archive-timeline";
import { ScrollToTopLink } from "@/components/scroll-to-top-link";
import { SiteLogoMark } from "@/components/site-logo-mark";
import { formatPostTerm, getPublishedPosts } from "@/lib/posts";
import { formatUpdateTerm, getPublishedUpdates } from "@/lib/updates";

type ArchivesPageProps = {
  searchParams: Promise<{
    type?: string;
  }>;
};

type ArchiveType = "all" | "posts" | "updates";

type ArchiveItem = {
  id: string;
  href: string;
  title: string;
  publishedAt: string | null;
  categoryLabel: string;
  kind: "文章" | "动态";
  meta: string;
};

const archiveTypes: Array<{ value: ArchiveType; label: string }> = [
  { value: "all", label: "All" },
  { value: "posts", label: "Posts" },
  { value: "updates", label: "Updates" },
];

export default async function ArchivesPage({ searchParams }: ArchivesPageProps) {
  const { type } = await searchParams;
  const archiveType = normalizeArchiveType(type);
  const items = getArchiveItems(archiveType);
  const groups = groupArchiveItemsByYearAndMonth(items);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-16 sm:px-10">
      <p className="text-sm uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">Archives</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        归档
      </h1>

      <div className="mt-6">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2 text-zinc-400 dark:text-zinc-500">
          <span className="text-7xl font-light leading-none tracking-[-0.06em] sm:text-8xl">
            {items.length}
          </span>
          <span className="pb-2 text-2xl font-medium tracking-tight sm:text-3xl">
            posts, and the journey goes on
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {archiveTypes.map((item) => {
            const active = archiveType === item.value;

            return (
              <Link
                key={item.value}
                href={item.value === "all" ? "/archives" : `/archives?type=${item.value}`}
                className={`px-1 py-1 text-sm font-medium transition ${
                  active
                    ? "text-primary dark:text-sky-300"
                    : "text-zinc-500 hover:text-primary dark:text-zinc-400 dark:hover:text-sky-300"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <ArchiveTimeline groups={groups} />

      <div className="mt-10 flex flex-col items-center gap-5">
        <div className="h-px w-20 bg-gradient-to-r from-transparent via-primary/45 to-transparent dark:via-sky-300/45" />
        <SiteLogoMark caption="At the deepest point, time no longer moves forward. Here lies the very first, gently fallen stroke." />
        <ScrollToTopLink>Back to top</ScrollToTopLink>
      </div>
    </main>
  );
}

function normalizeArchiveType(value?: string): ArchiveType {
  if (value === "posts" || value === "updates") {
    return value;
  }

  return "all";
}

function getArchiveItems(type: ArchiveType): ArchiveItem[] {
  const postItems: ArchiveItem[] = getPublishedPosts().map((post) => ({
    id: post.id,
    href: `/posts/${post.slug}`,
    title: post.title,
    publishedAt: post.publishedAt,
    categoryLabel: formatPostTerm(post.category),
    kind: "文章",
    meta: post.authorName,
  }));

  const updateItems: ArchiveItem[] = getPublishedUpdates().map((update) => ({
    id: update.id,
    href: update.href,
    title: update.title,
    publishedAt: update.publishedAt,
    categoryLabel: formatUpdateTerm(update.category),
    kind: "动态",
    meta: "Update",
  }));

  const items =
    type === "posts" ? postItems : type === "updates" ? updateItems : [...postItems, ...updateItems];

  return items.sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime;
  });
}

function groupArchiveItemsByYearAndMonth(items: ArchiveItem[]): ArchiveYearGroup[] {
  const yearGroups = new Map<string, Map<string, ArchiveItem[]>>();

  for (const item of items) {
    const year = item.publishedAt ? String(new Date(item.publishedAt).getFullYear()) : "Unknown";
    const month = item.publishedAt ? formatTimelineMonth(item.publishedAt) : "未知";
    const currentYear = yearGroups.get(year) ?? new Map<string, ArchiveItem[]>();
    const currentMonthItems = currentYear.get(month) ?? [];

    currentMonthItems.push(item);
    currentYear.set(month, currentMonthItems);
    yearGroups.set(year, currentYear);
  }

  return Array.from(yearGroups.entries()).map(([year, months]) => ({
    year,
    months: Array.from(months.entries()).map(([month, monthItems]) => ({
      month,
      items: monthItems,
    })),
  }));
}

function formatTimelineMonth(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
  }).format(date);
}
