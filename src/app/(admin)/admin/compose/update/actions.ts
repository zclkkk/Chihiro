"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseStoredRichTextContent } from "@/lib/rich-text-content";
import { getContentStatus, getOptionalString } from "@/lib/form-helpers";
import { parsePublishedAtInput } from "@/lib/date-parse";
import { isUniqueConstraintError } from "@/lib/prisma-errors";
import { getCurrentAdmin, requireAdminSession } from "@/server/auth";
import { revalidateUpdateSurface } from "@/server/revalidation";
import {
  discardUpdateRevisionById,
  publishUpdateById,
  getUpdateByIdForAdmin,
  saveUpdate,
} from "@/server/repositories/updates";
import { getSiteSettings } from "@/server/repositories/site";
import { siteConfig } from "@/lib/site";

export type SaveUpdateEditorState = {
  error: string | null;
  redirectTo: string | null;
};

export async function saveUpdateAction(
  _previousState: SaveUpdateEditorState,
  formData: FormData,
): Promise<SaveUpdateEditorState> {
  await requireAdminSession();
  const intent = getOptionalString(formData, "intent") ?? "save";
  const currentStatus = getContentStatus(formData, "currentStatus");

  const publishedAtInput = getOptionalString(formData, "publishedAt");
  const publishedAt = publishedAtInput ? parsePublishedAtInput(publishedAtInput) : null;
  const updateId = getOptionalUpdateId(formData, "updateId");
  const admin = await getCurrentAdmin();
  const siteSettings = await getSiteSettings();
  const authorId = admin?.id ?? null;
  const fallbackAuthorName =
    (admin?.user_metadata?.display_name as string | undefined) ??
    siteSettings?.authorName ??
    admin?.email ??
    siteConfig.author;
  const content = parseRichTextContent(formData);
  const contentHtml = getOptionalString(formData, "contentHtml");

  try {
    const update = await saveUpdate({
      id: updateId ?? undefined,
      content: content as unknown as Prisma.JsonValue,
      contentHtml,
      authorId,
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

    if (intent !== "publish" && typeof updateId !== "number") {
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
  await requireAdminSession();
  const updateId = getRequiredUpdateId(formData, "updateId");
  const currentUpdate = await getUpdateByIdForAdmin(updateId);

  if (!currentUpdate) {
    throw new Error("草稿不存在或已被删除。");
  }

  if (!currentUpdate.draftSnapshot) {
    throw new Error("这条动态没有可以删除的草稿。");
  }

  const restoredUpdate = await discardUpdateRevisionById(updateId);

  revalidateUpdateSurface();
  revalidatePath("/admin/workbench");
  revalidatePath("/admin/compose/update");

  redirect(`/admin/compose/update?id=${encodeURIComponent(restoredUpdate.id)}`);
}

function getOptionalUpdateId(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);
  if (!value) return null;
  if (!/^\d+$/.test(value)) throw new Error("请填写有效的动态编号。");
  return Number(value);
}

function getRequiredUpdateId(formData: FormData, key: string) {
  const value = getOptionalUpdateId(formData, key);
  if (value === null) throw new Error(`请填写${key}。`);
  return value;
}

function parseRichTextContent(formData: FormData) {
  const raw = getOptionalString(formData, "content");

  if (!raw) {
    return null;
  }

  return parseStoredRichTextContent(raw);
}

