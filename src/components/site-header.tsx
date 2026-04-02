"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDeferredValue, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenText,
  ChevronDown,
  ChevronUp,
  Compass,
  FileArchive,
  GalleryVerticalEnd,
  Menu,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { RelativeDate } from "@/components/relative-date";
import { ThemeModeToggle } from "@/components/theme-mode-toggle";
import { formatPostTerm, getPublishedPosts } from "@/lib/posts";
import { siteConfig } from "@/lib/site";
import { formatUpdateTerm, getPublishedUpdates } from "@/lib/updates";

const navItems = [
  {
    href: "/",
    label: "首页",
    icon: Compass,
    description: "Start with a quick introduction and the overall tone of the site.",
  },
  {
    href: "/posts",
    label: "文章",
    icon: BookOpenText,
    description: "Longer writing on products, technology, and personal expression.",
  },
  {
    href: "/updates",
    label: "动态",
    icon: Sparkles,
    description: "Short updates, experiments, and notes from ongoing work.",
  },
  {
    href: "/archives",
    label: "归档",
    icon: FileArchive,
    description: "Browse everything by time and revisit older pieces in one place.",
  },
  {
    href: "/more",
    label: "更多",
    icon: GalleryVerticalEnd,
    description: "A softer space for side pages, collections, and future ideas.",
  },
];

const publishedPosts = getPublishedPosts();
const publishedUpdates = getPublishedUpdates();
const postCategories = Array.from(
  new Set(publishedPosts.map((post) => post.category)),
)
  .map((category) => ({
    slug: category,
    label: formatPostTerm(category),
    href: `/posts?category=${encodeURIComponent(category)}`,
    posts: publishedPosts.filter((post) => post.category === category),
  }))
  .sort((a, b) => b.posts.length - a.posts.length || a.label.localeCompare(b.label));

const updateCategories = Array.from(
  new Set(publishedUpdates.map((update) => update.category)),
)
  .map((category) => {
    const items = publishedUpdates.filter((update) => update.category === category);

    return {
      tag: category,
      label: formatUpdateTerm(category),
      href: `/updates?category=${encodeURIComponent(category)}`,
      items: items.map((item) => item.title),
    };
  })
  .sort((a, b) => b.items.length - a.items.length || a.label.localeCompare(b.label));

type RecentArchiveItem = {
  id: string;
  href: string;
  title: string;
  categoryLabel: string;
  publishedAt: string | null;
  kind: "文章" | "动态";
};

const recentArchiveItems: RecentArchiveItem[] = [
  ...publishedPosts.map((post) => ({
    id: post.id,
    href: `/posts/${post.slug}`,
    title: post.title,
    categoryLabel: formatPostTerm(post.category),
    publishedAt: post.publishedAt,
    kind: "文章" as const,
  })),
  ...publishedUpdates.map((item) => ({
    id: item.id,
    href: item.href,
    title: item.title,
    categoryLabel: formatUpdateTerm(item.category),
    publishedAt: item.publishedAt,
    kind: "动态" as const,
  })),
]
  .sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime;
  })
  .slice(0, 5);

