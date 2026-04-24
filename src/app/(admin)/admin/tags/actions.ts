"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import {
  createTag,
  updateTagById,
  deleteTagById,
} from "@/server/supabase/tags";
import type { TagOption } from "@/types/domain";

export type TagFormState = {
  error: string | null;
  createdTag: TagOption | null;
};

export async function createTagAction(
  _previousState: TagFormState,
  formData: FormData,
): Promise<TagFormState> {
  await requireAdmin();

  const name = getRequiredString(formData, "name");
  const slug = getRequiredString(formData, "slug");
  const inlineCreate = getOptionalString(formData, "inlineCreate") === "1";

  try {
    const tag = await createTag({ name, slug: normalizeSlug(slug) });

    revalidateTagSurface();

    if (inlineCreate) {
      return { error: null, createdTag: tag };
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: "这个 slug 已经被占用了，请换一个。", createdTag: null };
    }

    return { error: error instanceof Error ? error.message : "创建标签时出错了。", createdTag: null };
  }

  redirect("/admin/workbench?tab=tags");
}

export async function updateTagAction(
  _previousState: TagFormState,
  formData: FormData,
): Promise<TagFormState> {
  await requireAdmin();

  const id = getRequiredString(formData, "id");
  const name = getRequiredString(formData, "name");
  const slug = getRequiredString(formData, "slug");

  try {
    await updateTagById({ id, name, slug: normalizeSlug(slug) });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: "这个 slug 已经被占用了，请换一个。", createdTag: null };
    }

    return { error: error instanceof Error ? error.message : "更新标签时出错了。", createdTag: null };
  }

  revalidateTagSurface();
  redirect("/admin/workbench?tab=tags");
}

export async function deleteTagAction(formData: FormData) {
  await requireAdmin();

  const id = getRequiredString(formData, "id");

  try {
    await deleteTagById(id);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "删除标签时出错了。",
    );
  }

  revalidateTagSurface();
  redirect("/admin/workbench?tab=tags");
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

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as any).code === "23505"
  );
}

function revalidateTagSurface() {
  revalidatePath("/admin");
  revalidatePath("/admin/workbench");
  revalidatePath("/");
  revalidatePath("/posts");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
}
