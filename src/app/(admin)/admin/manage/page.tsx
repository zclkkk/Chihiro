import { ContentStatus } from "@prisma/client";
import Link from "next/link";
import {
  publishPostAction,
  publishUpdateAction,
  unpublishPostAction,
  unpublishUpdateAction,
} from "@/app/(admin)/admin/actions";
import {
  AdminActionButton,
  AdminPageHeader,
  ContentListPanel,
} from "@/app/(admin)/admin/ui";
import { listPostsForAdmin } from "@/server/repositories/posts";
import { listUpdatesForAdmin } from "@/server/repositories/updates";

export default async function AdminManagePage() {
  const [posts, updates] = await Promise.all([listPostsForAdmin(), listUpdatesForAdmin()]);

  return (
    <div className="grid gap-8">
      <AdminPageHeader eyebrow="Manage" title="管理" />

      <ContentListPanel
        title="文章"
        eyebrow="Posts"
        items={posts}
        emptyText="还没有文章内容。"
        getHref={(item) => `/posts/${item.slug}`}
        renderMeta={(item) => (
          <>
            <span>{item.category?.name ?? "Uncategorized"}</span>
            <span>·</span>
            <span>{item.authorName ?? "Unknown author"}</span>
          </>
        )}
        renderActions={(item) => (
          <>
            {item.status === ContentStatus.PUBLISHED ? (
              <>
                <Link
                  href={`/posts/${item.slug}`}
                  className="inline-flex items-center justify-center border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
                >
                  查看公开页
                </Link>
                <form action={unpublishPostAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <AdminActionButton tone="secondary">转回草稿</AdminActionButton>
                </form>
              </>
            ) : (
              <form action={publishPostAction}>
                <input type="hidden" name="id" value={item.id} />
                <AdminActionButton>发布文章</AdminActionButton>
              </form>
            )}
          </>
        )}
      />

      <ContentListPanel
        title="动态"
        eyebrow="Updates"
        items={updates}
        emptyText="还没有动态内容。"
        getHref={(item) => `/updates/${item.slug}`}
        renderMeta={(item) => (
          <>
            <span>{item.category?.name ?? "Uncategorized"}</span>
            <span>·</span>
            <span>{item.tags.length} tags</span>
          </>
        )}
        renderActions={(item) => (
          <>
            {item.status === ContentStatus.PUBLISHED ? (
              <>
                <Link
                  href={`/updates/${item.slug}`}
                  className="inline-flex items-center justify-center border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
                >
                  查看公开页
                </Link>
                <form action={unpublishUpdateAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <AdminActionButton tone="secondary">转回草稿</AdminActionButton>
                </form>
              </>
            ) : (
              <form action={publishUpdateAction}>
                <input type="hidden" name="id" value={item.id} />
                <AdminActionButton>发布动态</AdminActionButton>
              </form>
            )}
          </>
        )}
      />
    </div>
  );
}
