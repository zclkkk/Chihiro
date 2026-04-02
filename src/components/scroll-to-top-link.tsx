"use client";

import { ArrowUp } from "lucide-react";

type ScrollToTopLinkProps = {
  children: string;
};

export function ScrollToTopLink({ children }: ScrollToTopLinkProps) {
  return (
    <button
      type="button"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className="inline-flex cursor-pointer items-center gap-1.5 pb-0.5 text-sm font-medium text-primary transition hover:opacity-80 dark:text-sky-300 dark:hover:opacity-80"
    >
      <ArrowUp className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}
