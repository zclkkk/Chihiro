"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ArchiveItem = {
  id: string;
  href: string;
  title: string;
  publishedAt: string | null;
  categoryLabel: string;
  kindLabel: "Posts" | "Updates";
  meta?: string;
};

export type ArchiveYearGroup = {
  year: string;
  months: Array<{
    month: string;
    items: ArchiveItem[];
  }>;
};

type ArchiveTimelineProps = {
  groups: ArchiveYearGroup[];
};

export function ArchiveTimeline({ groups }: ArchiveTimelineProps) {
  const [activePeriod, setActivePeriod] = useState(() => ({
    year: groups[0]?.year ?? "",
    month: groups[0]?.months[0]?.month ?? "",
  }));

  useEffect(() => {
    const updateActivePeriod = () => {
      let nextActivePeriod = {
        year: groups[0]?.year ?? "",
        month: groups[0]?.months[0]?.month ?? "",
      };
      const monthSections = Array.from(
        document.querySelectorAll<HTMLElement>("[data-archive-month]"),
      );

      for (const section of monthSections) {
        const year = section.dataset.archiveYear;
        const month = section.dataset.archiveMonth;

        if (!year || !month) {
          continue;
        }

        const { top } = section.getBoundingClientRect();

        if (top <= 160) {
          nextActivePeriod = { year, month };
        }
      }

      setActivePeriod((current) => {
        if (current.year === nextActivePeriod.year && current.month === nextActivePeriod.month) {
          return current;
        }

        return nextActivePeriod;
      });
    };

    updateActivePeriod();
    window.addEventListener("scroll", updateActivePeriod, { passive: true });
    window.addEventListener("resize", updateActivePeriod);

    return () => {
      window.removeEventListener("scroll", updateActivePeriod);
      window.removeEventListener("resize", updateActivePeriod);
    };
  }, [groups]);

  return (
    <div className="mt-12 grid gap-6 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-8">
      <div className="hidden md:sticky md:top-28 md:block md:self-start">
        <p className="text-[0.68rem] uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
          Time
        </p>
        <div className="mt-2 flex items-baseline gap-3">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
            {activePeriod.year}
          </h2>
          <span className="text-lg font-medium text-primary dark:text-sky-300">
            {activePeriod.month}
          </span>
        </div>
      </div>

      <div className="relative pl-8 md:pl-10">
        <div className="absolute bottom-0 left-3 top-0 w-px bg-gradient-to-b from-primary/30 via-zinc-200 to-zinc-100 dark:via-zinc-800 dark:to-zinc-900" />

        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.year} className="space-y-8">
              <p className="text-right text-xl font-semibold tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                {group.year}
              </p>

              {group.months.map((monthGroup) => (
                <section
                  key={`${group.year}-${monthGroup.month}`}
                  data-archive-year={group.year}
                  data-archive-month={monthGroup.month}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="relative left-[-1.55rem] inline-flex h-3 w-3 shrink-0 rounded-full border border-white bg-primary shadow-[0_0_0_4px_rgba(255,255,255,0.9)] dark:border-zinc-950 dark:shadow-[0_0_0_4px_rgba(10,10,10,0.95)]" />
                    <p className="text-sm font-medium tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
                      {monthGroup.month}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {monthGroup.items.map((item) => (
                      <article key={item.id} className="relative pl-2">
                        <Link href={item.href} className="group block py-1.5 transition">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-medium tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                              <span>{formatTimelineDate(item.publishedAt)}</span>
                              <span>/</span>
                              <span>{item.categoryLabel}</span>
                            </div>
                            <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary dark:bg-sky-300/12 dark:text-sky-300">
                              {item.kindLabel}
                            </span>
                          </div>

                          <h3 className="mt-2 text-lg font-semibold text-zinc-950 transition group-hover:text-primary dark:text-zinc-50 dark:group-hover:text-sky-300">
                            {item.title}
                          </h3>

                          {item.meta ? (
                            <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                              {item.meta}
                            </div>
                          ) : null}
                        </Link>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatTimelineDate(value: string | null) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}
