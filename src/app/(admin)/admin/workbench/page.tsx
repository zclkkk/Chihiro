import Link from "next/link";
import { CONTENT_STATUS } from "@/types/domain";
import { ContentListPanel, StatusBadge } from "@/app/(admin)/admin/ui";
import { listPostCategories } from "@/server/supabase/categories";
import { listPostsForAdmin } from "@/server/supabase/posts";
import { listTags } from "@/server/supabase/tags";
import { listUpdatesForAdmin } from "@/server/supabase/updates";
import { WorkbenchCategoryPanel } from "@/app/(admin)/admin/workbench/workbench-category-panel";
import { TagCloudPanel } from "@/app/(admin)/admin/workbench/tag-cloud-panel";
import { WorkbenchContentSwitcher } from "@/app/(admin)/admin/workbench/workbench-content-switcher";
import { PostActionMenu } from "@/app/(admin)/admin/workbench/post-action-menu";
import { UpdateActionMenu } from "@/app/(admin)/admin/workbench/update-action-menu";
import { formatAdminDateTime } from "@/app/(admin)/admin/utils";
import { getContentText } from "@/lib/content";
import { ChevronRight } from "lucide-react";
import type { PostItem, UpdateItem, TagOption } from "@/types/domain";

type WorkbenchSearchParams = Promise<{
  sort?: string;
  tab?: string;
}>;

export default async function AdminWorkbenchPage({
  searchParams,
}: {
  searchParams: WorkbenchSearchParams;
}) {
  const { sort } = await searchParams;
  const [posts, updates, postCategories, tags] = await Promise.all([
    listPostsForAdmin(),
    listUpdatesForAdmin(),
    listPostCategories(),
    listTags(),
  ]);
  const sortedPosts = sortWorkbenchPosts(posts, getWorkbenchSortValue(sort));
  const sortedUpdates = sortWorkbenchUpdates(updates, getWorkbenchSortValue(sort));
  const tagCloudItems = getTagCloudItems(tags, posts);

  return (
    <div className="grid gap-10">
      <section className="grid gap-4 border-b border-zinc-200/80 pb-6 dark:border-zinc-800/80">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.28em] text-zinc-400 dark:text-zinc-500">
            Write
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            撰写
          </h2>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          <WriteEntry href="/admin/compose/post" eyebrow="Post" title="新文章" />
          <WriteEntry href="/admin/compose/update" eyebrow="Update" title="新动态" />
          <WriteEntry href="/admin/compose/page" eyebrow="Page" title="独立页面" />
        </div>
      </section>

      <section className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.28em] text-zinc-400 dark:text-zinc-500">
            Management
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            内容管理
          </h2>
        </div>
      </section>

      <WorkbenchContentSwitcher
        activeSort={getWorkbenchSortValue(sort)}
        postsPanel={
          <ContentListPanel
            title="文章"
            eyebrow="Posts"
            items={sortedPosts}
            emptyText="还没有文章内容。"
            showHeader={false}
            renderMeta={(item) => (
              <>
                <span>作者 {item.authorName ?? "未设置"}</span>
                <span>·</span>
                <span>分类 {item.category?.name ?? "未分类"}</span>
                <span>·</span>
                <span className="flex flex-wrap items-center gap-1">
                  <span>标签</span>
                  {item.tags.length > 0 ? (
                    item.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="text-[0.72rem] font-medium text-zinc-500 dark:text-zinc-400"
                      >
                        #{tag.name}
                      </span>
                    ))
                  ) : (
                    <span>无</span>
                  )}
                </span>
              </>
            )}
            renderActions={(item) => (
              <>
                <Link
                  href={`/admin/compose/post?id=${encodeURIComponent(item.id)}`}
                  className="inline-flex items-center gap-1.5 border-b border-transparent px-0 py-1 text-xs font-medium text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
                >
                  编辑文章
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
                <PostActionMenu postId={item.id} isPublished={item.status === CONTENT_STATUS.PUBLISHED} />
              </>
            )}
          />
        }
        updatesPanel={<UpdateListPanel items={sortedUpdates} />}
        categoriesPanel={
          <WorkbenchCategoryPanel postCategories={postCategories} />
        }
        tagsPanel={<TagCloudPanel items={tagCloudItems} />}
      />
    </div>
  );
}

