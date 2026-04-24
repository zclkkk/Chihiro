import Link from "next/link";
import { requireAdmin } from "@/server/auth";
import { AdminHeader } from "@/app/(admin)/admin/admin-header";
import { getAdminBackendState, type AdminBackendStatus } from "@/server/admin-backend";

export const dynamic = "force-dynamic";

function getAdminBackendStatusMessage(status: AdminBackendStatus) {
  if (status === "missing_env") {
    return {
      title: "Supabase 环境变量未配置",
      description:
        "请先配置 NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY 和 SUPABASE_SERVICE_ROLE_KEY 环境变量，然后重启应用。",
    };
  }

  if (status === "needs_installation") {
    return {
      title: "站点尚未初始化",
      description:
        "数据库已连接，但还没有完成站点初始化。请先完成安装向导来创建首个管理员和站点信息。",
    };
  }

  return {
    title: "后台暂时不可用",
    description: "后台服务暂时不可用，请稍后再试。",
  };
}

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const backendState = await getAdminBackendState();

  if (backendState.status !== "ready") {
    const message = getAdminBackendStatusMessage(backendState.status);

    return (
      <div className="relative min-h-full bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <div aria-hidden="true" className="site-bottom-noise" />
        <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
          <section className="w-full max-w-2xl rounded-[2rem] border border-zinc-200/80 bg-white/90 p-8 shadow-[0_24px_70px_rgba(24,24,27,0.12)] backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/70 dark:shadow-[0_24px_80px_rgba(0,0,0,0.42)] sm:p-10">
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.26em] text-zinc-400 dark:text-zinc-500">
              Admin
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
              {message.title}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-500 dark:text-zinc-400">
              {message.description}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
              >
                返回站点
              </Link>
              {backendState.status === "needs_installation" ? (
                <Link
                  href="/install"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white px-5 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:text-zinc-50"
                >
                  前往初始化
                </Link>
              ) : null}
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                配置完成后，刷新页面即可继续登录后台。
              </p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  await requireAdmin();

  return (
    <div className="relative min-h-full bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div aria-hidden="true" className="site-bottom-noise" />
      <AdminHeader />
      <main className="relative z-10 min-h-screen px-6 pb-6 pt-24 md:px-10 md:pb-8 md:pt-28">
        <div className="mx-auto w-full max-w-6xl">
          <section className="min-w-0">{children}</section>
        </div>
      </main>
    </div>
  );
}
