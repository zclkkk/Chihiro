export type PostStatus = "draft" | "published";

export type PostMeta = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: PostStatus;
  publishedAt: string | null;
  updatedAt?: string | null;
  category: string;
  tags: string[];
  authorName: string;
};

export type Post = PostMeta & {
  content: string[];
};

export const posts: Post[] = [
  {
    id: "post_hello_chihiro",
    title: "Hello Chihiro",
    slug: "hello-chihiro",
    description: "The first post of the Chihiro publishing project.",
    status: "published",
    publishedAt: "2026-03-30",
    updatedAt: "2026-03-30",
    category: "product-notes",
    tags: ["intro", "nextjs"],
    authorName: "Yinian",
    content: [
      "Chihiro starts as a blog-first project, but the long-term direction is a lightweight publishing system with a public site, an admin console, and an API layer.",
      "For now, we are keeping the content source local so that routing, layout, SEO, and RSS can be implemented without waiting for the database and admin workflow.",
      "Once the public reading experience is stable, the same post model can later be backed by a database and managed through the admin side.",
    ],
  },
  {
    id: "post_structure_notes",
    title: "Why the structure comes first",
    slug: "why-structure-comes-first",
    description: "A short note on why the routing and post model are the first building blocks.",
    status: "published",
    publishedAt: "2025-10-21",
    updatedAt: "2026-03-29",
    category: "engineering",
    tags: ["architecture"],
    authorName: "Yinian",
    content: [
      "Before building login, settings, and publishing, the project needs a stable content model.",
      "That model gives us one source of truth for the homepage, the post list, the post detail page, SEO metadata, and RSS output.",
    ],
  },
];

export function getPublishedPosts() {
  return posts
    .filter((post) => post.status === "published")
    .sort((a, b) => {
      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTime - aTime;
    });
}

export function getPostBySlug(slug: string) {
  return posts.find(
    (post) => post.status === "published" && post.slug === slug,
  );
}

export function getAllPostSlugs() {
  return getPublishedPosts().map((post) => post.slug);
}

export function formatPostTerm(value: string) {
  return value
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
