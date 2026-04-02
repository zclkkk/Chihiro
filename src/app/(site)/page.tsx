import Image from "next/image";
import { siteConfig } from "@/lib/site";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen w-full items-center px-6 py-16 sm:px-12 lg:px-24">
      <section className="relative z-10 grid w-full items-center gap-10 lg:grid-cols-[minmax(420px,46vw)_minmax(0,1fr)] lg:gap-20">
        <div className="flex justify-center lg:justify-start">
          <div className="relative h-[20rem] w-[20rem] overflow-hidden rounded-full sm:h-[24rem] sm:w-[24rem] lg:h-[30rem] lg:w-[30rem]">
            <Image
              src={siteConfig.avatar}
              alt={`${siteConfig.author} avatar`}
              fill
              priority
              sizes="(min-width: 1024px) 30rem, (min-width: 640px) 24rem, 20rem"
              className="object-cover"
            />
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
