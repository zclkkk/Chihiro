"use client";

import { AnimatePresence, motion, type MotionProps } from "framer-motion";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type HeaderNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type HeaderNavProps = {
  pathname: string;
  isScrolled: boolean;
  deferredIsScrolled: boolean;
  items: HeaderNavItem[];
  layoutId: string;
  className?: string;
  onItemEnter?: (href: string) => void;
  onItemFocus?: (href: string) => void;
  isActivePath: (pathname: string, href: string) => boolean;
};

const indicatorMotion: MotionProps = {
  transition: { type: "spring", stiffness: 500, damping: 32 },
};

const iconMotion: MotionProps = {
  initial: { width: 0, opacity: 0, scale: 0, marginRight: 0 },
  animate: {
    width: "auto",
    opacity: 1,
    scale: 1,
    marginRight: 8,
  },
  exit: { width: 0, opacity: 0, scale: 0, marginRight: 0 },
  transition: { type: "spring", stiffness: 500, damping: 30 },
};

export function HeaderNav({
  pathname,
  isScrolled,
  deferredIsScrolled,
  items,
  layoutId,
  className,
  onItemEnter,
  onItemFocus,
  isActivePath,
}: HeaderNavProps) {
  return (
    <nav
      className={[
        "items-center justify-center overflow-hidden rounded-full text-sm font-medium text-zinc-600 transition-all duration-300 dark:text-zinc-300 md:flex",
        isScrolled
          ? "bg-white/80 shadow-sm dark:border dark:border-zinc-800/70 dark:bg-zinc-950/58 dark:backdrop-blur-xl dark:shadow-[0_18px_45px_rgba(0,0,0,0.34)]"
          : "bg-transparent",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onMouseEnter={onItemEnter ? () => onItemEnter(item.href) : undefined}
            onFocus={onItemFocus ? () => onItemFocus(item.href) : undefined}
            className={`relative flex items-center gap-2 overflow-hidden rounded-none px-4 py-2 transition-colors first:rounded-l-full last:rounded-r-full ${
              active
                ? "font-semibold text-primary"
                : "text-zinc-600 hover:text-primary dark:text-zinc-300"
            }`}
          >
            {active && deferredIsScrolled ? (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full border border-primary/25 bg-primary/10 shadow-sm dark:border-sky-300/15 dark:bg-sky-400/10 dark:shadow-[0_0_0_1px_rgba(125,211,252,0.05),0_12px_28px_rgba(2,6,23,0.42)]"
                {...indicatorMotion}
              />
            ) : null}

            <span className="relative z-10 flex items-center justify-center">
              <AnimatePresence initial={false}>
                {active ? (
                  <motion.span
                    {...iconMotion}
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
  );
}
