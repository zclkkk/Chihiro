"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookPen,
  Settings2,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/(admin)/admin/login/actions";
import { ADMIN_NAV_ITEMS } from "@/app/(admin)/admin/utils";
import { HeaderNav } from "@/components/header-nav";
import { ThemeModeToggle } from "@/components/theme-mode-toggle";
import { siteConfig } from "@/lib/site";

const adminNavMeta: Record<
  string,
  {
    icon: LucideIcon;
  }
> = {
  "/admin": {
    icon: LayoutDashboard,
  },
  "/admin/workbench": {
    icon: NotebookPen,
  },
  "/admin/settings": {
    icon: Settings2,
  },
};

export function AdminHeader() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileBrandVisible, setIsMobileBrandVisible] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuPanelRef = useRef<HTMLDivElement | null>(null);
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

      if (nextScrollTop <= 20 || isMobileNavOpen) {
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
  }, [isMobileNavOpen]);

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

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 py-3 sm:px-6">
      <div className="pointer-events-none relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 transition-all duration-300 md:grid md:grid-cols-[1fr_auto_1fr] md:justify-normal sm:px-6">
        <button
          ref={mobileMenuButtonRef}
          type="button"
          aria-label={isMobileNavOpen ? "Close admin navigation" : "Open admin navigation"}
          aria-expanded={isMobileNavOpen}
          onClick={() => setIsMobileNavOpen((current) => !current)}
          className={`pointer-events-auto inline-flex shrink-0 items-center justify-center px-3 py-1.5 text-zinc-700 transition dark:text-zinc-200 md:hidden ${
            isLoginPage
              ? "invisible"
              : isScrolled
              ? "rounded-2xl border border-zinc-200/80 bg-white/80 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-950/65 dark:backdrop-blur-xl dark:shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
              : "bg-transparent"
          }`}
        >
          {isMobileNavOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
        </button>

        <Link
          href="/admin"
          className={`absolute left-1/2 inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 text-lg font-semibold tracking-tight text-primary transition-[opacity,transform] duration-200 md:pointer-events-auto md:static md:translate-x-0 md:translate-y-0 md:justify-self-start md:opacity-100 ${
            isMobileNavOpen || isMobileBrandVisible
              ? "pointer-events-auto translate-x-[-50%] opacity-100"
              : "pointer-events-none translate-x-[-50%] -translate-y-2 opacity-0"
          } ${
            isScrolled
              ? "border border-transparent bg-transparent shadow-none md:border-zinc-200/80 md:bg-white/80 md:shadow-sm dark:md:border-zinc-800/70 dark:md:bg-zinc-950/65 dark:md:backdrop-blur-xl dark:md:shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
              : "border border-transparent bg-transparent"
          }`}
        >
          <span>{siteConfig.name}</span>
          <span className="hidden rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-[0.22em] text-primary dark:border-sky-300/20 dark:bg-sky-400/12 dark:text-sky-300 md:inline-flex">
            Admin
          </span>
        </Link>

        {isLoginPage ? (
          <div className="hidden md:block" />
        ) : (
          <HeaderNav
            pathname={pathname}
            isScrolled={isScrolled}
            deferredIsScrolled={deferredIsScrolled}
            items={ADMIN_NAV_ITEMS.map((item) => ({
              ...item,
              icon: adminNavMeta[item.href].icon,
            }))}
            layoutId="admin-nav-indicator"
            className="pointer-events-auto hidden md:flex md:justify-self-center"
            isActivePath={isActiveAdminPath}
          />
        )}

        <div className="pointer-events-auto flex shrink-0 items-center gap-2 md:justify-self-end">
          <div className="hidden md:block">
            <ThemeModeToggle isScrolled={isScrolled} />
          </div>
          <Link
            href="/"
            aria-label="View site"
            className={`inline-flex items-center justify-center rounded-2xl px-3 py-1.5 text-zinc-800 transition ${
              isScrolled
                ? "border border-zinc-200/80 bg-white/80 shadow-sm hover:border-primary/30 hover:text-primary dark:border-zinc-800/70 dark:bg-zinc-950/65 dark:text-zinc-200 dark:backdrop-blur-xl dark:shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
                : "border border-transparent bg-transparent hover:text-primary dark:text-zinc-200"
            }`}
          >
            <House className="h-4.5 w-4.5" />
          </Link>
          {!isLoginPage ? (
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Sign out"
                className={`inline-flex items-center justify-center rounded-2xl px-3 py-1.5 text-zinc-800 transition ${
                  isScrolled
                    ? "border border-zinc-200/80 bg-white/80 shadow-sm hover:border-primary/30 hover:text-primary dark:border-zinc-800/70 dark:bg-zinc-950/65 dark:text-zinc-200 dark:backdrop-blur-xl dark:shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
                    : "border border-transparent bg-transparent hover:text-primary dark:text-zinc-200"
                }`}
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {isMobileNavOpen && !isLoginPage ? (
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
                {ADMIN_NAV_ITEMS.map((item) => {
                  const isActive = isActiveAdminPath(pathname, item.href);
                  const { icon: Icon } = adminNavMeta[item.href];

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileNavOpen(false)}
                      className={`flex items-center gap-3 rounded-[1.1rem] px-3 py-3 transition ${
                        isActive
                          ? "bg-primary/8 text-primary dark:bg-primary/15"
                          : "bg-zinc-50/80 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-600 shadow-sm dark:bg-zinc-800 dark:text-zinc-300">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="min-w-0 flex-1 text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-3 grid gap-3">
                <ThemeModeToggle inline />
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center rounded-[1.1rem] border border-zinc-200/80 bg-zinc-50/80 px-4 py-3 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-900 dark:border-zinc-800/80 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-950/80 dark:hover:text-zinc-100"
                  >
                    退出登录
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function isActiveAdminPath(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
}
