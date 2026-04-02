import { siteConfig } from "@/lib/site";

type SiteLogoMarkProps = {
  caption?: string;
};

export function SiteLogoMark({ caption }: SiteLogoMarkProps) {
  return (
    <div className="inline-flex flex-col items-center gap-3 text-center">
      <div>
        <p className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {siteConfig.name}
        </p>
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
          Archive Log
        </p>
      </div>
      {caption ? (
        <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{caption}</p>
      ) : null}
    </div>
  );
}
