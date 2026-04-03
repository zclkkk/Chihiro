import {
  SiteHeader,
  type SiteHeaderPostCategory,
  type SiteHeaderRecentArchiveItem,
  type SiteHeaderUpdateCategory,
} from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { listAllPublishedPosts } from "@/server/repositories/posts";
import { listAllPublishedUpdates } from "@/server/repositories/updates";

export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [posts, updates] = await Promise.all([listAllPublishedPosts(), listAllPublishedUpdates()]);
  const postCategories = getPostCategories(posts);
  const updateCategories = getUpdateCategories(updates);
  const recentArchiveItems = getRecentArchiveItems(posts, updates);

  return (
    <div className="relative flex min-h-full flex-col bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div aria-hidden="true" className="site-bottom-noise" />
      <SiteHeader
        postCategories={postCategories}
        updateCategories={updateCategories}
        recentArchiveItems={recentArchiveItems}
      />
      <div className="relative z-10 flex-1 pt-24 sm:pt-28">{children}</div>
      <SiteFooter />
    </div>
  );
}

function getPostCategories(
  posts: Awaited<ReturnType<typeof listAllPublishedPosts>>,
): SiteHeaderPostCategory[] {
  const groups = new Map<
    string,
    {
      label: string;
      posts: SiteHeaderPostCategory["posts"];
    }
  >();

  for (const post of posts) {
    if (!post.category) {
      continue;
    }

    const current = groups.get(post.category.slug) ?? {
      label: post.category.name,
      posts: [],
    };

    current.posts.push({
      id: post.id,
      slug: post.slug,
      title: post.title,
    });
    groups.set(post.category.slug, current);
  }

  return Array.from(groups.entries())
    .map(([slug, value]) => ({
      slug,
      label: value.label,
      href: `/posts?category=${encodeURIComponent(slug)}`,
      posts: value.posts,
    }))
    .sort((a, b) => b.posts.length - a.posts.length || a.label.localeCompare(b.label));
}

function getUpdateCategories(
  updates: Awaited<ReturnType<typeof listAllPublishedUpdates>>,
): SiteHeaderUpdateCategory[] {
  const groups = new Map<string, { label: string; items: string[] }>();

  for (const update of updates) {
    if (!update.category) {
      continue;
    }

    const current = groups.get(update.category.slug) ?? {
      label: update.category.name,
      items: [],
    };

    current.items.push(update.title);
    groups.set(update.category.slug, current);
  }

  return Array.from(groups.entries())
    .map(([slug, value]) => ({
      tag: slug,
      label: value.label,
      href: `/updates?category=${encodeURIComponent(slug)}`,
      items: value.items,
    }))
    .sort((a, b) => b.items.length - a.items.length || a.label.localeCompare(b.label));
}

function getRecentArchiveItems(
  posts: Awaited<ReturnType<typeof listAllPublishedPosts>>,
  updates: Awaited<ReturnType<typeof listAllPublishedUpdates>>,
): SiteHeaderRecentArchiveItem[] {
  return [
    ...posts.map((post) => ({
      id: post.id,
      href: `/posts/${post.slug}`,
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
