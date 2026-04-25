"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenText,
  ChevronDown,
  ChevronUp,
  Compass,
  FileArchive,
  GalleryVerticalEnd,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Sparkles,
  X,
} from "lucide-react";
import { AdminLoginDialog } from "@/components/admin-login-dialog";
import { logoutAction } from "@/app/(admin)/admin/login/actions";
import { createClient } from "@/lib/supabase/browser";
import { HeaderNav } from "@/components/header-nav";
import { RelativeDate } from "@/components/relative-date";
import { ThemeModeToggle } from "@/components/theme-mode-toggle";

const navItems = [
  {
    href: "/",
    label: "起点",
    icon: Compass,
    description: "Start with a quick introduction and the overall tone of the site.",
  },
  {
    href: "/posts",
    label: "篇章",
    icon: BookOpenText,
    description: "Longer writing on products, technology, and personal expression.",
  },
  {
    href: "/updates",
    label: "足迹",
    icon: Sparkles,
    description: "Short updates, experiments, and notes from ongoing work.",
  },
  {
    href: "/timeline",
    label: "拾光",
    icon: FileArchive,
    description: "Browse everything by time and revisit older pieces in one place.",
  },
  {
    href: "/more",
    label: "远方",
    icon: GalleryVerticalEnd,
    description: "A softer space for side pages, collections, and future ideas.",
  },
];

export type SiteHeaderPostCategory = {
  slug: string;
  label: string;
  href: string;
  contentCount: number;
  posts: Array<{
    id: string | number;
    slug: string;
    title: string;
    href: string;
  }>;
};

export type SiteHeaderRecentArchiveItem = {
  id: string | number;
  href: string;
  title: string;
  categoryLabel: string;
  publishedAt: string | null;
  kind: "文章" | "动态";
};

const morePlaceholders = [
  { eyebrow: "Projects", title: "项目" },
  { eyebrow: "Friends", title: "友链" },
  { eyebrow: "Reviews", title: "品鉴" },
  { eyebrow: "Bookmarks", title: "书签" },
];

type SiteHeaderProps = {
  siteName: string;
  adminDisplayName: string;
  adminAvatarUrl?: string | null;
  postCategories: SiteHeaderPostCategory[];
  recentArchiveItems: SiteHeaderRecentArchiveItem[];
  recentUpdateItems: SiteHeaderRecentArchiveItem[];
};

