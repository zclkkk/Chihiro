"use server";

import { ContentStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { renderPlainTextContentHtml } from "@/lib/content";
import { getPostPath } from "@/lib/routes";
import { requireAdminSession } from "@/server/auth";
import {
  discardPostRevisionById,
  getPostByIdForAdmin,
  publishPostById,
  savePostDraft,
} from "@/server/repositories/posts";
import { getSiteSettings } from "@/server/repositories/site";
import { siteConfig } from "@/lib/site";

export type SavePostEditorState = {
  error: string | null;
};

export async function savePostDraftAction(
  _previousState: SavePostEditorState,
  formData: FormData,
): Promise<SavePostEditorState> {
  await requireAdminSession();
  const intent = getOptionalString(formData, "intent") ?? "save";
  const currentStatus = getContentStatus(formData, "currentStatus");

  const title = getRequiredString(formData, "title");
  const slugInput = getOptionalString(formData, "slug");
  const slug = slugInput ? normalizeSlug(slugInput) : null;
  const summary = getOptionalString(formData, "summary");
  const content = getOptionalString(formData, "content");
  const categoryId = getOptionalNumber(formData, "categoryId");
  const publishedAtInput = getOptionalString(formData, "publishedAt");
  const publishedAt = publishedAtInput ? parsePublishedAtInput(publishedAtInput) : null;
  const tagIds = formData
    .getAll("tagIds")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  const postId = getOptionalPostId(formData, "postId");
  const siteSettings = await getSiteSettings();
  const authorName = siteSettings?.authorName ?? siteConfig.author;

  try {
    const post = await savePostDraft({
      id: postId ?? undefined,
      title,
      slug,
      summary,
      content,
      contentHtml: renderPlainTextContentHtml(content),
      status: currentStatus,
      categoryId,
      publishedAt,
      tagIds,
      authorName,
    });

    if (intent === "publish") {
      const publishedPost = await publishPostById(post.id);

      revalidatePostSurface(post.slug, post.category?.slug);
      revalidatePostSurface(publishedPost.slug, publishedPost.category?.slug);
    }

    revalidatePath("/admin/workbench");
    revalidatePath("/admin/compose/post");
  } catch (error) {
    if (isUniqueSlugError(error)) {
      return {
        error: "这个 slug 已经被占用了，请换一个。",
      };
    }

    return {
      error: error instanceof Error ? error.message : "保存文章时出错了。",
    };
  }

  if (intent === "publish") {
    redirect("/admin/workbench?tab=posts");
  }

  return {
    error: null,
  };
}

export async function discardPostRevisionAction(formData: FormData) {
  await requireAdminSession();
  const postId = getRequiredPostId(formData, "postId");
  const currentPost = await getPostByIdForAdmin(postId);

  if (!currentPost) {
    throw new Error("草稿不存在或已被删除。");
  }

  if (!currentPost.draftSnapshot) {
    throw new Error("这篇文章没有可以删除的草稿。");
  }

  const restoredPost = await discardPostRevisionById(postId);

  revalidatePostSurface(currentPost.slug, currentPost.category?.slug);
  revalidatePostSurface(restoredPost.slug, restoredPost.category?.slug);
  revalidatePath("/admin/workbench");
  revalidatePath("/admin/compose/post");

  redirect(`/admin/compose/post?id=${encodeURIComponent(restoredPost.id)}`);
}

function getRequiredString(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    throw new Error(`请填写 ${key}。`);
  }

  return value;
}

function getRequiredPostId(formData: FormData, key: string) {
  const value = getOptionalPostId(formData, key);

  if (value === null) {
    throw new Error(`请填写 ${key}。`);
  }

  return value;
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function getOptionalPostId(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error("请填写有效的文章编号。");
  }

  return Number(value);
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(`请填写有效的 ${key}。`);
  }

  return Number(value);
}

function getContentStatus(formData: FormData, key: string): ContentStatus {
  const value = getOptionalString(formData, key);

  return value === ContentStatus.PUBLISHED ? ContentStatus.PUBLISHED : ContentStatus.DRAFT;
}

function normalizeSlug(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new Error("请填写有效的 slug。");
  }

  return slug;
}

function parsePublishedAtInput(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})$/,
  );

  if (!match) {
    throw new Error("请填写有效的发布日期。");
  }

  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day) ||
    date.getHours() !== Number(hour) ||
    date.getMinutes() !== Number(minute)
  ) {
    throw new Error("请填写有效的发布日期。");
  }

  return date;
}

function isUniqueSlugError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function revalidatePostSurface(slug: string, categorySlug?: string | null) {
  revalidatePath("/admin");
  revalidatePath("/admin/workbench");
  revalidatePath("/");
  revalidatePath("/timeline");
  revalidatePath("/posts");
  revalidatePath(getPostPath({ slug, categorySlug }));
  revalidatePath(`/posts/${slug}`);
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
}