function getWorkbenchSortValue(value?: string) {
  if (value === "created") {
    return "created";
  }

  if (value === "updated") {
    return "updated";
  }

  return "updated";
}

function sortWorkbenchPosts(items: PostItem[], sort: "created" | "updated") {
  const nextItems = [...items];

  nextItems.sort((left, right) => {
    const leftValue = sort === "created" ? left.createdAt : left.updatedAt;
    const rightValue = sort === "created" ? right.createdAt : right.updatedAt;

    return compareDates(rightValue, leftValue);
  });

  return nextItems;
}

function sortWorkbenchUpdates(items: UpdateItem[], sort: "created" | "updated") {
  const nextItems = [...items];

  nextItems.sort((left, right) => {
    const leftValue = sort === "created" ? left.createdAt : left.updatedAt;
    const rightValue = sort === "created" ? right.createdAt : right.updatedAt;

    return compareDates(rightValue, leftValue);
  });

  return nextItems;
}

function compareDates(left?: string | null, right?: string | null) {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;

  return leftTime - rightTime;
}

function UpdateListPanel({ items }: { items: UpdateItem[] }) {
  return (
    <section className="border-b border-zinc-200/80 pb-5 dark:border-zinc-800/80">
      <div>
        {items.length > 0 ? (
          <div className="grid gap-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="border-b border-zinc-200/80 pb-5 last:border-b-0 dark:border-zinc-800/80"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap break-words text-[0.95rem] leading-7 text-zinc-700 dark:text-zinc-200">
                      {getUpdatePreviewText(item)}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <StatusBadge status={item.status} />
                      <p>时间 {formatUpdateTime(item)}</p>
                      <p>{item.authorName ?? "未署名"}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Link
                      href={`/admin/compose/update?id=${encodeURIComponent(item.id)}`}
                      className="inline-flex items-center gap-1.5 border-b border-transparent px-0 py-1 text-xs font-medium text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
                    >
                      编辑动态
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                    <UpdateActionMenu
                      isPublished={item.status === CONTENT_STATUS.PUBLISHED}
                      updateId={item.id}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-zinc-200/80 px-5 py-8 text-sm text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
            还没有动态内容。
          </div>
        )}
      </div>
    </section>
  );
}

function getUpdatePreviewText(item: UpdateItem) {
  return getContentText(item.contentHtml, item.content) || "空内容";
}

function formatUpdateTime(item: UpdateItem) {
  return formatAdminDateTime(item.publishedAt ?? item.updatedAt);
}

function WriteEntry({
  href,
  eyebrow,
  title,
}: {
  href: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <Link href={href} className="group grid gap-4 py-2">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[0.68rem] uppercase tracking-[0.28em] text-zinc-400 transition group-hover:text-zinc-500 dark:text-zinc-500 dark:group-hover:text-zinc-400">
          {eyebrow}
        </p>
        <span className="text-2xl leading-none text-zinc-400 transition group-hover:-translate-x-0.5 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300">
          →
        </span>
      </div>
      <p className="text-[1.5rem] font-semibold tracking-tight text-zinc-950 transition group-hover:text-zinc-900 dark:text-zinc-50 dark:group-hover:text-white">
        {title}
      </p>
    </Link>
  );
}

function getTagCloudItems(tags: TagOption[], posts: PostItem[]) {
  const items = new Map<
    string,
    {
      id: string;
      name: string;
      slug: string;
      postCount: number;
      contentCount: number;
    }
  >();

  for (const tag of tags) {
    items.set(tag.id, {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      postCount: 0,
      contentCount: 0,
    });
  }

  for (const post of posts) {
    for (const tag of post.tags) {
      const current = items.get(tag.id) ?? {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        postCount: 0,
        contentCount: 0,
      };

      current.postCount += 1;
      current.contentCount += 1;
      items.set(tag.id, current);
    }
  }

  return Array.from(items.values()).sort((left, right) => left.name.localeCompare(right.name));
}
