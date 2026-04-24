"use client";

import {
  deleteUpdateAction,
  publishUpdateAction,
  unpublishUpdateAction,
} from "@/app/(admin)/admin/actions";
import { ConfirmActionDialog } from "@/app/(admin)/admin/confirm-action-dialog";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type UpdateActionMenuProps = {
  updateId: string;
  isPublished: boolean;
};

export function UpdateActionMenu({ updateId, isPublished }: UpdateActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;

      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        return;
      }

      if (!target || menuRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center gap-1.5 border-b border-transparent px-0 py-1 text-xs font-medium text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
      >
        操作
        <ChevronDown
          className={`h-3.5 w-3.5 transition duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen ? (
        <div className="absolute right-0 z-10 mt-2 min-w-[7.5rem] overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-1 shadow-[0_14px_40px_rgba(15,23,42,0.08)] dark:border-zinc-800/90 dark:bg-zinc-950 dark:shadow-[0_14px_40px_rgba(0,0,0,0.35)]">
          {isPublished ? (
            <form action={unpublishUpdateAction}>
              <input type="hidden" name="id" value={updateId} />
              <button
                type="submit"
                className="flex w-full items-center whitespace-nowrap rounded-xl px-3 py-2 text-left text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
              >
                转回草稿
              </button>
            </form>
          ) : (
            <form action={publishUpdateAction}>
              <input type="hidden" name="id" value={updateId} />
              <button
                type="submit"
                className="flex w-full items-center whitespace-nowrap rounded-xl px-3 py-2 text-left text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
              >
                发布动态
              </button>
            </form>
          )}
          <ConfirmActionDialog
            triggerLabel="删除动态"
            triggerClassName="flex w-full items-center whitespace-nowrap rounded-xl px-3 py-2 text-left text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            title="删除这条动态？"
            description="删除后无法撤销，动态和相关数据会被移除。"
            confirmLabel="删除动态"
            action={deleteUpdateAction}
            fields={[{ name: "id", value: updateId }]}
            confirmTone="danger"
          />
        </div>
      ) : null}
    </div>
  );
}
