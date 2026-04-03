import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getParagraphsFromContent } from "@/lib/content";
import { RelativeDate } from "@/components/relative-date";
import { getPublishedPostBySlug, getPublishedPostSlugs } from "@/server/repositories/posts";

type PostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const slugs = await getPublishedPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    return {
      title: "Post not found",
    };
  }

  return {
    title: post.title,
    description: post.summary ?? undefined,
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-16 sm:px-10">
      <article>
        <p className="text-sm uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
          {post.authorName ?? "Unknown author"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {post.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <RelativeDate value={post.publishedAt} />
          {post.updatedAt ? (
            <span>
              Updated <RelativeDate value={post.updatedAt} />
            </span>
          ) : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {post.category ? (
            <Link
              href={`/posts?category=${encodeURIComponent(post.category.slug)}`}
              className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary dark:bg-sky-400/10 dark:text-sky-300"
            >
              {post.category.name}
            </Link>
          ) : null}
          {post.tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/posts?tag=${encodeURIComponent(tag.slug)}`}
              className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {tag.name}
            </Link>
          ))}
        </div>
        {post.summary ? (
          <p className="reading-copy mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-300">
            {post.summary}
          </p>
        ) : null}

        {post.contentHtml ? (
          <div
            className="reading-copy mt-10 space-y-6 text-base leading-8 text-zinc-800 dark:text-zinc-200"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />
        ) : (
          <div className="reading-copy mt-10 space-y-6 text-base leading-8 text-zinc-800 dark:text-zinc-200">
            {getParagraphsFromContent(post.content).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        )}
      </article>
    </main>
  );
}
