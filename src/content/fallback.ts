import { siteConfig } from "@/lib/site";
import type { CategoryOption } from "@/server/repositories/categories";
import type { PostItem } from "@/server/repositories/posts";
import type { SiteSettingsRecord } from "@/server/repositories/site";
import type { UpdateItem } from "@/server/repositories/updates";

export const fallbackSiteSettings: SiteSettingsRecord = {
  siteName: siteConfig.name,
  siteDescription: siteConfig.description,
  siteUrl: siteConfig.url,
  locale: siteConfig.locale,
  authorName: siteConfig.author,
  authorAvatarUrl: siteConfig.avatar,
  summary: siteConfig.summary,
  motto: siteConfig.motto,
  email: siteConfig.email,
  githubUrl: siteConfig.github,
};

export const fallbackPosts: PostItem[] = [];

export const fallbackUpdates: UpdateItem[] = [];

export function deriveFallbackCategories(posts: PostItem[]): CategoryOption[] {
  const categories = new Map<number, CategoryOption>();

  for (const post of posts) {
    if (!post.category) {
      continue;
    }

    const current = categories.get(post.category.id);

    categories.set(post.category.id, {
      id: post.category.id,
      name: post.category.name,
      slug: post.category.slug,
      description: current?.description ?? null,
      contentCount: (current?.contentCount ?? 0) + 1,
    });
  }

  return Array.from(categories.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}
