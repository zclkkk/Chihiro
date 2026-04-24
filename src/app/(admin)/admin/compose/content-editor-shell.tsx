"use client";

import type { ReactNode, RefObject } from "react";

type ContentEditorShellProps = {
  formAction: (formData: FormData) => void;
  formRef?: RefObject<HTMLFormElement | null>;
  onSubmit?: () => void;
  hiddenFields: ReactNode;
  main: ReactNode;
  sidebar: ReactNode;
  stateError: string | null;
  footerLeft: ReactNode;
  footerRight: ReactNode;
};

export function ContentEditorShell({
  formAction,
  formRef,
  onSubmit,
  hiddenFields,
  main,
  sidebar,
  stateError,
  footerLeft,
  footerRight,
}: ContentEditorShellProps) {
  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="grid gap-6 pb-8">
      {hiddenFields}

      <section className="grid gap-10 lg:min-h-[calc(100dvh-20rem)] lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-14">
        <div className="grid gap-8">{main}</div>
        <aside className="grid gap-8 lg:sticky lg:top-28">{sidebar}</aside>
      </section>

      {stateError ? (
        <p className="border-l-2 border-rose-300 pl-4 text-sm text-rose-700 dark:border-rose-400/40 dark:text-rose-200">
          {stateError}
        </p>
      ) : null}

      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:border-zinc-800/70 dark:bg-zinc-950/75 supports-[backdrop-filter]:dark:bg-zinc-950/65 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">{footerLeft}</div>
        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:items-center">{footerRight}</div>
      </div>
    </form>
  );
}
