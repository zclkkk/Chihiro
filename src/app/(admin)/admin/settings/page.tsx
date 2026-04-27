import Link from "next/link";

export default async function AdminSettingsPage() {
  return (
    <div className="grid gap-10">
      <section className="grid gap-4 border-b border-zinc-200/80 pb-6 dark:border-zinc-800/80">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.28em] text-zinc-400 dark:text-zinc-500">
            Settings
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            设置
          </h1>
        </div>
      </section>
      <section className="grid gap-2">
        <Link
          href="/admin/settings/general"
          className="grid gap-2 border-b border-zinc-200/80 py-5 text-left transition hover:text-primary dark:border-zinc-800/80"
        >
          <span className="text-[0.68rem] font-medium uppercase tracking-[0.28em] text-zinc-400 dark:text-zinc-500">
            Basic
          </span>
          <span className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            常规设置
          </span>
          <span className="text-sm leading-7 text-zinc-500 dark:text-zinc-400">
            修改站点基础资料，包括站点名、作者、站点地址和外部联系方式。
          </span>
        </Link>
        <Link
          href="/admin/settings/image-hosting"
          className="grid gap-2 border-b border-zinc-200/80 py-5 text-left transition hover:text-primary dark:border-zinc-800/80"
        >
          <span className="text-[0.68rem] font-medium uppercase tracking-[0.28em] text-zinc-400 dark:text-zinc-500">
            图床
          </span>
          <span className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            图床设置
          </span>
          <span className="text-sm leading-7 text-zinc-500 dark:text-zinc-400">
            对接 Cloudflare R2 或 S3 兼容对象存储，用于富文本编辑器图片上传。
          </span>
        </Link>
      </section>
    </div>
  );
}
