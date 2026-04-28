"use client";

import { useEffect } from "react";

export default function AdminError({
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
    <div className="relative min-h-full bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div aria-hidden="true" className="site-bottom-noise" />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
        <section className="w-full max-w-lg rounded-[2rem] border border-zinc-200/80 bg-white/90 p-8 text-center shadow-[0_24px_70px_rgba(24,24,27,0.12)] backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/70 dark:shadow-[0_24px_80px_rgba(0,0,0,0.42)] sm:p-10">
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.26em] text-zinc-400 dark:text-zinc-500">
            Admin
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">后台出错了</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-500 dark:text-zinc-400">
            请刷新页面重试。如果问题持续出现，请检查后台日志。
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
    </div>
  );
}
