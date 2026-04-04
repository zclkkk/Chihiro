import Link from "next/link";
import { CategoryKind, ContentStatus } from "@prisma/client";
import { ContentListPanel, EmptyPanel } from "@/app/(admin)/admin/ui";
import { listCategoriesByKind } from "@/server/repositories/categories";
import { listPostsForAdmin } from "@/server/repositories/posts";
import { listTags } from "@/server/repositories/tags";
import { listUpdatesForAdmin } from "@/server/repositories/updates";
import { WorkbenchCategoryPanel } from "@/app/(admin)/admin/workbench/workbench-category-panel";
import { WorkbenchContentSwitcher } from "@/app/(admin)/admin/workbench/workbench-content-switcher";
import { PostActionMenu } from "@/app/(admin)/admin/workbench/post-action-menu";
import { UpdateActionMenu } from "@/app/(admin)/admin/workbench/update-action-menu";
import { ChevronRight } from "lucide-react";

type WorkbenchSearchParams = Promise<{
  sort?: string;
  tab?: string;
}>;

export default async function AdminWorkbenchPage({
  searchParams,
}: {
  searchParams: WorkbenchSearchParams;
}) {
  const { sort, tab } = await searchParams;
  const [posts, updates, postCategories, updateCategories, tags] = await Promise.all([
    listPostsForAdmin(),
    listUpdatesForAdmin(),
    listCategoriesByKind(CategoryKind.POST),
    listCategoriesByKind(CategoryKind.UPDATE),
    listTags(),
  ]);
  const sortedPosts = sortWorkbenchPosts(posts, getWorkbenchSortValue(sort));
  const sortedUpdates = sortWorkbenchUpdates(updates, getWorkbenchSortValue(sort));

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
                        className="border border-zinc-200/80 bg-zinc-50/80 px-2 py-0.5 text-[0.72rem] font-medium text-zinc-500 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:text-zinc-400"
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
                <PostActionMenu postId={item.id} isPublished={item.status === ContentStatus.PUBLISHED} />
              </>
            )}
          />
        }
        updatesPanel={
          <ContentListPanel
            title="动态"
            eyebrow="Updates"
            items={sortedUpdates}
            emptyText="还没有动态内容。"
            showHeader={false}
            renderMeta={(item) => (
              <>
                <span>分类 {item.category?.name ?? "未分类"}</span>
                <span>·</span>
                <span className="flex flex-wrap items-center gap-1">
                  <span>标签</span>
                  {item.tags.length > 0 ? (
                    item.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="border border-zinc-200/80 bg-zinc-50/80 px-2 py-0.5 text-[0.72rem] font-medium text-zinc-500 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:text-zinc-400"
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
              <div className="flex flex-col items-end gap-2">
                <Link
                  href={`/admin/compose/update?id=${encodeURIComponent(item.id)}`}
                  className="inline-flex items-center gap-1.5 border-b border-transparent px-0 py-1 text-xs font-medium text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
                >
                  编辑动态
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
                <UpdateActionMenu isPublished={item.status === ContentStatus.PUBLISHED} updateId={item.id} />
              </div>
            )}
          />
        }
        categoriesPanel={
          <WorkbenchCategoryPanel
            postCategories={postCategories}
            updateCategories={updateCategories}
          />
        }
        tagsPanel={
          <TagCloudPanel items={tags} />
        }
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

function sortWorkbenchPosts(
  items: Awaited<ReturnType<typeof listPostsForAdmin>>,
  sort: "created" | "updated",
) {
  const nextItems = [...items];

  nextItems.sort((left, right) => {
    const leftValue = sort === "created" ? left.createdAt : left.updatedAt;
    const rightValue = sort === "created" ? right.createdAt : right.updatedAt;

    return compareDates(rightValue, leftValue);
  });

  return nextItems;
}

function sortWorkbenchUpdates(
  items: Awaited<ReturnType<typeof listUpdatesForAdmin>>,
  sort: "created" | "updated",
) {
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

function TagCloudPanel({
  items,
}: {
  items: Array<{ id: string; name: string; slug: string }>;
}) {
  return (
    <section className="border-b border-zinc-200/80 pb-6 dark:border-zinc-800/80">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
            Tags
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            标签
          </h3>
        </div>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2.5">
          {items.map((item, index) => (
            <span
              key={item.id}
              className={[
                "inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition",
                index % 5 === 0
                  ? "border-zinc-300/80 bg-zinc-50 text-zinc-900 dark:border-zinc-700/80 dark:bg-zinc-900/60 dark:text-zinc-50"
                  : index % 5 === 1
                    ? "border-zinc-200/80 bg-white text-zinc-700 dark:border-zinc-800/80 dark:bg-zinc-950/50 dark:text-zinc-300"
                    : index % 5 === 2
                      ? "border-zinc-200/80 bg-zinc-50/80 text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:text-zinc-400"
                      : index % 5 === 3
                        ? "border-zinc-300/70 bg-zinc-100/70 text-zinc-800 dark:border-zinc-700/70 dark:bg-zinc-800/50 dark:text-zinc-200"
                        : "border-zinc-200/80 bg-white/90 text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:text-zinc-400",
              ].join(" ")}
            >
              {item.name}
            </span>
          ))}
        </div>
      ) : (
        <EmptyPanel text="还没有标签。" />
      )}
    </section>
  );
}
