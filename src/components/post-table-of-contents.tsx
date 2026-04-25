"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { ArrowUpIcon, CheckIcon } from "lucide-react";
import type { TableOfContentsItem } from "@/lib/content";

type TableOfContentsSection = {
  heading: TableOfContentsItem;
  children: TableOfContentsItem[];
};

const MAX_VISIBLE_SECTIONS = 3;
const MAX_VISIBLE_CHILDREN = 3;
const READING_PROGRESS_ROOT_SELECTOR = "[data-reading-progress-root]";

type VisibleTocWindow<T> = {
  hasHiddenBefore: boolean;
  hasHiddenAfter: boolean;
  items: T[];
};

export function PostTableOfContents({ items }: { items: TableOfContentsItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const [readingProgress, setReadingProgress] = useState(0);
  const [isReadingComplete, setIsReadingComplete] = useState(false);
  const [showReadingCompleteCheck, setShowReadingCompleteCheck] = useState(false);
  const [hideReadingProgressLabel, setHideReadingProgressLabel] = useState(false);
  const [hideReadingProgressCircle, setHideReadingProgressCircle] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const activeIndicatorRef = useRef<HTMLSpanElement | null>(null);

  const sections = useMemo<TableOfContentsSection[]>(() => {
    const result: TableOfContentsSection[] = [];
    let current: TableOfContentsSection | null = null;

    for (const item of items) {
      if (item.level === 2 || current === null) {
        current = { heading: item, children: [] };
        result.push(current);
      } else {
        current.children.push(item);
      }
    }

    return result;
  }, [items]);

  const activeSectionId = useMemo(() => {
    for (const section of sections) {
      if (
        section.heading.id === activeId ||
        section.children.some((child) => child.id === activeId)
      ) {
        return section.heading.id;
      }
    }
    return sections[0]?.heading.id ?? "";
  }, [sections, activeId]);

  const visibleSections = useMemo(() => {
    const activeSectionIndex = sections.findIndex(
      (section) => section.heading.id === activeSectionId,
    );

    return getVisibleTocWindow(sections, activeSectionIndex, MAX_VISIBLE_SECTIONS);
  }, [sections, activeSectionId]);

  const updateActiveIndicator = useCallback(() => {
    const nav = navRef.current;
    const activeIndicator = activeIndicatorRef.current;

    if (!nav || !activeIndicator || !activeId) {
      return;
    }

    const activeSectionLink = nav.querySelector<HTMLElement>(
      `[data-toc-id="${CSS.escape(activeSectionId)}"]`,
    );
    const activeLink = nav.querySelector<HTMLElement>(
      `[data-toc-id="${CSS.escape(activeId)}"]`,
    );

    if (!activeSectionLink || !activeLink) {
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const activeSectionLinkRect = activeSectionLink.getBoundingClientRect();
    const activeLinkRect = activeLink.getBoundingClientRect();
    const indicatorHeight = Math.min(20, Math.max(14, activeLinkRect.height - 10));
    const top =
      activeSectionLinkRect.top -
      navRect.top +
      (activeSectionLinkRect.height - indicatorHeight) / 2;
    const activeLinkCenter = activeLinkRect.top - navRect.top + activeLinkRect.height / 2;
    const height = activeLinkCenter - top + indicatorHeight / 2;

    activeIndicator.style.height = `${height}px`;
    activeIndicator.style.opacity = "1";
    activeIndicator.style.transform = `translateY(${top}px)`;
  }, [activeId, activeSectionId]);

  useLayoutEffect(() => {
    updateActiveIndicator();
  }, [updateActiveIndicator, visibleSections]);

  useEffect(() => {
    let animationFrame = 0;
    const timeoutIds: number[] = [];
    const settleDelays = [40, 120, 220, 320];

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateActiveIndicator);
    };

    scheduleUpdate();

    for (const delay of settleDelays) {
      timeoutIds.push(window.setTimeout(scheduleUpdate, delay));
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      for (const timeoutId of timeoutIds) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [activeId, updateActiveIndicator, visibleSections]);

  useEffect(() => {
    const nav = navRef.current;

    if (!nav) {
      return;
    }

    let animationFrame = 0;

    const scheduleIndicatorUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        updateActiveIndicator();
      });
    };

    const resizeObserver = new ResizeObserver(scheduleIndicatorUpdate);
    resizeObserver.observe(nav);
    nav.addEventListener("animationstart", scheduleIndicatorUpdate);
    nav.addEventListener("animationend", scheduleIndicatorUpdate);
    nav.addEventListener("transitionend", scheduleIndicatorUpdate);
    window.addEventListener("resize", scheduleIndicatorUpdate);

    scheduleIndicatorUpdate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      nav.removeEventListener("animationstart", scheduleIndicatorUpdate);
      nav.removeEventListener("animationend", scheduleIndicatorUpdate);
      nav.removeEventListener("transitionend", scheduleIndicatorUpdate);
      window.removeEventListener("resize", scheduleIndicatorUpdate);
    };
  }, [updateActiveIndicator, visibleSections]);

  useEffect(() => {
    if (isReadingComplete) {
      return;
    }

    let animationFrame = 0;

    const updateReadingProgress = () => {
      const progressRoot = document.querySelector<HTMLElement>(
        READING_PROGRESS_ROOT_SELECTOR,
      );

      if (!progressRoot) {
        setReadingProgress(0);
        return;
      }

      const scrollY = window.scrollY;
      const rootRect = progressRoot.getBoundingClientRect();
      const rootTop = rootRect.top + scrollY;
      const rootHeight = Math.max(progressRoot.scrollHeight, rootRect.height);
      const rootBottom = rootTop + rootHeight;
      const readableDistance = rootHeight - window.innerHeight;
      const progress =
        readableDistance <= 0
          ? scrollY >= rootTop
            ? 100
            : 0
          : ((scrollY - rootTop) / (rootBottom - window.innerHeight - rootTop)) * 100;

      const nextProgress = Math.min(100, Math.max(0, progress));

      if (nextProgress >= 100) {
        setReadingProgress(100);
        setIsReadingComplete(true);
        return;
      }

      setReadingProgress(nextProgress);
    };

    const scheduleReadingProgressUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateReadingProgress);
    };

    window.addEventListener("scroll", scheduleReadingProgressUpdate, { passive: true });
    window.addEventListener("resize", scheduleReadingProgressUpdate);
    scheduleReadingProgressUpdate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleReadingProgressUpdate);
      window.removeEventListener("resize", scheduleReadingProgressUpdate);
    };
  }, [isReadingComplete]);

  useEffect(() => {
    if (!isReadingComplete) {
      return;
    }

    const labelTimeoutId = window.setTimeout(() => {
      setHideReadingProgressLabel(true);
    }, 520);
    const checkTimeoutId = window.setTimeout(() => {
      setShowReadingCompleteCheck(true);
    }, 700);
    const circleTimeoutId = window.setTimeout(() => {
      setHideReadingProgressCircle(true);
    }, 1500);

    return () => {
      window.clearTimeout(labelTimeoutId);
      window.clearTimeout(checkTimeoutId);
      window.clearTimeout(circleTimeoutId);
    };
  }, [isReadingComplete]);

  useEffect(() => {
    if (items.length === 0) {
      return;
    }

    const visibleHeadings = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleHeadings.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            visibleHeadings.delete(entry.target.id);
          }
        }

        const nextActiveId = Array.from(visibleHeadings.entries()).sort(
          (left, right) => left[1] - right[1],
        )[0]?.[0];

        if (nextActiveId) {
          setActiveId(nextActiveId);
        }
      },
      {
        rootMargin: "-112px 0px -65% 0px",
        threshold: [0, 1],
      },
    );

    for (const item of items) {
      const heading = document.getElementById(item.id);

      if (heading) {
        observer.observe(heading);
      }
    }

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <aside className="sticky top-28 hidden max-h-[calc(100vh-8rem)] overflow-y-auto pl-5 text-sm lg:block">
      <nav ref={navRef} aria-label="文章目录" className="relative flex flex-col">
        <span
          ref={activeIndicatorRef}
          aria-hidden="true"
          className="absolute -left-5 top-0 w-[3px] rounded-full bg-primary opacity-0 shadow-[0_0_10px_color-mix(in_srgb,var(--primary)_45%,transparent)] transition-[height,opacity,transform] duration-500 ease-out will-change-transform motion-reduce:transition-none"
        />
        {visibleSections.hasHiddenBefore ? <BackToTopButton /> : null}
        {visibleSections.items.map((section) => {
          const isOpen = section.heading.id === activeSectionId;
          const activeChildIndex = section.children.findIndex((child) => child.id === activeId);
          const visibleChildren = getVisibleTocWindow(
            section.children,
            activeChildIndex,
            MAX_VISIBLE_CHILDREN,
          );

          return (
            <div key={section.heading.id} className="flex flex-col">
              <TOCLink item={section.heading} isActive={section.heading.id === activeId} />
              {section.children.length > 0 ? (
                <div
                  aria-hidden={!isOpen}
                  style={{
                    gridTemplateRows: isOpen ? "1fr" : "0fr",
                    transition:
                      "grid-template-rows 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease-out",
                    opacity: isOpen ? 1 : 0,
                    willChange: "grid-template-rows, opacity",
                  }}
                  className="grid overflow-hidden"
                >
                  <div className="flex min-h-0 flex-col">
                    {visibleChildren.hasHiddenBefore ? <TOCEllipsis className="ml-4" /> : null}
                    {visibleChildren.items.map((child) => (
                      <TOCLink
                        key={child.id}
                        item={child}
                        isActive={child.id === activeId}
                        tabIndex={isOpen ? 0 : -1}
                      />
                    ))}
                    {visibleChildren.hasHiddenAfter ? <TOCEllipsis className="ml-4" /> : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        {visibleSections.hasHiddenAfter ? <TOCEllipsis /> : null}
      </nav>
      <ReadingProgress
        value={readingProgress}
        isComplete={isReadingComplete}
        hideLabel={hideReadingProgressLabel}
        hideCircle={hideReadingProgressCircle}
        showCompleteCheck={showReadingCompleteCheck}
      />
    </aside>
  );
}

function ReadingProgress({
  value,
  isComplete,
  hideLabel,
  hideCircle,
  showCompleteCheck,
}: {
  value: number;
  isComplete: boolean;
  hideLabel: boolean;
  hideCircle: boolean;
  showCompleteCheck: boolean;
}) {
  const roundedValue = Math.round(value);
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isComplete ? 0 : circumference - (value / 100) * circumference;

  return (
    <div className="mt-7">
      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200">
        <span
          className={`relative h-6 w-6 shrink-0 transition-opacity duration-500 ease-out ${
            hideCircle ? "opacity-0" : "opacity-100"
          }`}
        >
          <svg aria-hidden="true" className="h-full w-full -rotate-90" viewBox="0 0 24 24">
            <circle
              cx="12"
              cy="12"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              className="text-zinc-200 dark:text-zinc-800"
            />
            <circle
              cx="12"
              cy="12"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2.25"
              className="text-primary transition-[stroke-dashoffset] duration-150 ease-out"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
              }}
            />
          </svg>
          {showCompleteCheck ? (
            <CheckIcon
              aria-hidden="true"
              className="reading-progress-check-enter absolute left-1/2 top-1/2 h-3 w-3 text-primary"
            />
          ) : null}
        </span>
        <span
          className={`transition-opacity duration-150 ease-out ${
            hideLabel ? "opacity-0" : "opacity-100"
          }`}
        >
          {isComplete ? "Finish" : `${roundedValue}%`}
        </span>
      </div>
    </div>
  );
}

function BackToTopButton() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="toc-item-enter flex items-center gap-1.5 py-[5px] text-left text-xs font-medium uppercase leading-6 tracking-[0.16em] text-zinc-500 transition-colors hover:text-primary dark:text-zinc-400"
    >
      <ArrowUpIcon aria-hidden="true" className="h-3.5 w-3.5" />
      Back To Top
    </button>
  );
}

function getVisibleTocWindow<T>(
  items: T[],
  activeIndex: number,
  maxVisibleItems: number,
): VisibleTocWindow<T> {
  const lastStartIndex = Math.max(items.length - maxVisibleItems, 0);
  const startIndex = Math.min(Math.max(activeIndex - 1, 0), lastStartIndex);

  return {
    hasHiddenBefore: startIndex > 0,
    hasHiddenAfter: startIndex + maxVisibleItems < items.length,
    items: items.slice(startIndex, startIndex + maxVisibleItems),
  };
}

function TOCEllipsis({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`toc-item-enter block py-[5px] leading-6 text-zinc-400 dark:text-zinc-600 ${className}`}
    >
      ...
    </span>
  );
}

function TOCLink({
  item,
  isActive,
  tabIndex,
}: {
  item: TableOfContentsItem;
  isActive: boolean;
  tabIndex?: number;
}) {
  const levelClassName =
    item.level === 2
      ? "font-medium"
      : item.level === 3
        ? "ml-4 text-[0.82rem]"
        : "ml-8 text-[0.78rem]";
  const toneClassName = isActive
    ? "font-medium text-primary"
    : "text-zinc-500 hover:text-primary dark:text-zinc-400";
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(item.id);

    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.pushState(null, "", `#${encodeURIComponent(item.id)}`);
  };

  return (
    <a
      href={`#${item.id}`}
      data-toc-id={item.id}
      tabIndex={tabIndex}
      onClick={handleClick}
      className={`toc-item-enter block py-[5px] leading-6 transition-colors ${toneClassName} ${levelClassName}`}
    >
      {item.text}
    </a>
  );
}
