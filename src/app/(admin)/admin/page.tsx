import { AdminPageHeader, StatCard } from "@/app/(admin)/admin/ui";
import {
  formatCompactAdminDate,
  getDraftCount,
  getPublishedCount,
  getRecentItems,
} from "@/app/(admin)/admin/utils";
import { listPostsForAdmin } from "@/server/repositories/posts";
import { listUpdatesForAdmin } from "@/server/repositories/updates";

export default async function AdminOverviewPage() {
  const [posts, updates] = await Promise.all([listPostsForAdmin(), listUpdatesForAdmin()]);
  const recentItems = getRecentItems(posts, updates).slice(0, 6);

  return (
    <div className="grid gap-8">
      <AdminPageHeader eyebrow="Overview" title="概览" />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="总内容数" value={posts.length + updates.length} />
        <StatCard label="已发布" value={getPublishedCount(posts, updates)} tone="success" />
        <StatCard label="草稿" value={getDraftCount(posts, updates)} tone="muted" />
        <StatCard
          label="最近更新时间"
          value={recentItems.length > 0 ? formatCompactAdminDate(recentItems[0].updatedAt) : "None"}
          tone="neutral"
        />
      </div>

    </div>
  );
}
