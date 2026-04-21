import {
  SiteHeader,
  type SiteHeaderPostCategory,
  type SiteHeaderRecentArchiveItem,
} from "@/components/site-header";
import { getPostPath, getUpdateAnchorPath } from "@/lib/routes";
import { SiteFooter } from "@/components/site-footer";
import { siteConfig } from "@/lib/site";
import {
  getPublicAdminState,
  getPublicSiteSettings,
  listPublicPostCategories,
  listPublicPosts,
  listPublicUpdates,
} from "@/server/public-content";

export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [
    posts,
    updates,
    postCategoryRecords,
    siteSettings,
    adminState,
  ] =
    await Promise.all([
    listPublicPosts(),
    listPublicUpdates(),
    listPublicPostCategories(),
    getPublicSiteSettings(),
    getPublicAdminState(),
  ]);
  const postCategories = getPostCategories(postCategoryRecords, posts);
  const recentArchiveItems = getRecentArchiveItems(posts, updates);
  const recentUpdateItems = getRecentUpdateItems(updates);
  const adminDisplayName = siteSettings.authorName ?? siteConfig.author;
  const adminAvatarUrl = siteSettings.authorAvatarUrl ?? siteConfig.avatar;

  return (
    <div className="relative flex min-h-full flex-col bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div aria-hidden="true" className="site-bottom-noise" />
      <SiteHeader
        adminHasUsers={adminState.adminHasUsers}
        isAdminLoggedIn={adminState.isAdminLoggedIn}
        adminDisplayName={adminDisplayName}
        adminAvatarUrl={adminAvatarUrl}
        postCategories={postCategories}
        recentArchiveItems={recentArchiveItems}
        recentUpdateItems={recentUpdateItems}
      />
      <div className="relative z-10 flex-1 pt-24 sm:pt-28">{children}</div>
      <SiteFooter />
    </div>
  );
}

const UPDATE_LIST_PAGE_SIZE = 10;

function getPostCategories(
  categories: Awaited<ReturnType<typeof listPublicPostCategories>>,
  posts: Awaited<ReturnType<typeof listPublicPosts>>,
): SiteHeaderPostCategory[] {
  const groups = new Map<string, SiteHeaderPostCategory["posts"]>();
  const uncategorizedPosts: SiteHeaderPostCategory["posts"] = [];

  for (const post of posts) {
    if (!post.category) {
      uncategorizedPosts.push({
        id: post.id,
        slug: post.slug,
        title: post.title,
        href: getPostPath({ slug: post.slug, categorySlug: null }),
      });
      continue;
    }

    const current = groups.get(post.category.slug) ?? [];

    current.push({
      id: post.id,
      slug: post.slug,
      title: post.title,
      href: getPostPath({ slug: post.slug, categorySlug: post.category.slug }),
    });
    groups.set(post.category.slug, current);
  }

  return categories
    .map((category) => ({
      slug: category.slug,
      label: category.name,
      href: `/posts?category=${encodeURIComponent(category.slug)}`,
      posts: groups.get(category.slug) ?? [],
    }))
    .concat(
      uncategorizedPosts.length > 0
        ? [
            {
              slug: "uncategorized",
              label: "Uncategorized",
              href: "/posts?category=uncategorized",
              posts: uncategorizedPosts,
            },
          ]
        : [],
    )
    .sort(compareSiteHeaderCategories);
}

function compareSiteHeaderCategories(
  left: SiteHeaderPostCategory,
  right: SiteHeaderPostCategory,
) {
  const leftUncategorized = left.slug === "uncategorized";
  const rightUncategorized = right.slug === "uncategorized";

  if (leftUncategorized !== rightUncategorized) {
    return leftUncategorized ? 1 : -1;
  }

  return right.posts.length - left.posts.length || left.label.localeCompare(right.label);
}

function getRecentArchiveItems(
  posts: Awaited<ReturnType<typeof listPublicPosts>>,
  updates: Awaited<ReturnType<typeof listPublicUpdates>>,
): SiteHeaderRecentArchiveItem[] {
  return [
    ...posts.map((post) => ({
      id: post.id,
      href: getPostPath({ slug: post.slug, categorySlug: post.category?.slug }),
      title: post.title,
      categoryLabel: post.category?.name ?? "Uncategorized",
      publishedAt: post.publishedAt,
      kind: "文章" as const,
    })),
    ...updates.map((item, index) => ({
      id: item.id,
      href: getUpdateAnchorPath({
        updateId: item.id,
        page: Math.floor(index / UPDATE_LIST_PAGE_SIZE) + 1,
      }),
      title: item.title,
      categoryLabel: "动态",
      publishedAt: item.publishedAt,
      kind: "动态" as const,
    })),
  ]
    .sort((a, b) => {
      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 5);
}

function getRecentUpdateItems(
  updates: Awaited<ReturnType<typeof listPublicUpdates>>,
): SiteHeaderRecentArchiveItem[] {
  return updates
    .map((item, index) => ({
      id: item.id,
      href: getUpdateAnchorPath({
        updateId: item.id,
        page: Math.floor(index / UPDATE_LIST_PAGE_SIZE) + 1,
      }),
      title: item.title,
      categoryLabel: "动态",
      publishedAt: item.publishedAt,
      kind: "动态" as const,
    }))
    .sort((a, b) => {
      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 4);
}
