"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type AdminLoginState } from "@/app/(admin)/admin/login/actions";

const initialState: AdminLoginState = {
  error: null,
};

type AdminLoginDialogProps = {
  isOpen: boolean;
  next: string | null;
  onClose: () => void;
};

export function AdminLoginDialog({
  isOpen,
  next,
  onClose,
}: AdminLoginDialogProps) {
  const [state, formAction] = useActionState(loginAction, initialState);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="pointer-events-auto fixed inset-0 z-[60]"
        >
          <button
            type="button"
            aria-label="Close admin login"
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/25 backdrop-blur-sm"
          />

          <div className="relative flex min-h-full items-center justify-center px-4 py-6">
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-md rounded-[2rem] border border-zinc-200/80 bg-white/94 p-6 shadow-[0_24px_70px_rgba(24,24,27,0.18)] backdrop-blur-xl dark:border-zinc-800/70 dark:bg-[rgba(10,10,14,0.88)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.48)] sm:p-7"
            >
              <button
                type="button"
                aria-label="Close admin login"
                onClick={onClose}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>

              <p className="text-[0.72rem] font-medium uppercase tracking-[0.26em] text-zinc-400 dark:text-zinc-500">
                Admin Access
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                登录后台
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                输入管理员邮箱和密码后进入管理界面。
              </p>

              <form action={formAction} className="mt-6 grid gap-4">
                <input type="hidden" name="next" value={next ?? ""} />

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    管理员邮箱
                  </span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="admin@example.com"
                    className="h-12 rounded-2xl border border-zinc-200/80 bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-primary/40 dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    管理员密码
                  </span>
                  <input
                    autoFocus
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter admin password"
                    className="h-12 rounded-2xl border border-zinc-200/80 bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-primary/40 dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                </label>

                {state.error ? (
                  <p className="rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                    {state.error}
                  </p>
                ) : null}

                <SubmitButton />
              </form>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Submitting..." : "Continue"}
    </button>
  );
}