const morePlaceholders = [
  { eyebrow: "Projects", title: "项目" },
  { eyebrow: "Friends", title: "友链" },
  { eyebrow: "Reviews", title: "品鉴" },
  { eyebrow: "Bookmarks", title: "书签" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileBrandVisible, setIsMobileBrandVisible] = useState(true);
  const [isMegaNavOpen, setIsMegaNavOpen] = useState(false);
  const [highlightedHref, setHighlightedHref] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [expandedMobileHref, setExpandedMobileHref] = useState<string | null>(null);
  const [hoveredPostCategorySlug, setHoveredPostCategorySlug] = useState<string | null>(
    postCategories[0]?.slug ?? null,
  );
  const [hoveredUpdateCategoryTag, setHoveredUpdateCategoryTag] = useState<string | null>(
    updateCategories[0]?.tag ?? null,
  );
  const megaNavRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollTopRef = useRef(0);
  const deferredIsScrolled = useDeferredValue(isScrolled);

  useEffect(() => {
    const getScrollTop = () =>
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    const handleScroll = () => {
      const nextScrollTop = getScrollTop();

      setIsScrolled(nextScrollTop > 20);

      if (nextScrollTop <= 20) {
        setIsMobileBrandVisible(true);
      } else if (nextScrollTop > lastScrollTopRef.current) {
        setIsMobileBrandVisible(false);
      } else if (nextScrollTop < lastScrollTopRef.current) {
        setIsMobileBrandVisible(true);
      }

      lastScrollTopRef.current = nextScrollTop;
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;

      if (
        mobileMenuButtonRef.current?.contains(target) ||
        mobileMenuPanelRef.current?.contains(target)
      ) {
        return;
      }

      setIsMobileNavOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMobileNavOpen]);

  const openMegaNav = (href: string) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (href === "/posts" && postCategories.length > 0) {
      setHoveredPostCategorySlug(postCategories[0].slug);
    }

    if (href === "/updates" && updateCategories.length > 0) {
      setHoveredUpdateCategoryTag(updateCategories[0].tag);
    }

    setIsMegaNavOpen(true);
    setHighlightedHref(href);
  };

  const closeMegaNav = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = setTimeout(() => {
      setIsMegaNavOpen(false);
      setHighlightedHref(null);
      closeTimerRef.current = null;
    }, 120);
  };

  const handleMegaNavNavigate = () => {
    setIsMegaNavOpen(false);
    setHighlightedHref(null);
  };

  const activeItem =
    navItems.find((item) => isActivePath(pathname, item.href)) ?? navItems[0];
  const featuredItem =
    navItems.find((item) => item.href === highlightedHref) ?? activeItem;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 py-3 sm:px-6">
      <div
        className="pointer-events-none relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 transition-all duration-300 md:grid md:grid-cols-[1fr_auto_1fr] md:justify-normal sm:px-6"
      >
        <button
          ref={mobileMenuButtonRef}
          type="button"
          aria-label={isMobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileNavOpen}
          onClick={() => {
            if (isMobileNavOpen) {
              setIsMobileNavOpen(false);
              setExpandedMobileHref(null);
              return;
            }

            setIsMobileNavOpen(true);
            setExpandedMobileHref(activeItem.href);
          }}
          className={`pointer-events-auto inline-flex shrink-0 items-center justify-center px-3 py-1.5 text-zinc-700 transition dark:text-zinc-200 md:hidden ${
            isScrolled
              ? "rounded-2xl border border-zinc-200/80 bg-white/80 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-950/65 dark:backdrop-blur-xl dark:shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
              : "bg-transparent"
          }`}
        >
          {isMobileNavOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
        </button>
        <Link
          href="/"
          className={`absolute left-1/2 rounded-2xl px-3 py-1.5 text-lg font-semibold tracking-tight text-primary transition-[opacity,transform] duration-200 md:pointer-events-auto md:static md:translate-x-0 md:translate-y-0 md:justify-self-start md:opacity-100 ${
            isMobileBrandVisible
              ? "pointer-events-auto translate-x-[-50%] opacity-100"
              : "pointer-events-none translate-x-[-50%] -translate-y-2 opacity-0"
          } ${
            isScrolled
              ? "border border-transparent bg-transparent shadow-none md:border-zinc-200/80 md:bg-white/80 md:shadow-sm dark:md:border-zinc-800/70 dark:md:bg-zinc-950/65 dark:md:backdrop-blur-xl dark:md:shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
              : "border border-transparent bg-transparent"
          }`}
        >
          {siteConfig.name}
        </Link>

        <div
          ref={megaNavRef}
          className="pointer-events-auto relative hidden md:flex md:justify-center"
          onMouseLeave={closeMegaNav}
          onFocusCapture={() => {
            if (!highlightedHref) {
              openMegaNav(activeItem.href);
            }
          }}
          onBlurCapture={(event) => {
            if (!megaNavRef.current?.contains(event.relatedTarget as Node | null)) {
              closeMegaNav();
            }
          }}
        >
          <nav
            className={`items-center justify-center overflow-hidden rounded-full text-sm font-medium text-zinc-600 transition-all duration-300 dark:text-zinc-300 md:flex ${
              isScrolled
                ? "bg-white/80 shadow-sm dark:border dark:border-zinc-800/70 dark:bg-zinc-950/58 dark:backdrop-blur-xl dark:shadow-[0_18px_45px_rgba(0,0,0,0.34)]"
                : "bg-transparent"
            }`}
          >
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => openMegaNav(item.href)}
                  onFocus={() => openMegaNav(item.href)}
                  className={`relative flex items-center gap-2 overflow-hidden rounded-none px-4 py-2 transition-colors first:rounded-l-full last:rounded-r-full ${
                    active
                      ? "font-semibold text-primary"
                      : "text-zinc-600 hover:text-primary dark:text-zinc-300"
                  }`}
                >
                  {active && deferredIsScrolled ? (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-full border border-primary/25 bg-primary/10 shadow-sm dark:border-sky-300/15 dark:bg-sky-400/10 dark:shadow-[0_0_0_1px_rgba(125,211,252,0.05),0_12px_28px_rgba(2,6,23,0.42)]"
                      transition={{ type: "spring", stiffness: 500, damping: 32 }}
                    />
                  ) : null}

                  <span className="relative z-10 flex items-center justify-center">
                    <AnimatePresence initial={false}>
                      {active ? (
                        <motion.span
                          initial={{ width: 0, opacity: 0, scale: 0, marginRight: 0 }}
                          animate={{
                            width: "auto",
                            opacity: 1,
                            scale: 1,
                            marginRight: 8,
                          }}
                          exit={{ width: 0, opacity: 0, scale: 0, marginRight: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="flex items-center justify-center overflow-hidden"
                        >
                          <Icon className="h-4 w-4" />
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                    <span className="whitespace-nowrap">{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </nav>

          <AnimatePresence>
            {isMegaNavOpen ? (
              <>
                <div className="absolute left-0 right-0 top-full h-3" />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute left-1/2 top-[calc(100%+0.75rem)] z-50 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2"
                >
                  <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white/92 p-3 shadow-[0_20px_60px_rgba(24,24,27,0.14)] backdrop-blur-xl dark:border-zinc-800/70 dark:bg-[rgba(10,10,14,0.82)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.48)]">
                    {renderMegaNavContent(featuredItem.href, {
                      hoveredPostCategorySlug,
                      onHoverPostCategory: setHoveredPostCategorySlug,
                      hoveredUpdateCategoryTag,
                      onHoverUpdateCategory: setHoveredUpdateCategoryTag,
                      onNavigate: handleMegaNavNavigate,
                    })}
                  </div>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="pointer-events-auto flex shrink-0 items-center gap-2 md:justify-self-end">
          <div className="hidden md:block">
            <ThemeModeToggle isScrolled={isScrolled} />
          </div>
          <Link
            href="/admin"
            aria-label="Sign in"
            className={`inline-flex items-center justify-center rounded-2xl px-3 py-1.5 text-zinc-800 transition ${
              isScrolled
                ? "border border-zinc-200/80 bg-white/80 shadow-sm hover:border-primary/30 hover:text-primary dark:border-zinc-800/70 dark:bg-zinc-950/65 dark:text-zinc-200 dark:backdrop-blur-xl dark:shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
                : "border border-transparent bg-transparent hover:text-primary dark:text-zinc-200"
            }`}
          >
            <UserRound className="h-4.5 w-4.5" />
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {isMobileNavOpen ? (
          <motion.div
            ref={mobileMenuPanelRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pointer-events-auto mx-auto mt-2 w-full max-w-6xl px-1 md:hidden"
          >
            <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/92 p-3 shadow-[0_18px_50px_rgba(24,24,27,0.12)] backdrop-blur-xl dark:border-zinc-800/70 dark:bg-[rgba(10,10,14,0.84)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.44)]">
              <nav className="grid gap-2">
                {navItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = item.icon;
                  const expanded = expandedMobileHref === item.href;

                  return (
                    <div
                      key={item.href}
                      className={`rounded-[1.1rem] transition ${
                        active
                          ? "bg-primary/8 dark:bg-primary/15"
                          : "bg-zinc-50/80 dark:bg-zinc-900"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2 px-2 py-2 ${
                          active ? "text-primary" : "text-zinc-700 dark:text-zinc-200"
                        }`}
                      >
                        <Link
                          href={item.href}
                          onClick={() => {
                            setIsMobileNavOpen(false);
                            setExpandedMobileHref(null);
                          }}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-[0.95rem] px-1.5 py-1 transition hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            <Icon className="h-4 w-4" />
                          </div>
                          <p className="text-sm font-medium">{item.label}</p>
                        </Link>
                        <button
                          type="button"
                          aria-label={expanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                          onClick={() =>
                            setExpandedMobileHref((current) =>
                              current === item.href ? null : item.href,
                            )
                          }
                          className={`inline-flex h-9 min-w-11 shrink-0 items-center justify-center rounded-2xl border px-2 transition ${
                            active
                              ? "border-primary/20 bg-primary/10 text-primary dark:border-sky-300/20 dark:bg-sky-400/12 dark:text-sky-300"
                              : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                          }`}
                        >
                          <span className="inline-flex">
                            {expanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </span>
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {expanded ? (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="overflow-hidden"
                          >
                            <div className="px-3.5 pb-3">
                              {renderMobileNavContent(item.href, () =>
                                setIsMobileNavOpen(false),
                              )}
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </nav>
              <div className="mt-3">
                <ThemeModeToggle inline />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function renderMegaNavContent(
  href: string,
  options: {
    hoveredPostCategorySlug: string | null;
    onHoverPostCategory: (slug: string) => void;
    hoveredUpdateCategoryTag: string | null;
    onHoverUpdateCategory: (tag: string) => void;
    onNavigate: () => void;
  },
) {
  switch (href) {
    case "/":
      return (
        <MegaNavSection eyebrow="Overview">
          <div className="grid gap-2 sm:grid-cols-3">
            <MegaNavLinkCard href="/" title="此站点" eyebrow="Home" onNavigate={options.onNavigate} />
            <MegaNavLinkCard href="/more" title="自述" eyebrow="About" onNavigate={options.onNavigate} />
            <MegaNavLinkCard
              href="/message"
              title="留言"
              eyebrow="Message"
              onNavigate={options.onNavigate}
            />
          </div>
        </MegaNavSection>
      );
    case "/posts":
      return (
        <MegaNavSection eyebrow="Categories">
          <PostMegaNavContent
            hoveredPostCategorySlug={options.hoveredPostCategorySlug}
            onHoverPostCategory={options.onHoverPostCategory}
            onNavigate={options.onNavigate}
          />
        </MegaNavSection>
      );
    case "/updates":
      return (
        <MegaNavSection eyebrow="Categories">
          <UpdateMegaNavContent
            hoveredUpdateCategoryTag={options.hoveredUpdateCategoryTag}
            onHoverUpdateCategory={options.onHoverUpdateCategory}
            onNavigate={options.onNavigate}
          />
        </MegaNavSection>
      );
    case "/archives":
      return (
        <div className="grid gap-5 px-1 py-1">
          <div className="min-w-0">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
                Latest
              </p>
            </div>
            <div className="grid gap-1">
              {recentArchiveItems.map((item) => (
                <MegaNavRecentEntry
                  key={item.id}
                  href={item.href}
                  title={item.title}
                  categoryLabel={item.categoryLabel}
                  kind={item.kind}
                  dateValue={item.publishedAt}
                  onNavigate={options.onNavigate}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2 border-t border-zinc-200/70 pt-3 sm:grid-cols-2 dark:border-zinc-800/80">
            <MegaNavLinkCard
              href="/archives?type=posts"
              title="文章归档"
              eyebrow="Posts"
              onNavigate={options.onNavigate}
            />
            <MegaNavLinkCard
              href="/archives?type=updates"
              title="动态归档"
              eyebrow="Updates"
              onNavigate={options.onNavigate}
            />
          </div>
        </div>
      );
    case "/more":
      return (
        <MegaNavSection eyebrow="More">
          <div className="grid gap-2 sm:grid-cols-3">
            {morePlaceholders.map((item) => (
              <MegaNavLinkCard
                key={item.eyebrow}
                href="/more"
                title={item.title}
                eyebrow={item.eyebrow}
                onNavigate={options.onNavigate}
              />
            ))}
          </div>
        </MegaNavSection>
      );
    default:
      return null;
  }
}

function renderMobileNavContent(href: string, onNavigate: () => void) {
  switch (href) {
    case "/":
      return (
        <div className="flex flex-wrap gap-2">
          <MobileNavChip href="/" label="此站点" onNavigate={onNavigate} />
          <MobileNavChip href="/more" label="自述" onNavigate={onNavigate} />
          <MobileNavChip href="/message" label="留言" onNavigate={onNavigate} />
        </div>
      );
    case "/posts":
      return (
        <div className="flex flex-wrap gap-2">
          {postCategories.map((category) => (
            <MobileNavChip
              key={category.href}
              href={category.href}
              label={category.label}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      );
    case "/updates":
      return (
        <div className="flex flex-wrap gap-2">
          {updateCategories.map((category) => (
            <MobileNavChip
              key={category.href}
              href={category.href}
              label={category.label}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      );
    case "/archives":
      return (
        <div className="grid gap-2">
          {publishedPosts.slice(0, 3).map((post) => (
            <MobileNavSubLink
              key={post.id}
              href={`/posts/${post.slug}`}
              label={post.title}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      );
    case "/more":
      return (
        <div className="flex flex-wrap gap-2">
          {morePlaceholders.map((item) => (
            <span
              key={item.eyebrow}
              className="rounded-full border border-dashed border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
            >
              {item.title}
            </span>
          ))}
        </div>
      );
    default:
      return null;
  }
}

function MegaNavLinkCard({
  href,
  title,
  eyebrow,
  onNavigate,
}: {
  href: string;
  title: string;
  eyebrow: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="group rounded-[1rem] px-2 py-2.5 transition-colors duration-200 hover:bg-zinc-50/90 dark:hover:bg-zinc-900/70"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
            {eyebrow}
          </p>
          <span className="mt-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {title}
          </span>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center text-zinc-400 transition group-hover:text-primary dark:text-zinc-500 dark:group-hover:text-sky-300">
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function PostMegaNavContent({
  hoveredPostCategorySlug,
  onHoverPostCategory,
  onNavigate,
}: {
  hoveredPostCategorySlug: string | null;
  onHoverPostCategory: (slug: string) => void;
  onNavigate: () => void;
}) {
  const activeCategory =
    postCategories.find((category) => category.slug === hoveredPostCategorySlug) ??
    postCategories[0];

  if (!activeCategory) {
    return null;
  }

  return (
    <div className="grid gap-5 md:grid-cols-[10rem_minmax(0,1fr)]">
      <div className="grid gap-1">
        {postCategories.map((category) => {
          const active = category.slug === activeCategory.slug;

          return (
            <Link
              key={category.slug}
              href={category.href}
              onClick={onNavigate}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onHoverPostCategory(category.slug)}
              onFocus={() => onHoverPostCategory(category.slug)}
              className={`flex items-center justify-between rounded-[0.9rem] px-2 py-2 text-left transition-colors ${
                active
                  ? "bg-zinc-50 text-zinc-950 dark:bg-zinc-900/80 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-200"
              }`}
            >
              <span className="text-sm font-medium">{category.label}</span>
              <span className="text-[0.68rem] tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                {category.posts.length}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="min-w-0 border-l border-zinc-200/70 pl-4 dark:border-zinc-800/80">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
            {activeCategory.label}
          </p>
          <Link
            href={activeCategory.href}
            onClick={onNavigate}
            className="text-xs font-medium text-zinc-500 transition hover:text-primary dark:text-zinc-400 dark:hover:text-sky-300"
          >
            View all
          </Link>
        </div>
        <div className="grid gap-1">
          {activeCategory.posts.map((post) => (
            <MegaNavArticleLink
              key={post.id}
              href={`/posts/${post.slug}`}
              title={post.title}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function UpdateMegaNavContent({
  hoveredUpdateCategoryTag,
  onHoverUpdateCategory,
  onNavigate,
}: {
  hoveredUpdateCategoryTag: string | null;
  onHoverUpdateCategory: (tag: string) => void;
  onNavigate: () => void;
}) {
  const activeCategory =
    updateCategories.find((category) => category.tag === hoveredUpdateCategoryTag) ??
    updateCategories[0];

  if (!activeCategory) {
    return null;
  }

  return (
    <div className="grid gap-5 md:grid-cols-[10rem_minmax(0,1fr)]">
      <div className="grid gap-1">
        {updateCategories.map((category) => {
          const active = category.tag === activeCategory.tag;

          return (
            <button
              key={category.tag}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onHoverUpdateCategory(category.tag)}
              onFocus={() => onHoverUpdateCategory(category.tag)}
              className={`flex items-center justify-between rounded-[0.9rem] px-2 py-2 text-left transition-colors ${
                active
                  ? "bg-zinc-50 text-zinc-950 dark:bg-zinc-900/80 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-200"
              }`}
            >
              <span className="text-sm font-medium">{category.label}</span>
              <span className="text-[0.68rem] tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                {category.items.length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-w-0 border-l border-zinc-200/70 pl-4 dark:border-zinc-800/80">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
            {activeCategory.label}
          </p>
          <Link
            href={activeCategory.href}
            onClick={onNavigate}
            className="text-xs font-medium text-zinc-500 transition hover:text-primary dark:text-zinc-400 dark:hover:text-sky-300"
          >
            View all
          </Link>
        </div>
        <div className="grid gap-1">
          {activeCategory.items.map((item) => (
            <MegaNavArticleLink
              key={item}
              href={activeCategory.href}
              title={item}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MegaNavSection({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section className="px-1 py-1">
      <p className="mb-2.5 text-[0.68rem] uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
        {eyebrow}
      </p>
      {children}
    </section>
  );
}

function MegaNavArticleLink({
  href,
  title,
  onNavigate,
}: {
  href: string;
  title: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="group flex items-center justify-between gap-3 rounded-[0.95rem] px-2 py-2 transition-colors duration-200 hover:bg-zinc-50/90 hover:text-primary dark:hover:bg-zinc-900/70 dark:hover:text-sky-300"
    >
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
      <ArrowRight className="h-3.5 w-3.5 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-primary dark:text-zinc-500 dark:group-hover:text-sky-300" />
    </Link>
  );
}

function MegaNavArchiveEntry({
  href,
  title,
  meta,
  dateValue,
  onNavigate,
}: {
  href: string;
  title: string;
  meta: string;
  dateValue?: string | null;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="group grid grid-cols-[5.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[0.95rem] px-2 py-2 transition-colors duration-200 hover:bg-zinc-50/90 dark:hover:bg-zinc-900/70"
    >
      <span className="text-xs font-medium tracking-[0.08em] text-zinc-400 dark:text-zinc-500">
        {dateValue ? <RelativeDate value={dateValue} /> : meta}
      </span>
      <span className="truncate text-sm font-medium text-zinc-900 transition group-hover:text-primary dark:text-zinc-100 dark:group-hover:text-sky-300">
        {title}
      </span>
      <ArrowRight className="h-3.5 w-3.5 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-primary dark:text-zinc-500 dark:group-hover:text-sky-300" />
    </Link>
  );
}

function MegaNavRecentEntry({
  href,
  title,
  categoryLabel,
  kind,
  dateValue,
  onNavigate,
}: {
  href: string;
  title: string;
  categoryLabel: string;
  kind: "文章" | "动态";
  dateValue: string | null;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="group rounded-[0.95rem] px-2 py-2 transition-colors duration-200 hover:bg-zinc-50/90 dark:hover:bg-zinc-900/70"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.68rem] font-medium tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
          {kind}
        </span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          <RelativeDate value={dateValue} />
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-zinc-900 transition group-hover:text-primary dark:text-zinc-100 dark:group-hover:text-sky-300">
        {title}
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{categoryLabel}</p>
    </Link>
  );
}

function MobileNavSubLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="inline-flex items-center gap-1.5 px-1 py-1 text-sm font-medium text-zinc-700 transition hover:text-primary dark:text-zinc-200 dark:hover:text-sky-300"
    >
      <span>{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
    </Link>
  );
}

function MobileNavChip({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="inline-flex items-center gap-1.5 px-1 py-1 text-sm font-medium text-zinc-700 transition hover:text-primary dark:text-zinc-200 dark:hover:text-sky-300"
    >
      <span>{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
    </Link>
  );
}
