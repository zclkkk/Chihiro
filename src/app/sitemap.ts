import type { MetadataRoute } from "next";
import { getPostPath } from "@/lib/routes";
import { absoluteUrl } from "@/lib/site";
import { listPublicPosts } from "@/server/public-content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await listPublicPosts();
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
      url: absoluteUrl("/timeline"),
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

  return [...staticRoutes, ...postRoutes];
}
