import {
  SiteHeader,
  type SiteHeaderPostCategory,
  type SiteHeaderRecentArchiveItem,
  type SiteHeaderUpdateCategory,
} from "@/components/site-header";
import { getPostPath } from "@/lib/routes";
import { SiteFooter } from "@/components/site-footer";
import { siteConfig } from "@/lib/site";
import { CategoryKind } from "@prisma/client";
import { hasAdminUsers, isAdminAuthenticated } from "@/server/auth";
import { listCategoriesByKind } from "@/server/repositories/categories";
import { listAllPublishedPosts } from "@/server/repositories/posts";
import { getSiteSettings } from "@/server/repositories/site";
import { listAllPublishedUpdates } from "@/server/repositories/updates";

export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [
    posts,
    updates,
    postCategoryRecords,
    updateCategoryRecords,
    adminHasUsers,
    isAdminLoggedIn,
    siteSettings,
  ] =
    await Promise.all([
    listAllPublishedPosts(),
    listAllPublishedUpdates(),
    listCategoriesByKind(CategoryKind.POST),
    listCategoriesByKind(CategoryKind.UPDATE),
    hasAdminUsers(),
    isAdminAuthenticated(),
    getSiteSettings(),
  ]);
  const postCategories = getPostCategories(postCategoryRecords, posts);
  const updateCategories = getUpdateCategories(updateCategoryRecords, updates);
  const recentArchiveItems = getRecentArchiveItems(posts, updates);
  const recentUpdateItems = getRecentUpdateItems(updates);
  const adminDisplayName = siteSettings?.authorName ?? siteConfig.author;
  const adminAvatarUrl = siteSettings?.authorAvatarUrl ?? siteConfig.avatar;

  return (
    <div className="relative flex min-h-full flex-col bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div aria-hidden="true" className="site-bottom-noise" />
      <SiteHeader
        adminHasUsers={adminHasUsers}
        isAdminLoggedIn={isAdminLoggedIn}
        adminDisplayName={adminDisplayName}
        adminAvatarUrl={adminAvatarUrl}
        postCategories={postCategories}
        updateCategories={updateCategories}
        recentArchiveItems={recentArchiveItems}
        recentUpdateItems={recentUpdateItems}
      />
      <div className="relative z-10 flex-1 pt-24 sm:pt-28">{children}</div>
      <SiteFooter />
    </div>
  );
}

function getPostCategories(
  categories: Awaited<ReturnType<typeof listCategoriesByKind>>,
  posts: Awaited<ReturnType<typeof listAllPublishedPosts>>,
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

function getUpdateCategories(
  categories: Awaited<ReturnType<typeof listCategoriesByKind>>,
  updates: Awaited<ReturnType<typeof listAllPublishedUpdates>>,
): SiteHeaderUpdateCategory[] {
  const groups = new Map<string, string[]>();
  const uncategorizedItems: string[] = [];

  for (const update of updates) {
    if (!update.category) {
      uncategorizedItems.push(update.title);
      continue;
    }

    const current = groups.get(update.category.slug) ?? [];

    current.push(update.title);
    groups.set(update.category.slug, current);
  }

  return categories
    .map((category) => ({
      tag: category.slug,
      label: category.name,
      href: `/updates?category=${encodeURIComponent(category.slug)}`,
      items: groups.get(category.slug) ?? [],
    }))
    .concat(
      uncategorizedItems.length > 0
        ? [
            {
              tag: "uncategorized",
              label: "Uncategorized",
              href: "/updates?category=uncategorized",
              items: uncategorizedItems,
            },
          ]
        : [],
    )
    .sort(compareSiteHeaderUpdateCategories);
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

function compareSiteHeaderUpdateCategories(
  left: SiteHeaderUpdateCategory,
  right: SiteHeaderUpdateCategory,
) {
  const leftUncategorized = left.tag === "uncategorized";
  const rightUncategorized = right.tag === "uncategorized";

  if (leftUncategorized !== rightUncategorized) {
    return leftUncategorized ? 1 : -1;
  }

  return right.items.length - left.items.length || left.label.localeCompare(right.label);
}

function getRecentArchiveItems(
  posts: Awaited<ReturnType<typeof listAllPublishedPosts>>,
  updates: Awaited<ReturnType<typeof listAllPublishedUpdates>>,
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
    ...updates.map((item) => ({
      id: item.id,
      href: `/updates/${item.slug}`,
      title: item.title,
      categoryLabel: item.category?.name ?? "Uncategorized",
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
  updates: Awaited<ReturnType<typeof listAllPublishedUpdates>>,
): SiteHeaderRecentArchiveItem[] {
  return updates
    .map((item) => ({
      id: item.id,
      href: `/updates/${item.slug}`,
      title: item.title,
      categoryLabel: item.category?.name ?? "Uncategorized",
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
