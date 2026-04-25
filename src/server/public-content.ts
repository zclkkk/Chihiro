import { getPostPath, getUpdateAnchorPath } from "@/lib/routes";
import { hasAdminUsers, isAdminAuthenticated } from "@/server/auth";
import { hasDatabaseUrl } from "@/server/db/client";
import {
  isDatabaseSchemaMissingError,
  isDatabaseUnavailableError,
} from "@/server/database-errors";
import { getInstallationState } from "@/server/installation";
import { listPostCategories, type CategoryOption } from "@/server/repositories/categories";
import {
  getPublishedPostRouteParams,
  getPublishedPostSlugs,
  listAllPublishedPosts,
  listPublishedPostCategoriesForNavigation,
  listRecentPublishedPostsForNavigation,
  type PostItem,
} from "@/server/repositories/posts";
import { getSiteSettings, type SiteSettingsRecord } from "@/server/repositories/site";
import {
  listAllPublishedUpdates,
  listRecentPublishedUpdatesForNavigation,
  type UpdateItem,
} from "@/server/repositories/updates";

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
    id: number;
    slug: string;
    title: string;
    href: string;
  }>;
};

export type PublicRecentArchiveItem = {
  id: number;
  href: string;
  title: string;
  categoryLabel: string;
  publishedAt: string | null;
  kind: "篇章" | "足迹";
};

export async function getPublicSiteSettings(): Promise<SiteSettingsRecord> {
  await assertInstalledPublicSite();

  if (!hasDatabaseUrl()) {
    throw new PublicSiteUnavailableError();
  }

  try {
    const settings = await getSiteSettings();

    if (!settings) {
      throw new PublicSiteUnavailableError();
    }

    return settings;
  } catch (error) {
    if (isDatabaseUnavailableError(error) || isDatabaseSchemaMissingError(error)) {
      throw new PublicSiteUnavailableError();
    }

    throw error;
  }
}

export async function listPublicPosts(): Promise<PostItem[]> {
  await assertInstalledPublicSite();

  if (!hasDatabaseUrl()) {
    throw new PublicSiteUnavailableError();
  }

  try {
    return await listAllPublishedPosts();
  } catch (error) {
    if (isDatabaseUnavailableError(error) || isDatabaseSchemaMissingError(error)) {
      throw new PublicSiteUnavailableError();
    }

    throw error;
  }
}

export async function getPublicPostBySlug(slug: string): Promise<PostItem | null> {
  const posts = await listPublicPosts();
  return posts.find((item) => item.slug === slug) ?? null;
}

export async function getPublicPostByCategoryAndSlug(
  categorySlug: string,
  slug: string,
): Promise<PostItem | null> {
  const post = await getPublicPostBySlug(slug);

  if (!post) {
    return null;
  }

  const expectedCategorySlug = post.category?.slug ?? "uncategorized";
  return expectedCategorySlug === categorySlug ? post : null;
}

export async function getPublicPostSlugs(): Promise<string[]> {
  await assertInstalledPublicSite();

  if (!hasDatabaseUrl()) {
    throw new PublicSiteUnavailableError();
  }

  try {
    return await getPublishedPostSlugs();
  } catch (error) {
    if (isDatabaseUnavailableError(error) || isDatabaseSchemaMissingError(error)) {
      throw new PublicSiteUnavailableError();
    }

    throw error;
  }
}

export async function getPublicPostRouteParams(): Promise<Array<{ category: string; slug: string }>> {
  await assertInstalledPublicSite();

  if (!hasDatabaseUrl()) {
    throw new PublicSiteUnavailableError();
  }

  try {
    return await getPublishedPostRouteParams();
  } catch (error) {
    if (isDatabaseUnavailableError(error) || isDatabaseSchemaMissingError(error)) {
      throw new PublicSiteUnavailableError();
    }

    throw error;
  }
}

export async function listPublicUpdates(): Promise<UpdateItem[]> {
  await assertInstalledPublicSite();

  if (!hasDatabaseUrl()) {
    throw new PublicSiteUnavailableError();
  }

  try {
    return await listAllPublishedUpdates();
  } catch (error) {
    if (isDatabaseUnavailableError(error) || isDatabaseSchemaMissingError(error)) {
      throw new PublicSiteUnavailableError();
    }

    throw error;
  }
}

export async function listPublicPostCategories(): Promise<CategoryOption[]> {
  await assertInstalledPublicSite();

  if (!hasDatabaseUrl()) {
    throw new PublicSiteUnavailableError();
  }

  try {
    return await listPostCategories();
  } catch (error) {
    if (isDatabaseUnavailableError(error) || isDatabaseSchemaMissingError(error)) {
      throw new PublicSiteUnavailableError();
    }

    throw error;
  }
}

export async function listPublicHeaderPostCategories(): Promise<PublicHeaderPostCategory[]> {
  await assertInstalledPublicSite();

  if (!hasDatabaseUrl()) {
    throw new PublicSiteUnavailableError();
  }

  try {
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
  } catch (error) {
    if (isDatabaseUnavailableError(error) || isDatabaseSchemaMissingError(error)) {
      throw new PublicSiteUnavailableError();
    }

    throw error;
  }
}

export async function listPublicRecentArchiveItems(
  limit = 5,
): Promise<PublicRecentArchiveItem[]> {
  await assertInstalledPublicSite();

  if (!hasDatabaseUrl()) {
    throw new PublicSiteUnavailableError();
  }

  try {
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
  } catch (error) {
    if (isDatabaseUnavailableError(error) || isDatabaseSchemaMissingError(error)) {
      throw new PublicSiteUnavailableError();
    }

    throw error;
  }
}

export async function listPublicRecentUpdateItems(
  limit = 4,
): Promise<PublicRecentArchiveItem[]> {
  await assertInstalledPublicSite();

  if (!hasDatabaseUrl()) {
    throw new PublicSiteUnavailableError();
  }

  try {
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
  } catch (error) {
    if (isDatabaseUnavailableError(error) || isDatabaseSchemaMissingError(error)) {
      throw new PublicSiteUnavailableError();
    }

    throw error;
  }
}

export async function getPublicAdminState() {
  await assertInstalledPublicSite();

  if (!hasDatabaseUrl()) {
    throw new PublicSiteUnavailableError();
  }

  try {
    const [adminHasUsers, isAdminLoggedIn] = await Promise.all([
      hasAdminUsers(),
      isAdminAuthenticated(),
    ]);

    return {
      adminHasUsers,
      isAdminLoggedIn,
    };
  } catch (error) {
    if (isDatabaseUnavailableError(error) || isDatabaseSchemaMissingError(error)) {
      throw new PublicSiteUnavailableError();
    }

    throw error;
  }
}

async function assertInstalledPublicSite() {
  const installationState = await getInstallationState();

  if (!installationState.installed) {
    throw new UninstalledSiteError();
  }
}
