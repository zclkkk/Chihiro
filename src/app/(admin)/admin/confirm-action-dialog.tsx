"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useState } from "react";

type ConfirmActionDialogProps = {
  triggerLabel: string;
  triggerClassName: string;
  title: string;
  description: string;
  confirmLabel: string;
  confirmTone?: "danger" | "primary";
  disabled?: boolean;
  action: (formData: FormData) => void | Promise<void>;
  fields: Array<{
    name: string;
    value: string | number;
  }>;
};

export function ConfirmActionDialog({
  triggerLabel,
  triggerClassName,
  title,
  description,
  confirmLabel,
  confirmTone = "danger",
  disabled = false,
  action,
  fields,
}: ConfirmActionDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[90] overflow-y-auto bg-zinc-950/35 backdrop-blur-md dark:bg-black/60"
              onClick={() => setOpen(false)}
            >
              <div className="flex min-h-full items-center justify-center px-4 py-10 sm:px-6">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={titleId}
                  aria-describedby={descriptionId}
                  className="relative w-full max-w-lg overflow-hidden rounded-[1.5rem] border border-zinc-200/80 bg-white/95 shadow-[0_24px_90px_rgba(15,23,42,0.2)] backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/95 dark:shadow-[0_24px_90px_rgba(0,0,0,0.55)]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    aria-label="关闭"
                    onClick={() => setOpen(false)}
                    className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="flex items-start gap-3 px-5 pt-5">
                    <div
                      className={[
                        "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                        confirmTone === "danger"
                          ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-300"
                          : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300",
                      ].join(" ")}
                    >
                      <span className="text-sm font-semibold uppercase tracking-[0.12em]">!</span>
                    </div>
                    <div className="min-w-0 flex-1 pr-8">
                      <p className="text-[0.68rem] font-medium uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
                        Confirm
                      </p>
                      <h2
                        id={titleId}
                        className="mt-2 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
                      >
                        {title}
                      </h2>
                      <p
                        id={descriptionId}
                        className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400"
                      >
                        {description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-zinc-200/80 px-5 py-4 dark:border-zinc-800/80">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
                      >
                        取消
                      </button>
                      <form action={action}>
                        {fields.map((field) => (
                          <input key={field.name} type="hidden" name={field.name} value={field.value} />
                        ))}
                        <button
                          type="submit"
                          className={[
                            "inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-medium transition",
                            confirmTone === "danger"
                              ? "bg-rose-600 text-white hover:bg-rose-500 dark:bg-rose-500 dark:hover:bg-rose-400"
                              : "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white",
                          ].join(" ")}
                        >
                          {confirmLabel}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
