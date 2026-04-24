"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import {
  createCategory,
  updateCategoryById,
  deleteCategoryById,
} from "@/server/supabase/categories";
import type { CategoryOption } from "@/types/domain";

export type CategoryFormState = {
  error: string | null;
  createdCategory: CategoryOption | null;
};

export async function createCategoryAction(
  _previousState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();

  const name = getRequiredString(formData, "name");
  const slug = getRequiredString(formData, "slug");
  const description = getOptionalString(formData, "description");
  const inlineCreate = getOptionalString(formData, "inlineCreate") === "1";

  try {
    const category = await createCategory({ name, slug: normalizeSlug(slug), description });

    revalidateCategorySurface();

    if (inlineCreate) {
      return { error: null, createdCategory: category };
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: "这个 slug 已经被占用了，请换一个。", createdCategory: null };
    }

    return { error: error instanceof Error ? error.message : "创建分类时出错了。", createdCategory: null };
  }

  redirect("/admin/workbench?tab=categories");
}

export async function updateCategoryAction(
  _previousState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();

  const id = getRequiredString(formData, "id");
  const name = getRequiredString(formData, "name");
  const slug = getRequiredString(formData, "slug");
  const description = getOptionalString(formData, "description");

  try {
    await updateCategoryById({ id, name, slug: normalizeSlug(slug), description });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: "这个 slug 已经被占用了，请换一个。", createdCategory: null };
    }

    return { error: error instanceof Error ? error.message : "更新分类时出错了。", createdCategory: null };
  }

  revalidateCategorySurface();
  redirect("/admin/workbench?tab=categories");
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdmin();

  const id = getRequiredString(formData, "id");

  try {
    await deleteCategoryById(id);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "删除分类时出错了。",
    );
  }

  revalidateCategorySurface();
  redirect("/admin/workbench?tab=categories");
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

function revalidateCategorySurface() {
  revalidatePath("/admin");
  revalidatePath("/admin/workbench");
  revalidatePath("/");
  revalidatePath("/posts");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
}
