import Link from "next/link";
import { siteConfig } from "@/lib/site";

const footerFeedLinks = [
  {
    href: "/rss.xml",
    label: "RSS",
  },
  {
    href: "/more",
    label: "Subscribe",
  },
  {
    href: "/sitemap.xml",
    label: "Sitemap",
  },
] as const;

const footerContactLinks = [
  {
    href: `mailto:${siteConfig.email}`,
    label: "Email",
    external: true,
  },
  {
    href: siteConfig.github,
    label: "GitHub",
    external: true,
  },
  {
    href: "/message",
    label: "Message",
    external: false,
  },
] as const;

export function SiteFooter() {
  const currentYear = new Date().getFullYear();
  const mottoLines = splitFooterMotto(siteConfig.motto);

  return (
    <footer className="site-footer-surface relative z-10 mt-20">
      <div
        aria-hidden="true"
        className="site-footer-fade pointer-events-none absolute inset-x-0 -top-40 h-40"
      />

      <div className="relative mx-auto max-w-6xl px-6 pb-8 pt-14 sm:px-10">
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-[minmax(0,0.86fr)_auto] lg:items-start lg:gap-16">
          <div className="col-span-2 lg:col-span-1">
            <div>
              <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                {siteConfig.author}
              </p>
            </div>

            <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              {mottoLines ? (
                <>
                  <span className="lg:block">{mottoLines[0]}</span>
                  <span className="lg:block">{mottoLines[1]}</span>
                </>
              ) : (
                siteConfig.motto
              )}
            </p>
          </div>

          <div className="col-span-2 grid grid-cols-2 gap-8 lg:col-span-1 lg:justify-self-end lg:gap-16">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                Follow
              </p>
              <div className="mt-4 grid gap-3">
                {footerFeedLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group inline-flex w-fit items-center gap-3 text-sm text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-100"
                  >
                    <span>{item.label}</span>
                    <span className="text-zinc-300 transition group-hover:text-zinc-500 dark:text-zinc-700 dark:group-hover:text-zinc-400">
                      /
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                Contact
              </p>
              <div className="mt-4 grid gap-3">
                {footerContactLinks.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noreferrer" : undefined}
                    className="group inline-flex w-fit items-center gap-3 text-sm text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-100"
                  >
                    <span>{item.label}</span>
                    <span className="text-zinc-300 transition group-hover:text-zinc-500 dark:text-zinc-700 dark:group-hover:text-zinc-400">
                      /
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between gap-4 border-t border-zinc-200/70 pt-6 text-xs text-zinc-500 dark:border-zinc-800/70 dark:text-zinc-400">
          <span className="whitespace-nowrap">© {currentYear} {siteConfig.author}</span>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Yiniann/Chihiro"
              target="_blank"
              rel="noreferrer"
              className="whitespace-nowrap transition hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Powered by {siteConfig.name}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function splitFooterMotto(motto: string) {
  const breakMarker = " makes your rose so important.";
  const breakIndex = motto.indexOf(breakMarker);

  if (breakIndex < 0) {
    return null;
  }

  return [
    motto.slice(0, breakIndex).trimEnd(),
    motto.slice(breakIndex + 1).trimStart(),
  ] as const;
}
