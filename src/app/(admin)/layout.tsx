import { requireAdminSession } from "@/server/auth";
import { AdminHeader } from "@/app/(admin)/admin/admin-header";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdminSession();

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
