import { AdminSidebar } from "@/app/(admin)/admin/admin-sidebar";
import { getDraftCount, getPublishedCount } from "@/app/(admin)/admin/utils";
import { listPostsForAdmin } from "@/server/repositories/posts";
import { listUpdatesForAdmin } from "@/server/repositories/updates";

export default async function AdminConsoleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [posts, updates] = await Promise.all([listPostsForAdmin(), listUpdatesForAdmin()]);

  return (
    <main className="relative z-10 min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <AdminSidebar
          totalCount={posts.length + updates.length}
          publishedCount={getPublishedCount(posts, updates)}
          draftCount={getDraftCount(posts, updates)}
        />
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}
