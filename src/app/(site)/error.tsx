"use client";

import { useEffect } from "react";
import { SiteFooter } from "@/components/site-footer";
import { siteConfig } from "@/lib/site";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-full flex-col bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div aria-hidden="true" className="site-bottom-noise" />
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-16">
        <section className="w-full max-w-lg text-center">
          <h1 className="text-2xl font-semibold tracking-tight">页面出错了</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-500 dark:text-zinc-400">
            请刷新页面重试。如果问题持续出现，请联系管理员。
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            重试
          </button>
        </section>
      </main>
      <SiteFooter
        siteName={siteConfig.name}
        authorName={siteConfig.author}
        motto={siteConfig.motto}
        email={siteConfig.email}
        githubUrl={siteConfig.github}
      />
    </div>
  );
}
