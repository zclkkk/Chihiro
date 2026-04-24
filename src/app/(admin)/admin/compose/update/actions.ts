"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseStoredRichTextContent } from "@/lib/rich-text-content";
import { requireAdmin } from "@/server/auth";
import {
  discardUpdateRevisionById,
  publishUpdateById,
  getUpdateByIdForAdmin,
  saveUpdate,
} from "@/server/supabase/updates";
import { getSiteSettings } from "@/server/supabase/site";
import { siteConfig } from "@/lib/site";
import { CONTENT_STATUS, type ContentStatus } from "@/types/domain";

export type SaveUpdateEditorState = {
  error: string | null;
  redirectTo: string | null;
};

export async function saveUpdateAction(
  _previousState: SaveUpdateEditorState,
  formData: FormData,
): Promise<SaveUpdateEditorState> {
  await requireAdmin();
  const intent = getOptionalString(formData, "intent") ?? "save";
  const currentStatus = getContentStatus(formData, "currentStatus");

  const publishedAtInput = getOptionalString(formData, "publishedAt");
  const publishedAt = publishedAtInput ? parsePublishedAtInput(publishedAtInput) : null;
  const updateId = getOptionalString(formData, "updateId");
  const siteSettings = await getSiteSettings();
  const fallbackAuthorName = siteSettings?.authorName ?? siteConfig.author;
  const content = parseRichTextContent(formData);
  const contentHtml = getOptionalString(formData, "contentHtml");

  try {
    const update = await saveUpdate({
      id: updateId ?? undefined,
      content,
      contentHtml,
      authorName: fallbackAuthorName,
      status: currentStatus,
      publishedAt,
    });

    if (intent === "publish") {
      await publishUpdateById(update.id);

      revalidateUpdateSurface();
    }

    revalidatePath("/admin/workbench");
    revalidatePath("/admin/compose/update");

    if (intent !== "publish" && !updateId) {
      return {
        error: null,
        redirectTo: `/admin/compose/update?id=${encodeURIComponent(update.id)}`,
      };
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        error: "保存动态时遇到了重复值，请稍后再试。",
        redirectTo: null,
      };
    }

    return {
      error: error instanceof Error ? error.message : "保存动态时出错了。",
      redirectTo: null,
    };
  }

  if (intent === "publish") {
    redirect("/admin/workbench?tab=updates");
  }

  return {
    error: null,
    redirectTo: null,
  };
}

export async function discardUpdateRevisionAction(formData: FormData) {
  await requireAdmin();
  const updateId = getRequiredString(formData, "updateId");
  const currentUpdate = await getUpdateByIdForAdmin(updateId);

  if (!currentUpdate) {
    throw new Error("草稿不存在或已被删除。");
  }

  if (!currentUpdate.hasDraftRevision) {
    throw new Error("这条动态没有可以删除的草稿。");
  }

  const restoredUpdate = await discardUpdateRevisionById(updateId);

  revalidateUpdateSurface();
  revalidatePath("/admin/workbench");
  revalidatePath("/admin/compose/update");

  redirect(`/admin/compose/update?id=${encodeURIComponent(restoredUpdate.id)}`);
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function getRequiredString(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    throw new Error(`请填写 ${key}。`);
  }

  return value;
}

function getContentStatus(formData: FormData, key: string): ContentStatus {
  const value = getOptionalString(formData, key);

  return value === CONTENT_STATUS.PUBLISHED ? CONTENT_STATUS.PUBLISHED : CONTENT_STATUS.DRAFT;
}

function parseRichTextContent(formData: FormData) {
  const raw = getOptionalString(formData, "content");

  if (!raw) {
    return null;
  }

  return parseStoredRichTextContent(raw);
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

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as any).code === "23505"
  );
}

function revalidateUpdateSurface() {
  revalidatePath("/admin");
  revalidatePath("/admin/workbench");
  revalidatePath("/");
  revalidatePath("/timeline");
  revalidatePath("/updates");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
}
