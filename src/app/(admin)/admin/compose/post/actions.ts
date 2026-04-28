"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseStoredRichTextContent } from "@/lib/rich-text-content";
import { getContentStatus, getOptionalNumber, getOptionalString, getRequiredString } from "@/lib/form-helpers";
import { parsePublishedAtInput } from "@/lib/date-parse";
import { isUniqueConstraintError } from "@/lib/prisma-errors";
import { getCurrentAdmin, requireAdminSession } from "@/server/auth";
import { revalidatePostSurface } from "@/server/revalidation";
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
  const content = parseRichTextContent(formData);
  const contentHtml = getOptionalString(formData, "contentHtml");
  const categoryId = getOptionalNumber(formData, "categoryId");
  const publishedAtInput = getOptionalString(formData, "publishedAt");
  const publishedAt = publishedAtInput ? parsePublishedAtInput(publishedAtInput) : null;
  const tagIds = formData
    .getAll("tagIds")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  const postId = getOptionalPostId(formData, "postId");
  const admin = await getCurrentAdmin();
  const siteSettings = await getSiteSettings();
  const authorId = admin?.id ?? null;
  const authorName =
    (admin?.user_metadata?.display_name as string | undefined) ??
    siteSettings?.authorName ??
    admin?.email ??
    siteConfig.author;

  try {
    const post = await savePostDraft({
      id: postId ?? undefined,
      title,
      slug,
      summary,
      content: content as unknown as Prisma.JsonValue,
      contentHtml,
      status: currentStatus,
      categoryId,
      publishedAt,
      tagIds,
      authorId,
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
    if (isUniqueConstraintError(error)) {
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
function getRequiredPostId(formData: FormData, key: string) {
  const value = getOptionalPostId(formData, key);
  if (value === null) throw new Error(`请填写${key}。`);
  return value;
}

function getOptionalPostId(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);
  if (!value) return null;
  if (!/^\d+$/.test(value)) throw new Error("请填写有效的文章编号。");
  return Number(value);
}

function parseRichTextContent(formData: FormData) {
  const raw = getOptionalString(formData, "content");

  if (!raw) {
    return null;
  }

  const parsed = parseStoredRichTextContent(raw);

  if (parsed === raw) {
    throw new Error("请填写有效的正文内容。");
  }

  return parsed;
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

