import Link from "next/link";
import { SearchDialog } from "@/components/search-dialog";
import { PostTagsPanel } from "@/components/post-tags-panel";
import { RelativeDate } from "@/components/relative-date";
import { formatPostTerm, getPublishedPosts } from "@/lib/posts";

type PostsPageProps = {
  searchParams: Promise<{
    category?: string;
    tag?: string | string[];
    sort?: string;
    page?: string;
  }>;
};

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const { category, tag, sort, page } = await searchParams;
  const selectedTags = Array.from(
    new Set((Array.isArray(tag) ? tag : tag ? [tag] : []).filter(Boolean)),
  );
  const activeSort = getSortValue(sort);
  const currentPage = getPageValue(page);
  const allPosts = getPublishedPosts();

  const filteredPosts = allPosts.filter((post) => {
    if (category && post.category !== category) {
      return false;
    }

    if (selectedTags.length > 0 && !selectedTags.every((item) => post.tags.includes(item))) {
      return false;
    }

    return true;
  });
  const publishedPosts = sortPosts(filteredPosts, activeSort);
  const totalPages = Math.max(1, Math.ceil(publishedPosts.length / POSTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedPosts = publishedPosts.slice(
    (safeCurrentPage - 1) * POSTS_PER_PAGE,
    safeCurrentPage * POSTS_PER_PAGE,
  );

  const activeFilters = [
    ...(category ? [`Category: ${formatPostTerm(category)}`] : []),
    ...(selectedTags.length > 0
      ? [`Tags: ${selectedTags.map((item) => formatPostTerm(item)).join(", ")}`]
      : []),
    ...(activeSort !== "latest"
      ? [
          `Sort: ${
            activeSort === "earliest"
              ? "Earliest"
              : activeSort === "updated"
                ? "Recently updated"
                : "Latest"
          }`,
        ]
      : []),
  ];
  const postsCountLabel =
    publishedPosts.length === allPosts.length
      ? `${allPosts.length} posts total`
      : `${publishedPosts.length} of ${allPosts.length} posts total`;

  const buildPostsHref = ({
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
    return query ? `/posts?${query}` : "/posts";
  };

  function buildTagHref(tagSlug: string) {
    const isActive = selectedTags.includes(tagSlug);
    const nextSelectedTags = isActive
      ? selectedTags.filter((item) => item !== tagSlug)
      : [...selectedTags, tagSlug];

    return buildPostsHref({ nextTags: nextSelectedTags });
  }

  const tagItems = getTagItems(allPosts, selectedTags, buildTagHref);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-16 sm:px-10">
      <header>
        <p className="text-sm uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
          Writing
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          文章
        </h1>
        {activeFilters.length > 0 ? (
          <div className="mt-5 flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
            <span>{activeFilters.join(" · ")}</span>
            <Link
              href="/posts"
              className="font-medium text-primary transition hover:opacity-80 dark:text-sky-300"
            >
              Clear
            </Link>
          </div>
        ) : null}
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="order-2 grid gap-5 lg:order-1">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500 dark:text-zinc-400">
            <p>{postsCountLabel}</p>
            <div className="flex flex-wrap items-center gap-3">
              {SORT_OPTIONS.map((option) => {
                const isActive = option.value === activeSort;

                return (
                  <Link
                    key={option.value}
                    href={buildPostsHref({ nextSort: option.value })}
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
          {publishedPosts.length > 0 ? (
            paginatedPosts.map((post) => (
              <article
                key={post.id}
                className="border-b border-zinc-200/80 pb-6 last:border-b-0 dark:border-zinc-800/80"
              >
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                </h2>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  {post.description}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={buildPostsHref({ nextCategory: post.category })}
                      className="text-xs font-medium text-primary transition hover:opacity-80 dark:text-sky-300"
                    >
                      / {formatPostTerm(post.category)}
                    </Link>
                    {post.tags.map((item) => (
                      <Link
                        key={item}
                        href={buildPostsHref({
                          nextTags: Array.from(new Set([...selectedTags, item])),
                        })}
                        className="text-xs font-medium text-zinc-500 transition hover:text-primary dark:text-zinc-400 dark:hover:text-sky-300"
                      >
                        #{formatPostTerm(item)}
                      </Link>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                    <RelativeDate value={post.publishedAt} />
                    <span>·</span>
                    <span>{post.authorName}</span>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="border-b border-dashed border-zinc-200/80 pb-8 text-sm text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
              No posts matched this filter yet.
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Link
              href={buildPostsHref({ nextPage: Math.max(1, safeCurrentPage - 1) })}
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
                      href={buildPostsHref({ nextPage: item })}
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
              href={buildPostsHref({ nextPage: Math.min(totalPages, safeCurrentPage + 1) })}
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
        </div>

        <aside className="order-1 lg:order-2 lg:sticky lg:top-28">
          <div className="border-l border-zinc-200/80 pl-6 dark:border-zinc-800/80">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                Search
              </p>
              <SearchDialog
                buttonLabel="Search posts"
                placeholder="Search posts, tags, and notes"
                emptyState="No matching posts found."
                idleState="Search by title, tag, category, or a line from the post."
                items={allPosts.map((post) => ({
                  id: post.id,
                  href: `/posts/${post.slug}`,
                  title: post.title,
                  publishedAt: post.publishedAt,
                  overline: formatPostTerm(post.category),
                  preview: post.description,
                  searchText: [
                    post.title,
                    post.description,
                    formatPostTerm(post.category),
                    post.authorName,
                    ...post.tags.map((item) => formatPostTerm(item)),
                    ...post.content,
                  ].join(" "),
                }))}
              />
            </div>

            <PostTagsPanel
              tags={tagItems}
              visibleCount={MAX_VISIBLE_TAGS}
              clearHref={selectedTags.length > 0 ? buildPostsHref({ nextTags: [] }) : null}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}

const SORT_OPTIONS = [
  { value: "latest", label: "Latest" },
  { value: "earliest", label: "Earliest" },
  { value: "updated", label: "Recently updated" },
] as const;
const POSTS_PER_PAGE = 10;
const MAX_VISIBLE_PAGE_LINKS = 5;
const MAX_VISIBLE_TAGS = 10;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function getSortValue(value?: string): SortValue {
  if (value === "earliest" || value === "updated") {
    return value;
  }

  return "latest";
}

function sortPosts(posts: ReturnType<typeof getPublishedPosts>, sort: SortValue) {
  const nextPosts = [...posts];

  if (sort === "earliest") {
    nextPosts.sort((left, right) => comparePostDates(left.publishedAt, right.publishedAt));
    return nextPosts;
  }

  if (sort === "updated") {
    nextPosts.sort((left, right) =>
      comparePostDates(right.updatedAt ?? right.publishedAt, left.updatedAt ?? left.publishedAt),
    );
    return nextPosts;
  }

  nextPosts.sort((left, right) => comparePostDates(right.publishedAt, left.publishedAt));
  return nextPosts;
}

function comparePostDates(left: string | null | undefined, right: string | null | undefined) {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return leftTime - rightTime;
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

function getTagItems(
  posts: ReturnType<typeof getPublishedPosts>,
  selectedTags: string[],
  buildHref: (tagSlug: string) => string,
) {
  const tagCounts = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(tagCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([slug, count]) => ({
      slug,
      label: formatPostTerm(slug),
      href: buildHref(slug),
      count,
      isActive: selectedTags.includes(slug),
    }));
}
