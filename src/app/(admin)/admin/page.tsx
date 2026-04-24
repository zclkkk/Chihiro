import { StatCard } from "@/app/(admin)/admin/ui";
import {
  formatCompactAdminDate,
  formatAdminNumber,
  getContentWordCount,
  getDraftCount,
  getPublishedCount,
  getRecentItems,
  getSiteRuntimeDays,
} from "@/app/(admin)/admin/utils";
import { listPostsForAdmin } from "@/server/supabase/posts";
import { getSiteCreatedAt } from "@/server/supabase/site";
import { listUpdatesForAdmin } from "@/server/supabase/updates";

export default async function AdminOverviewPage() {
  const [posts, updates, siteCreatedAt] = await Promise.all([
    listPostsForAdmin(),
    listUpdatesForAdmin(),
    getSiteCreatedAt(),
  ]);
  const recentItems = getRecentItems(posts, updates).slice(0, 6);
  const contentWordCount = getContentWordCount(posts, updates);
  const siteRuntimeDays = getSiteRuntimeDays(siteCreatedAt);

  return (
    <div className="grid gap-8">
      <div className="grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="总内容数" value={posts.length + updates.length} />
        <StatCard label="文章数" value={posts.length} />
        <StatCard label="动态数" value={updates.length} />
        <StatCard label="已发布" value={getPublishedCount(posts, updates)} tone="success" />
        <StatCard label="草稿" value={getDraftCount(posts, updates)} tone="muted" />
        <StatCard label="评论数" value="—" tone="neutral" />
        <StatCard label="点赞数" value="—" tone="neutral" />
        <StatCard label="站点内容总字数" value={formatAdminNumber(contentWordCount)} />
        <StatCard
          label="运行天数"
          value={siteRuntimeDays ? `${formatAdminNumber(siteRuntimeDays)} 天` : "—"}
          tone="neutral"
        />
        <StatCard
          label="最近更新时间"
          value={recentItems.length > 0 ? formatCompactAdminDate(recentItems[0].updatedAt) : "None"}
          tone="neutral"
        />
      </div>

    </div>
  );
}
