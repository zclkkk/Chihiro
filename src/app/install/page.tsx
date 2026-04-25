import Link from "next/link";
import { redirect } from "next/navigation";
import { InstallForm } from "@/app/install/install-form";
import { siteConfig } from "@/lib/site";
import { getInstallationState, isInstallationComplete } from "@/server/installation";
import { getSiteSettings } from "@/server/supabase/site";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function InstallPage() {
  if (!hasSupabaseEnv()) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-16 sm:px-10">
        <section className="max-w-3xl">
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.26em] text-zinc-400 dark:text-zinc-500">
            Installation
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
            初始化 Chihiro
          </h1>
          <p className="mt-4 text-base leading-8 text-zinc-500 dark:text-zinc-400">
            先把 Supabase 环境变量配置好，再在这里完成站点信息和首个管理员初始化。
          </p>
        </section>

        <section className="mt-10 rounded-[2rem] border border-zinc-200/80 bg-white/85 p-6 shadow-[0_24px_70px_rgba(24,24,27,0.08)] dark:border-zinc-800/80 dark:bg-zinc-950/55 dark:shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
          <InstallHint
            title="当前还不能开始初始化"
            description="站点还没有完成安装，而且当前环境里也没有配置 Supabase 连接信息。先配置以下环境变量并重启应用，再回来继续初始化。"
            helper={
              <div className="grid gap-2">
                <code className="break-all rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
                </code>
                <code className="break-all rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
                </code>
                <code className="break-all rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
                </code>
              </div>
            }
          />
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <Link
            href="/"
            className="font-medium text-primary transition hover:opacity-80"
          >
            返回站点
          </Link>
          <span>·</span>
          <span>初始化完成后会前往后台入口。</span>
        </div>
      </main>
    );
  }

  const installationState = await getInstallationState();

  if (isInstallationComplete(installationState)) {
    redirect("/admin");
  }

  const siteSettings = await getSiteSettings();

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-16 sm:px-10">
      <section className="max-w-3xl">
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.26em] text-zinc-400 dark:text-zinc-500">
          Installation
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
          初始化 Chihiro
        </h1>
        <p className="mt-4 text-base leading-8 text-zinc-500 dark:text-zinc-400">
          在这里完成站点信息和首个管理员初始化。
        </p>
      </section>

      <section className="mt-10 rounded-[2rem] border border-zinc-200/80 bg-white/85 p-6 shadow-[0_24px_70px_rgba(24,24,27,0.08)] dark:border-zinc-800/80 dark:bg-zinc-950/55 dark:shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
        <InstallForm
          defaults={{
            siteName: siteSettings?.siteName ?? siteConfig.name,
            siteDescription: siteSettings?.siteDescription ?? siteConfig.description,
            siteUrl: siteSettings?.siteUrl ?? siteConfig.url,
            locale: siteSettings?.locale ?? siteConfig.locale,
            authorName: siteSettings?.authorName ?? siteConfig.author,
            authorAvatarUrl: siteSettings?.authorAvatarUrl ?? siteConfig.avatar,
            heroIntro: siteSettings?.heroIntro ?? siteConfig.heroIntro,
            summary: siteSettings?.summary ?? siteConfig.summary,
            motto: siteSettings?.motto ?? siteConfig.motto,
            email: siteSettings?.email ?? siteConfig.email,
            githubUrl: siteSettings?.githubUrl ?? siteConfig.github,
          }}
          needsAdminSetup={installationState.adminUserCount === 0}
        />
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/"
          className="font-medium text-primary transition hover:opacity-80"
        >
          返回站点
        </Link>
        <span>·</span>
        <span>初始化完成后会前往后台入口。</span>
      </div>
    </main>
  );
}

function InstallHint({
  title,
  description,
  helper,
}: {
  title: string;
  description: string;
  helper?: React.ReactNode;
}) {
  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {title}
      </h2>
      <p className="text-sm leading-7 text-zinc-500 dark:text-zinc-400">{description}</p>
      {helper ? <div className="pt-2">{helper}</div> : null}
    </div>
  );
}
