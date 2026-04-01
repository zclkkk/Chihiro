import { siteConfig } from "@/lib/site";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen w-full items-center px-6 py-16 sm:px-12 lg:px-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden dark:block">
        <div className="absolute left-1/2 top-[4%] h-56 w-[28rem] -translate-x-1/2 rounded-full bg-sky-300/10 blur-3xl" />
        <div className="absolute left-1/2 bottom-[2%] h-64 w-[32rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <section className="relative z-10 grid w-full items-center gap-10 lg:grid-cols-[minmax(420px,46vw)_minmax(0,1fr)] lg:gap-20">
        <div className="flex justify-center lg:justify-start">
          <div className="hero-orb flex h-[20rem] w-[20rem] items-center justify-center rounded-full border border-zinc-200 bg-white text-8xl font-semibold tracking-tight text-primary shadow-[0_24px_80px_rgba(24,24,27,0.08)] dark:border-zinc-800 dark:bg-zinc-900/90 dark:shadow-[0_20px_60px_rgba(0,0,0,0.36)] sm:h-[24rem] sm:w-[24rem] sm:text-[9rem] lg:h-[30rem] lg:w-[30rem] lg:text-[11rem]">
            <span className="relative z-10 dark:text-zinc-100">
              {siteConfig.author.slice(0, 1)}
            </span>
          </div>
        </div>

        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-5xl lg:text-6xl">
            {siteConfig.author}
          </h1>
          <p className="mt-6 text-lg leading-9 text-zinc-600 dark:text-zinc-300 sm:text-xl">
            Hi, I&apos;m {siteConfig.author}, an interest-driven{" "}
            <span className="font-mono text-[0.95em] text-primary dark:text-sky-300">
              &lt;Developer /&gt;
            </span>{" "}
            <span className="font-medium italic text-zinc-900 dark:text-zinc-100">
              builder and writer
            </span>{" "}
            exploring products, technology, and personal expression.
          </p>
          <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-500 dark:text-zinc-400">
            {siteConfig.summary}
          </p>
        </div>
      </section>
    </main>
  );
}