export function SiteHeader({
  siteName,
  adminDisplayName,
  adminAvatarUrl,
  postCategories,
  recentArchiveItems,
  recentUpdateItems,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [stickyProgress, setStickyProgress] = useState(0);
  const [isMobileBrandVisible, setIsMobileBrandVisible] = useState(true);
  const [isMegaNavOpen, setIsMegaNavOpen] = useState(false);
  const [highlightedHref, setHighlightedHref] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [expandedMobileHref, setExpandedMobileHref] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [hoveredPostCategorySlug, setHoveredPostCategorySlug] = useState<string | null>(
    postCategories[0]?.slug ?? null,
  );
  const megaNavRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldRestoreStickyOffsetRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const deferredIsScrolled = useDeferredValue(isScrolled);
  const STICKY_SCROLL_OFFSET = 24;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("admin_profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => setIsAdminLoggedIn(!!data));
    });
  }, []);

  useEffect(() => {
    const getScrollTop = () =>
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    const handleScroll = () => {
      const nextScrollTop = getScrollTop();
      const nextStickyProgress = Math.min(Math.max(nextScrollTop / 20, 0), 1);

      setIsScrolled(nextScrollTop > 20);
      setStickyProgress(Number(nextStickyProgress.toFixed(3)));

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
    if (!shouldRestoreStickyOffsetRef.current) {
      return;
    }

    shouldRestoreStickyOffsetRef.current = false;

    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: STICKY_SCROLL_OFFSET,
        behavior: "auto",
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [pathname]);

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

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;

      if (userMenuRef.current?.contains(target)) {
        return;
      }

      setIsUserMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isUserMenuOpen]);

  const openMegaNav = (href: string) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (href === "/posts" && postCategories.length > 0) {
      setHoveredPostCategorySlug(postCategories[0].slug);
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
  const isAdminLoginOpen = searchParams.get("admin-login") === "1";
  const adminLoginNext = getSafeAdminPath(searchParams.get("next")) ?? "/admin";
  const topStateWeight = 1 - stickyProgress;
  const headerTranslateY = topStateWeight * 4;
  const desktopHeaderTranslateY = topStateWeight * 10;
  const brandScale = 1 + topStateWeight * 0.08;

  const openAdminLogin = (next = "/admin") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("admin-login", "1");
    params.set("next", getSafeAdminPath(next) ?? "/admin");
    setIsMobileNavOpen(false);
    setExpandedMobileHref(null);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const closeAdminLogin = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("admin-login");
    params.delete("next");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const preserveStickyOnNextNavigation = () => {
    if (window.scrollY > STICKY_SCROLL_OFFSET) {
      shouldRestoreStickyOffsetRef.current = true;
    }
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 py-3 sm:px-6">
      <div
        className="pointer-events-none relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] md:grid md:grid-cols-[1fr_auto_1fr] md:justify-normal sm:px-6"
        style={
          {
            "--site-header-brand-scale": brandScale,
            transform: `translateY(${headerTranslateY}px)`,
          } as CSSProperties
        }
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
          scroll={false}
          onClick={preserveStickyOnNextNavigation}
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
          <span className="inline-block origin-left transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] md:scale-[var(--site-header-brand-scale)]">
            {siteName}
          </span>
        </Link>

        <div
          ref={megaNavRef}
          className="pointer-events-auto relative hidden transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] md:flex md:justify-center"
          style={{ transform: `translateY(${desktopHeaderTranslateY}px)` }}
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
          <HeaderNav
            pathname={pathname}
            isScrolled={isScrolled}
            deferredIsScrolled={deferredIsScrolled}
            items={navItems}
            layoutId="nav-indicator"
            className="md:flex"
            preserveStickyOnNavigate
            onNavigate={preserveStickyOnNextNavigation}
            onItemEnter={openMegaNav}
            onItemFocus={openMegaNav}
            isActivePath={isActivePath}
          />

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
                      postCategories,
                      recentArchiveItems,
                      recentUpdateItems,
                      hoveredPostCategorySlug,
                      onHoverPostCategory: setHoveredPostCategorySlug,
                      onNavigate: handleMegaNavNavigate,
                    })}
                  </div>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>
        </div>

        <div
          className="pointer-events-auto flex shrink-0 items-center gap-2 transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] md:justify-self-end"
          style={{ transform: `translateY(${desktopHeaderTranslateY}px)` }}
        >
          <div className="hidden md:block">
            <ThemeModeToggle isScrolled={isScrolled} />
          </div>
          {isAdminLoggedIn ? (
            <div
              ref={userMenuRef}
              className="relative"
              onMouseEnter={() => setIsUserMenuOpen(true)}
              onMouseLeave={() => setIsUserMenuOpen(false)}
            >
              <button
                type="button"
                aria-label={`${adminDisplayName} menu`}
                aria-expanded={isUserMenuOpen}
                onClick={() => setIsUserMenuOpen((current) => !current)}
                onFocus={() => setIsUserMenuOpen(true)}
                className={`inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-zinc-800 transition ${
                  isScrolled
                    ? "border border-zinc-200/80 bg-white/80 shadow-sm hover:border-primary/30 dark:border-zinc-800/70 dark:bg-zinc-950/65 dark:text-zinc-200 dark:backdrop-blur-xl dark:shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
                    : "border border-transparent bg-transparent dark:text-zinc-200"
                }`}
              >
                <HeaderUserAvatar author={adminDisplayName} src={adminAvatarUrl} />
              </button>

              <AnimatePresence>
                {isUserMenuOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="absolute right-0 top-full z-50 w-36 pt-2.5 sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
                  >
                    <div
                      aria-hidden="true"
                      className="absolute right-0 top-0 h-2.5 w-36 sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
                    />
                    <div className="rounded-[1.2rem] border border-zinc-200/80 bg-white/92 p-2 shadow-[0_18px_50px_rgba(24,24,27,0.14)] backdrop-blur-xl dark:border-zinc-800/70 dark:bg-[rgba(10,10,14,0.84)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.44)]">
                      <Link
                        href="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-[0.95rem] px-3 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50"
                      >
                        <LayoutDashboard className="h-4 w-4 shrink-0" />
                        <span>控制面板</span>
                      </Link>
                      <form action={logoutAction}>
                        <button
                          type="submit"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex w-full items-center gap-3 rounded-[0.95rem] px-3 py-2.5 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50"
                        >
                          <LogOut className="h-4 w-4 shrink-0" />
                          <span>退出登录</span>
                        </button>
                      </form>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              href={adminLoginNext}
              aria-label="Open admin login"
              onClick={(event) => {
                event.preventDefault();
                openAdminLogin(adminLoginNext);
              }}
              className={`inline-flex items-center justify-center rounded-2xl px-3 py-1.5 text-zinc-800 transition ${
                isScrolled
                  ? "border border-zinc-200/80 bg-white/80 shadow-sm hover:border-primary/30 hover:text-primary dark:border-zinc-800/70 dark:bg-zinc-950/65 dark:text-zinc-200 dark:backdrop-blur-xl dark:shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
                  : "border border-transparent bg-transparent hover:text-primary dark:text-zinc-200"
              }`}
            >
              <LogIn className="h-4.5 w-4.5" />
            </Link>
          )}
        </div>
      </div>

      <AdminLoginDialog
        isOpen={isAdminLoginOpen}
        next={adminLoginNext}
        onClose={closeAdminLogin}
      />

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
                  const canExpand = item.href === "/" || item.href === "/posts" || item.href === "/more";

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
                          scroll={false}
                          onClick={() => {
                            preserveStickyOnNextNavigation();
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
                        {canExpand ? (
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
                                ? "border-primary/20 bg-primary/10 text-primary"
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
                        ) : null}
                      </div>

                      <AnimatePresence initial={false}>
                        {canExpand && expanded ? (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="overflow-hidden"
                          >
                            <div className="px-3.5 pb-3">
                              {renderMobileNavContent(
                                item.href,
                                {
                                  postCategories,
                                  recentArchiveItems,
                                  recentUpdateItems,
                                },
                                () => setIsMobileNavOpen(false),
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

function HeaderUserAvatar({ author, src }: { author: string; src?: string | null }) {
  const initial = author.trim().charAt(0).toUpperCase() || "?";

  if (!src) {
    return (
      <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-200 via-zinc-100 to-white text-sm font-semibold text-zinc-500 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-950 dark:text-zinc-300">
        <span aria-hidden="true">{initial}</span>
        <span className="sr-only">{author} avatar placeholder</span>
      </span>
    );
  }

  return (
    <>
      <Image
        src={src}
        alt={`${author} avatar`}
        width={40}
        height={40}
        className="h-full w-full object-cover"
      />
      <span className="sr-only">{author}</span>
    </>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getSafeAdminPath(value: string | null) {
  if (!value || !value.startsWith("/admin")) {
    return null;
  }

  return value;
}

function renderMegaNavContent(
  href: string,
  options: {
    postCategories: SiteHeaderPostCategory[];
    recentArchiveItems: SiteHeaderRecentArchiveItem[];
    recentUpdateItems: SiteHeaderRecentArchiveItem[];
    hoveredPostCategorySlug: string | null;
    onHoverPostCategory: (slug: string) => void;
    onNavigate: () => void;
  },
) {
  switch (href) {
    case "/":
      return (
        <MegaNavSection eyebrow="Home">
          <div className="grid gap-2 sm:grid-cols-3">
            <MegaNavLinkCard href="/" title="起点" eyebrow="Home" onNavigate={options.onNavigate} />
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
        <MegaNavSection eyebrow="Posts">
          <PostMegaNavContent
            postCategories={options.postCategories}
            hoveredPostCategorySlug={options.hoveredPostCategorySlug}
            onHoverPostCategory={options.onHoverPostCategory}
            onNavigate={options.onNavigate}
          />
        </MegaNavSection>
      );
    case "/updates":
      return (
        <MegaNavSection eyebrow="Updates">
          <UpdateMegaNavContent recentUpdateItems={options.recentUpdateItems} onNavigate={options.onNavigate} />
        </MegaNavSection>
      );
    case "/timeline":
      return (
        <div className="grid gap-5 px-1 py-1">
          <div className="min-w-0">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
                timeline
              </p>
            </div>
            <div className="grid gap-1">
              {options.recentArchiveItems.map((item) => (
                <MegaNavRecentEntry
                  key={`${item.kind}-${item.id}`}
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
              href="/timeline?type=posts"
              title="篇章"
              eyebrow="Posts"
              onNavigate={options.onNavigate}
            />
            <MegaNavLinkCard
              href="/timeline?type=updates"
              title="足迹"
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

function renderMobileNavContent(
  href: string,
  navigationData: {
    postCategories: SiteHeaderPostCategory[];
    recentArchiveItems: SiteHeaderRecentArchiveItem[];
    recentUpdateItems: SiteHeaderRecentArchiveItem[];
  },
  onNavigate: () => void,
) {
  switch (href) {
    case "/":
      return (
        <div className="flex flex-wrap gap-2">
          <MobileNavChip href="/" label="起点" onNavigate={onNavigate} />
          <MobileNavChip href="/more" label="自述" onNavigate={onNavigate} />
          <MobileNavChip href="/message" label="留言" onNavigate={onNavigate} />
        </div>
      );
    case "/posts":
      return (
        <div className="flex flex-wrap gap-2">
          {navigationData.postCategories.length > 0 ? (
            navigationData.postCategories.map((category) => (
              <MobileNavChip
                key={category.href}
                href={category.href}
                label={category.label}
                onNavigate={onNavigate}
              />
            ))
          ) : (
            <MobileNavEmptyState text="No posts yet." />
          )}
        </div>
      );
    case "/updates":
      return navigationData.recentUpdateItems.length > 0 ? (
        <MobileNavSubLink href="/updates" label="最新动态" onNavigate={onNavigate} />
      ) : (
        <MobileNavEmptyState text="No updates yet." />
      );
    case "/timeline":
      return (
        <div className="grid gap-2">
          {navigationData.recentArchiveItems.slice(0, 3).map((item) => (
            <MobileNavSubLink
              key={item.id}
              href={item.href}
              label={item.title}
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
        <span className="inline-flex h-8 w-8 items-center justify-center text-zinc-400 transition group-hover:text-primary dark:text-zinc-500">
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function PostMegaNavContent({
  postCategories,
  hoveredPostCategorySlug,
  onHoverPostCategory,
  onNavigate,
}: {
  postCategories: SiteHeaderPostCategory[];
  hoveredPostCategorySlug: string | null;
  onHoverPostCategory: (slug: string) => void;
  onNavigate: () => void;
}) {
  const activeCategory =
    postCategories.find((category) => category.slug === hoveredPostCategorySlug) ??
    postCategories[0];

  if (!activeCategory) {
    return <MegaNavEmptyState text="No posts yet." />;
  }

  return (
    <motion.div layout className="grid items-start gap-5 md:grid-cols-[9rem_minmax(0,1fr)]">
      <div className="grid items-start gap-1">
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
              className={`flex items-center justify-between rounded-[0.8rem] px-2 py-1.5 text-left text-[0.78rem] transition-colors ${
                active
                  ? "bg-zinc-50 text-zinc-950 dark:bg-zinc-900/80 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-200"
              }`}
            >
              <span className="font-medium">{category.label}</span>
              <span className="text-[0.64rem] tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                {category.contentCount}
              </span>
            </Link>
          );
        })}
      </div>

      <motion.div layout className="min-w-0 self-start border-l border-zinc-200/70 pl-4 dark:border-zinc-800/80">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
            {activeCategory.label}
          </p>
          <Link
            href={activeCategory.href}
            onClick={onNavigate}
            className="text-xs font-medium text-zinc-500 transition hover:text-primary dark:text-zinc-400"
          >
            View all
          </Link>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeCategory.slug}
            layout
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="grid gap-1"
          >
            {activeCategory.posts.length > 0 ? (
              activeCategory.posts.map((post) => (
                <MegaNavArticleLink
                  key={post.id}
                  href={post.href}
                  title={post.title}
                  onNavigate={onNavigate}
                />
              ))
            ) : (
              <MegaNavEmptyState text="No posts in this category." />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function UpdateMegaNavContent({
  recentUpdateItems,
  onNavigate,
}: {
  recentUpdateItems: SiteHeaderRecentArchiveItem[];
  onNavigate: () => void;
}) {
  return (
    <motion.div layout className="min-w-0 self-start">
      <div className="grid gap-1">
        {recentUpdateItems.length > 0 ? (
          recentUpdateItems.map((item) => (
            <MegaNavRecentEntry
              key={`${item.kind}-${item.id}`}
              href={item.href}
              title={item.title}
              dateValue={item.publishedAt}
              compact
              onNavigate={onNavigate}
            />
          ))
        ) : (
          <MegaNavEmptyState text="No updates yet." />
        )}
      </div>
    </motion.div>
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
      className="group flex items-center justify-between gap-3 rounded-[0.95rem] px-2 py-2 transition-colors duration-200 hover:bg-zinc-50/90 hover:text-primary dark:hover:bg-zinc-900/70"
    >
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
      <ArrowRight className="h-3.5 w-3.5 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-primary dark:text-zinc-500" />
    </Link>
  );
}

function MegaNavEmptyState({ text }: { text: string }) {
  return (
    <div className="px-1 py-1 text-sm text-zinc-400 dark:text-zinc-500">
      {text}
    </div>
  );
}

function MobileNavEmptyState({ text }: { text: string }) {
  return (
    <div className="px-1 py-1 text-sm text-zinc-400 dark:text-zinc-500">
      {text}
    </div>
  );
}

function MegaNavRecentEntry({
  href,
  title,
  categoryLabel,
  kind,
  dateValue,
  compact = false,
  onNavigate,
}: {
  href: string;
  title: string;
  categoryLabel?: string;
  kind?: "文章" | "动态";
  dateValue: string | null;
  compact?: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="group rounded-[0.95rem] px-2 py-2 transition-colors duration-200 hover:bg-zinc-50/90 dark:hover:bg-zinc-900/70"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {!compact && kind ? (
            <span className="text-[0.68rem] font-medium tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
              {kind}
            </span>
          ) : null}
          <p className={`${compact ? "text-sm" : "mt-1 text-sm"} font-medium text-zinc-900 transition group-hover:text-primary dark:text-zinc-100`}>
            {title}
          </p>
        </div>
        <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
          <RelativeDate value={dateValue} />
        </span>
      </div>
      {!compact && categoryLabel ? (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{categoryLabel}</p>
      ) : null}
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
      className="inline-flex items-center gap-1.5 px-1 py-1 text-sm font-medium text-zinc-700 transition hover:text-primary dark:text-zinc-200"
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
      className="inline-flex items-center gap-1.5 px-1 py-1 text-sm font-medium text-zinc-700 transition hover:text-primary dark:text-zinc-200"
    >
      <span>{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
    </Link>
  );
}
