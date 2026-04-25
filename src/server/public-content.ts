import "server-only";

import { getInstallationState } from "@/server/installation";
import { getSiteSettings } from "@/server/supabase/site";
import { listAllPublishedPosts, getPublishedPostBySlug, listPublishedPosts } from "@/server/supabase/posts";
import { listAllPublishedUpdates, listPublishedUpdates } from "@/server/supabase/updates";
import { listPostCategories } from "@/server/supabase/categories";
import { listRecentPublishedPostsForNavigation, listPublishedPostCategoriesForNavigation } from "@/server/supabase/posts";
import { listRecentPublishedUpdatesForNavigation } from "@/server/supabase/updates";
import { getPostPath, getUpdateAnchorPath } from "@/lib/routes";
import type { SiteSettingsRecord, PostItem, UpdateItem, CategoryOption, PostListSort, UpdateListSort } from "@/types/domain";

export class PublicSiteUnavailableError extends Error {
  constructor() {
    super("PUBLIC_SITE_UNAVAILABLE");
    this.name = "PublicSiteUnavailableError";
  }
}

export function isPublicSiteUnavailableError(error: unknown) {
  return error instanceof PublicSiteUnavailableError;
}

export class UninstalledSiteError extends Error {
  constructor() {
    super("UNINSTALLED_SITE");
    this.name = "UninstalledSiteError";
  }
}

export function isUninstalledSiteError(error: unknown) {
  return error instanceof UninstalledSiteError;
}

export type PublicHeaderPostCategory = {
  slug: string;
  label: string;
  href: string;
  contentCount: number;
  posts: Array<{
    id: string;
    slug: string;
    title: string;
    href: string;
  }>;
};

export type PublicRecentArchiveItem = {
  id: string;
  href: string;
  title: string;
  categoryLabel: string;
  publishedAt: string | null;
  kind: "篇章" | "足迹";
};

export async function getPublicSiteSettings(): Promise<SiteSettingsRecord> {
  await assertInstalledPublicSite();

  const settings = await getSiteSettings();
  if (!settings) {
    throw new PublicSiteUnavailableError();
  }

  return settings;
}

export async function listPublicPosts(): Promise<PostItem[]> {
  await assertInstalledPublicSite();
  return await listAllPublishedPosts();
}

export async function listPublicPostsPaginated(options: {
  page?: number;
  pageSize?: number;
  sort?: PostListSort;
  categorySlug?: string;
  tagSlugs?: string[];
}) {
  await assertInstalledPublicSite();
  return listPublishedPosts(options);
}

export async function getPublicPostBySlug(slug: string): Promise<PostItem | null> {
  await assertInstalledPublicSite();
  return getPublishedPostBySlug(slug);
}

export async function getPublicPostByCategoryAndSlug(
  categorySlug: string,
  slug: string,
): Promise<PostItem | null> {
  const post = await getPublicPostBySlug(slug);
  if (!post) return null;
  const expectedCategorySlug = post.category?.slug ?? "uncategorized";
  return expectedCategorySlug === categorySlug ? post : null;
}

export async function getPublicPostSlugs(): Promise<string[]> {
  await assertInstalledPublicSite();
  return (await listAllPublishedPosts()).map((post) => post.slug);
}

export async function getPublicPostRouteParams(): Promise<Array<{ category: string; slug: string }>> {
  await assertInstalledPublicSite();
  return (await listAllPublishedPosts()).map((post) => ({
    category: post.category?.slug ?? "uncategorized",
    slug: post.slug,
  }));
}

export async function listPublicUpdates(): Promise<UpdateItem[]> {
  await assertInstalledPublicSite();
  return await listAllPublishedUpdates();
}

export async function listPublicUpdatesPaginated(options: {
  page?: number;
  pageSize?: number;
  sort?: UpdateListSort;
}) {
  await assertInstalledPublicSite();
  return listPublishedUpdates(options);
}

export async function listPublicPostCategories(): Promise<CategoryOption[]> {
  await assertInstalledPublicSite();
  return await listPostCategories();
}

export async function listPublicHeaderPostCategories(): Promise<PublicHeaderPostCategory[]> {
  await assertInstalledPublicSite();

  const categories = await listPublishedPostCategoriesForNavigation();

  return categories.map((category) => ({
    slug: category.slug,
    label: category.label,
    href: `/posts?category=${encodeURIComponent(category.slug)}`,
    contentCount: category.contentCount,
    posts: category.posts.map((post) => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      href: getPostPath({
        slug: post.slug,
        categorySlug: category.slug === "uncategorized" ? null : category.slug,
      }),
    })),
  }));
}

export async function listPublicRecentArchiveItems(
  limit = 5,
): Promise<PublicRecentArchiveItem[]> {
  await assertInstalledPublicSite();

  const [posts, updates] = await Promise.all([
    listRecentPublishedPostsForNavigation(limit),
    listRecentPublishedUpdatesForNavigation(limit),
  ]);

  return [
    ...posts.map((post) => ({
      id: post.id,
      href: getPostPath({
        slug: post.slug,
        categorySlug: post.category?.slug,
      }),
      title: post.title,
      categoryLabel: post.category?.name ?? "Uncategorized",
      publishedAt: post.publishedAt,
      kind: "篇章" as const,
    })),
    ...updates.map((item) => ({
      id: item.id,
      href: getUpdateAnchorPath({
        updateId: item.id,
        page: 1,
      }),
      title: item.title,
      categoryLabel: "足迹",
      publishedAt: item.publishedAt,
      kind: "足迹" as const,
    })),
  ]
    .sort((a, b) => {
      const leftTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const rightTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, limit);
}

export async function listPublicRecentUpdateItems(
  limit = 4,
): Promise<PublicRecentArchiveItem[]> {
  await assertInstalledPublicSite();

  const updates = await listRecentPublishedUpdatesForNavigation(limit);

  return updates.map((item) => ({
    id: item.id,
    href: getUpdateAnchorPath({
      updateId: item.id,
      page: 1,
    }),
    title: item.title,
    categoryLabel: "足迹",
    publishedAt: item.publishedAt,
    kind: "足迹" as const,
  }));
}

async function assertInstalledPublicSite() {
  const installationState = await getInstallationState();
  if (!installationState.installed) {
    throw new UninstalledSiteError();
  }
}
