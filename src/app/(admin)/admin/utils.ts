import { ContentStatus } from "@prisma/client";
import { getPostPath } from "@/lib/routes";
import type { PostItem } from "@/server/repositories/posts";
import type { UpdateItem } from "@/server/repositories/updates";

export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "概览" },
  { href: "/admin/workbench", label: "编辑台" },
  { href: "/admin/settings", label: "设置" },
] as const;

export function compareAdminDates(left: string | null | undefined, right: string | null | undefined) {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return leftTime - rightTime;
}

export function formatAdminDate(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatCompactAdminDate(value: string | null) {
  if (!value) {
    return "None";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatAdminDateTime(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function getPublishedCount(posts: PostItem[], updates: UpdateItem[]) {
  return (
    posts.filter((item) => item.status === ContentStatus.PUBLISHED).length +
    updates.filter((item) => item.status === ContentStatus.PUBLISHED).length
  );
}

export function getDraftCount(posts: PostItem[], updates: UpdateItem[]) {
  return (
    posts.filter((item) => item.status === ContentStatus.DRAFT).length +
    updates.filter((item) => item.status === ContentStatus.DRAFT).length
  );
}

export function getRecentItems(posts: PostItem[], updates: UpdateItem[]) {
  return [
    ...posts.map((item) => ({
      id: item.id,
      kind: "Post" as const,
      title: item.title,
      slug: item.slug,
      href: getPostPath({ slug: item.slug, categorySlug: item.category?.slug }),
      status: item.status,
      updatedAt: item.updatedAt,
      publishedAt: item.publishedAt,
    })),
    ...updates.map((item) => ({
      id: item.id,
      kind: "Update" as const,
      title: item.title,
      slug: item.slug,
      href: `/updates/${item.slug}`,
      status: item.status,
      updatedAt: item.updatedAt,
      publishedAt: item.publishedAt,
    })),
  ].sort((left, right) => compareAdminDates(right.updatedAt, left.updatedAt));
}

export function getDraftPosts(posts: PostItem[]) {
  return posts
    .filter((item) => item.status === ContentStatus.DRAFT)
    .sort((left, right) => compareAdminDates(right.updatedAt, left.updatedAt));
}

export function getDraftUpdates(updates: UpdateItem[]) {
  return updates
    .filter((item) => item.status === ContentStatus.DRAFT)
    .sort((left, right) => compareAdminDates(right.updatedAt, left.updatedAt));
}
