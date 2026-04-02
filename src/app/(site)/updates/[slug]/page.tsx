import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RelativeDate } from "@/components/relative-date";
import {
  formatUpdateTerm,
  getAllUpdateSlugs,
  getPublishedUpdates,
  getUpdateBySlug,
} from "@/lib/updates";

type UpdatePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return getAllUpdateSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: UpdatePageProps): Promise<Metadata> {
  const { slug } = await params;
  const update = getUpdateBySlug(slug);

  if (!update) {
    return {
      title: "Update not found",
    };
  }

  return {
    title: `${update.title} | Update`,
    description: update.summary,
  };
}

export default async function UpdatePage({ params }: UpdatePageProps) {
  const { slug } = await params;
  const update = getUpdateBySlug(slug);

  if (!update) {
    notFound();
  }

  const publishedUpdates = getPublishedUpdates();
  const currentIndex = publishedUpdates.findIndex((item) => item.slug === update.slug);
  const previousUpdate = currentIndex < publishedUpdates.length - 1 ? publishedUpdates[currentIndex + 1] : null;
  const nextUpdate = currentIndex > 0 ? publishedUpdates[currentIndex - 1] : null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-16 sm:px-10">
      <article>
        <Link
          href="/updates"
          className="text-sm font-medium text-zinc-500 transition hover:text-primary dark:text-zinc-400 dark:hover:text-sky-300"
        >
          Back to updates
        </Link>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
          <span>{formatUpdateTerm(update.category)}</span>
          <span>/</span>
          <span>Update</span>
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
          {update.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <RelativeDate value={update.publishedAt} />
        </div>

        <p className="mt-6 text-base leading-8 text-zinc-600 dark:text-zinc-300">
          {update.summary}
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          <Link
            href={`/updates?category=${encodeURIComponent(update.category)}`}
            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary dark:bg-sky-300/12 dark:text-sky-300"
          >
            {formatUpdateTerm(update.category)}
          </Link>
          {update.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              #{formatUpdateTerm(tag)}
            </span>
          ))}
        </div>

        <div className="mt-10 space-y-5 text-base leading-8 text-zinc-800 dark:text-zinc-200">
          {update.content.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </article>

      <div className="mt-14 grid gap-3 border-t border-zinc-200/80 pt-6 text-sm dark:border-zinc-800/80 sm:grid-cols-2">
        <div>
          {previousUpdate ? (
            <Link
              href={previousUpdate.href}
              className="group block rounded-[1.2rem] px-4 py-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/70"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                Older update
              </p>
              <p className="mt-2 font-medium text-zinc-900 transition group-hover:text-primary dark:text-zinc-100 dark:group-hover:text-sky-300">
                {previousUpdate.title}
              </p>
            </Link>
          ) : null}
        </div>
        <div>
          {nextUpdate ? (
            <Link
              href={nextUpdate.href}
              className="group block rounded-[1.2rem] px-4 py-4 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-900/70 sm:text-right"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                Newer update
              </p>
              <p className="mt-2 font-medium text-zinc-900 transition group-hover:text-primary dark:text-zinc-100 dark:group-hover:text-sky-300">
                {nextUpdate.title}
              </p>
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
