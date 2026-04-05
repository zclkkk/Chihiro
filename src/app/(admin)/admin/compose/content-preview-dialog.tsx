"use client";

import { createPortal } from "react-dom";
import { useEffect } from "react";
import type { ReactNode } from "react";

type ContentPreviewDialogProps = {
  open: boolean;
  title: string;
  subtitle?: string | null;
  meta?: ReactNode;
  body: ReactNode;
  onOpenChange: (open: boolean) => void;
};

export function ContentPreviewDialog({
  open,
  title,
  subtitle,
  meta,
  body,
  onOpenChange,
}: ContentPreviewDialogProps) {
  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    const { body: bodyElement, documentElement } = document;
    const previousOverflow = bodyElement.style.overflow;
    const previousPaddingRight = bodyElement.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    bodyElement.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      bodyElement.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      bodyElement.style.overflow = previousOverflow;
      bodyElement.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] overflow-y-auto bg-zinc-950/35 backdrop-blur-[2px] dark:bg-black/50"
      onClick={() => onOpenChange(false)}
    >
      <div className="flex min-h-full items-start justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div
          className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white shadow-[0_30px_120px_rgba(15,23,42,0.16)] dark:border-zinc-800/80 dark:bg-zinc-950 dark:shadow-[0_30px_120px_rgba(0,0,0,0.5)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-zinc-200/80 px-5 py-4 sm:px-6 dark:border-zinc-800/80">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
                Preview
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
              aria-label="Close preview"
            >
              ×
            </button>
          </div>

          <div className="max-h-[80vh] overflow-y-auto px-6 py-10 sm:px-10 sm:py-12">
            <div className="mx-auto w-full max-w-3xl">
              <div className="grid gap-3">
                {title ? (
                  <h2 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    {title}
                  </h2>
                ) : null}
                {subtitle ? (
                  <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-300">{subtitle}</p>
                ) : null}
                {meta ? (
                  <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                    {meta}
                  </div>
                ) : null}
              </div>

              <div className="mt-10 border-t border-zinc-200/80 pt-10 dark:border-zinc-800/80">
                {body}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
