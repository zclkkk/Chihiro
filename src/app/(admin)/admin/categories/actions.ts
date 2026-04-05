"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCategory,
  deleteCategoryById,
  updateCategoryById,
} from "@/server/repositories/categories";
import { requireAdminSession } from "@/server/auth";

export type SaveCategoryEditorState = {
  error: string | null;
  redirectTo: string | null;
  createdCategory: Awaited<ReturnType<typeof createCategory>> | null;
};

export async function saveCategoryAction(
  _previousState: SaveCategoryEditorState,
  formData: FormData,
): Promise<SaveCategoryEditorState> {
  await requireAdminSession();
  const id = getRequiredId(formData, "id");
  const name = getRequiredString(formData, "name");
  const slug = normalizeSlug(getRequiredString(formData, "slug"));
  const description = getOptionalString(formData, "description");

  try {
    const category = await updateCategoryById({
      id,
      name,
      slug,
      description,
    });

    revalidateCategorySurfaces(category.id, category.slug);
  } catch (error) {
    if (isUniqueSlugError(error)) {
      return {
        error: "这个 slug 已经被占用了，请换一个。",
        redirectTo: null,
        createdCategory: null,
      };
    }

    return {
      error: error instanceof Error ? error.message : "保存分类时出错了。",
      redirectTo: null,
      createdCategory: null,
    };
  }

  return {
    error: null,
    redirectTo: "/admin/workbench?tab=categories",
    createdCategory: null,
  };
}

export async function createCategoryAction(
  _previousState: SaveCategoryEditorState,
  formData: FormData,
): Promise<SaveCategoryEditorState> {
  await requireAdminSession();
  const name = getRequiredString(formData, "name");
  const slug = normalizeSlug(getRequiredString(formData, "slug"));
  const description = getOptionalString(formData, "description");
  const inlineCreate = getOptionalString(formData, "inlineCreate") === "1";

  try {
    const category = await createCategory({
      name,
      slug,
      description,
    });

    revalidateCategorySurfaces(category.id, category.slug);

    if (inlineCreate) {
      return {
        error: null,
        redirectTo: null,
        createdCategory: category,
      };
    }
  } catch (error) {
    if (isUniqueSlugError(error)) {
      return {
        error: "这个 slug 已经被占用了，请换一个。",
        redirectTo: null,
        createdCategory: null,
      };
    }

    return {
      error: error instanceof Error ? error.message : "创建分类时出错了。",
      redirectTo: null,
      createdCategory: null,
    };
  }

  return {
    error: null,
    redirectTo: "/admin/workbench?tab=categories",
    createdCategory: null,
  };
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdminSession();
  const id = getRequiredId(formData, "id");
  const category = await deleteCategoryById(id);

  revalidateCategorySurfaces(category.id, category.slug);
  redirect(`/admin/workbench?tab=categories&deletedCategory=${encodeURIComponent(category.id)}`);
}

function revalidateCategorySurfaces(id: number, slug: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/workbench");
  revalidatePath(`/admin/categories/${id}`);
  revalidatePath("/");
  revalidatePath("/posts");
  revalidatePath("/timeline");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
  revalidatePath(`/posts?category=${encodeURIComponent(slug)}`);
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`请填写 ${key}。`);
  }

  return value.trim();
}

function getRequiredId(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);

  if (!/^\d+$/.test(value)) {
    throw new Error(`请填写有效的编号。`);
  }

  return Number(value);
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

function isUniqueSlugError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
