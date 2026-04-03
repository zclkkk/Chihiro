import Link from "next/link";
import { AdminPageHeader } from "@/app/(admin)/admin/ui";

export default function AdminComposePage() {
  return (
    <div className="grid gap-8">
      <AdminPageHeader eyebrow="Compose" title="撰写" />

      <div className="grid gap-6 md:grid-cols-3">
        <ComposeEntryCard href="/admin/compose/post" eyebrow="Post" title="文章" />
        <ComposeEntryCard href="/admin/compose/update" eyebrow="Update" title="动态" />
        <ComposeEntryCard href="/admin/compose/page" eyebrow="Page" title="独立页面" />
      </div>
    </div>
  );
}

function ComposeEntryCard({
  href,
  eyebrow,
  title,
}: {
  href: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="border-b border-zinc-200/80 px-2 py-6 transition hover:border-zinc-400 dark:border-zinc-800/80 dark:hover:border-zinc-600"
    >
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {title}
      </h2>
    </Link>
  );
}
