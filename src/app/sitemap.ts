import type { MetadataRoute } from "next";
import { getPostPath } from "@/lib/routes";
import { absoluteUrl } from "@/lib/site";
import { listAllPublishedPosts } from "@/server/repositories/posts";
import { listAllPublishedUpdates } from "@/server/repositories/updates";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, updates] = await Promise.all([listAllPublishedPosts(), listAllPublishedUpdates()]);
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
    },
    {
      url: absoluteUrl("/posts"),
      lastModified: new Date(),
    },
    {
      url: absoluteUrl("/updates"),
      lastModified: new Date(),
    },
    {
      url: absoluteUrl("/archives"),
      lastModified: new Date(),
    },
    {
      url: absoluteUrl("/more"),
      lastModified: new Date(),
    },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(getPostPath({ slug: post.slug, categorySlug: post.category?.slug })),
    lastModified: new Date(post.updatedAt ?? post.publishedAt ?? Date.now()),
  }));

  const updateRoutes: MetadataRoute.Sitemap = updates.map((update) => ({
    url: absoluteUrl(`/updates/${update.slug}`),
    lastModified: new Date(update.updatedAt ?? update.publishedAt ?? Date.now()),
  }));

  return [...staticRoutes, ...postRoutes, ...updateRoutes];
}
