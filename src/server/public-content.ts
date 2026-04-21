import { deriveFallbackCategories, fallbackPosts, fallbackSiteSettings, fallbackUpdates } from "@/content/fallback";
import { hasAdminUsers, isAdminAuthenticated } from "@/server/auth";
import { hasDatabaseUrl } from "@/server/db/client";
import { listPostCategories, type CategoryOption } from "@/server/repositories/categories";
import {
  getPublishedPostByCategoryAndSlug,
  getPublishedPostBySlug,
  getPublishedPostRouteParams,
  getPublishedPostSlugs,
  listAllPublishedPosts,
  type PostItem,
} from "@/server/repositories/posts";
import { getSiteSettings, type SiteSettingsRecord } from "@/server/repositories/site";
import { listAllPublishedUpdates, type UpdateItem } from "@/server/repositories/updates";

export async function getPublicSiteSettings(): Promise<SiteSettingsRecord> {
  if (!hasDatabaseUrl()) {
    return fallbackSiteSettings;
  }

  try {
    return (await getSiteSettings()) ?? fallbackSiteSettings;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return fallbackSiteSettings;
    }

    throw error;
  }
}

export async function listPublicPosts(): Promise<PostItem[]> {
  if (!hasDatabaseUrl()) {
    return fallbackPosts;
  }

  try {
    return await listAllPublishedPosts();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return fallbackPosts;
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
  if (!hasDatabaseUrl()) {
    return fallbackPosts.map((post) => post.slug);
  }

  try {
    return await getPublishedPostSlugs();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return fallbackPosts.map((post) => post.slug);
    }

    throw error;
  }
}

export async function getPublicPostRouteParams(): Promise<Array<{ category: string; slug: string }>> {
  if (!hasDatabaseUrl()) {
    return fallbackPosts.map((post) => ({
      category: post.category?.slug ?? "uncategorized",
      slug: post.slug,
    }));
  }

  try {
    return await getPublishedPostRouteParams();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return fallbackPosts.map((post) => ({
        category: post.category?.slug ?? "uncategorized",
        slug: post.slug,
      }));
    }

    throw error;
  }
}

export async function listPublicUpdates(): Promise<UpdateItem[]> {
  if (!hasDatabaseUrl()) {
    return fallbackUpdates;
  }

  try {
    return await listAllPublishedUpdates();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return fallbackUpdates;
    }

    throw error;
  }
}

export async function listPublicPostCategories(): Promise<CategoryOption[]> {
  if (!hasDatabaseUrl()) {
    return deriveFallbackCategories(fallbackPosts);
  }

  try {
    return await listPostCategories();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return deriveFallbackCategories(fallbackPosts);
    }

    throw error;
  }
}

export async function getPublicAdminState() {
  if (!hasDatabaseUrl()) {
    return {
      adminHasUsers: false,
      isAdminLoggedIn: false,
    };
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
    if (isDatabaseUnavailableError(error)) {
      return {
        adminHasUsers: false,
        isAdminLoggedIn: false,
      };
    }

    throw error;
  }
}

function isDatabaseUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = Reflect.get(error, "code");
  if (typeof code === "string") {
    const normalizedCode = code.toUpperCase();

    if (
      normalizedCode === "ECONNREFUSED" ||
      normalizedCode === "ECONNRESET" ||
      normalizedCode === "ENOTFOUND" ||
      normalizedCode === "EHOSTUNREACH" ||
      normalizedCode === "ETIMEDOUT" ||
      normalizedCode === "57P01"
    ) {
      return true;
    }
  }

  const message = Reflect.get(error, "message");
  if (typeof message === "string") {
    const normalizedMessage = message.toLowerCase();

    if (
      normalizedMessage.includes("database_url is not set") ||
      normalizedMessage.includes("can't reach database server") ||
      normalizedMessage.includes("failed to connect") ||
      normalizedMessage.includes("connection") ||
      normalizedMessage.includes("timeout")
    ) {
      return true;
    }
  }

  const cause = Reflect.get(error, "cause");
  return cause !== error && isDatabaseUnavailableError(cause);
}
