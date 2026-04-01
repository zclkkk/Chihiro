import Link from "next/link";
import { getPublishedPosts } from "@/lib/posts";

export default function ArchivesPage() {
  const posts = getPublishedPosts();

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-16 sm:px-10">
      <p className="text-sm uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">Archives</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        归档
      </h1>
      <div className="mt-10 space-y-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/80 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{post.publishedAt}</p>
              <Link
                href={`/posts/${post.slug}`}
                className="mt-1 block text-lg font-semibold text-zinc-950 dark:text-zinc-50"
              >
                {post.title}
              </Link>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">{post.authorName}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
