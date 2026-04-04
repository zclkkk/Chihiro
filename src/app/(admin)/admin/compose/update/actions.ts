"use server";

import { ContentStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/server/auth";
import {
  discardUpdateRevisionById,
  publishUpdateById,
  getUpdateByIdForAdmin,
  saveUpdate,
} from "@/server/repositories/updates";

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
  const updateId = getOptionalUpdateId(formData, "updateId");

  try {
    const update = await saveUpdate({
      id: updateId ?? undefined,
      title,
      slug,
      summary,
      content,
      contentHtml: renderContentHtml(content),
      status: currentStatus,
      categoryId,
      publishedAt,
      tagIds,
    });

    if (intent === "publish") {
      const publishedUpdate = await publishUpdateById(update.id);

      revalidateUpdateSurface(update.slug);
      revalidateUpdateSurface(publishedUpdate.slug);
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
    if (isUniqueSlugError(error)) {
      return {
        error: "这个 slug 已经被占用了，请换一个。",
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

  revalidateUpdateSurface(currentUpdate.slug);
  revalidateUpdateSurface(restoredUpdate.slug);
  revalidatePath("/admin/workbench");
  revalidatePath("/admin/compose/update");

  redirect(`/admin/compose/update?id=${encodeURIComponent(restoredUpdate.id)}`);
}

function getRequiredString(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
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

function getOptionalUpdateId(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error("请填写有效的动态编号。");
  }

  return Number(value);
}

function getRequiredUpdateId(formData: FormData, key: string) {
  const value = getOptionalUpdateId(formData, key);

  if (value === null) {
    throw new Error(`请填写 ${key}。`);
  }

  return value;
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

function renderContentHtml(content: string | null) {
  if (!content) {
    return null;
  }

  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return null;
  }

  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isUniqueSlugError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function revalidateUpdateSurface(slug: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/workbench");
  revalidatePath("/");
  revalidatePath("/archives");
  revalidatePath("/updates");
  revalidatePath(`/updates/${slug}`);
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
}
