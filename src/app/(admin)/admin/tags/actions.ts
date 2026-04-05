"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createTag,
  deleteTagById,
  getTagByIdForAdmin,
  updateTagById,
} from "@/server/repositories/tags";
import { requireAdminSession } from "@/server/auth";
import type { TagItem } from "@/server/repositories/tags";

export type SaveTagEditorState = {
  error: string | null;
  redirectTo: string | null;
  createdTag: TagItem | null;
};

export async function createTagAction(
  _previousState: SaveTagEditorState,
  formData: FormData,
): Promise<SaveTagEditorState> {
  await requireAdminSession();
  const name = getRequiredString(formData, "name");
  const slug = normalizeSlug(getRequiredString(formData, "slug"));
  const inlineCreate = getOptionalString(formData, "inlineCreate") === "1";

  try {
    const tag = await createTag({
      name,
      slug,
    });

    revalidateTagSurfaces(tag.id, tag.slug);

    if (inlineCreate) {
      return {
        error: null,
        redirectTo: null,
        createdTag: tag,
      };
    }
  } catch (error) {
    if (isUniqueSlugError(error)) {
      return {
        error: "这个 slug 已经被占用了，请换一个。",
        redirectTo: null,
        createdTag: null,
      };
    }

    return {
      error: error instanceof Error ? error.message : "创建标签时出错了。",
      redirectTo: null,
      createdTag: null,
    };
  }

  return {
    error: null,
    redirectTo: "/admin/workbench?tab=tags",
    createdTag: null,
  };
}

export async function saveTagAction(
  _previousState: SaveTagEditorState,
  formData: FormData,
): Promise<SaveTagEditorState> {
  await requireAdminSession();
  const id = getRequiredString(formData, "id");
  const name = getRequiredString(formData, "name");
  const slug = normalizeSlug(getRequiredString(formData, "slug"));

  try {
    const currentTag = await getTagByIdForAdmin(id);
    if (!currentTag) {
      return {
        error: "标签不存在。",
        redirectTo: null,
        createdTag: null,
      };
    }

    const tag = await updateTagById({
      id,
      name,
      slug,
    });

    revalidateTagSurfaces(currentTag.id, currentTag.slug);
    revalidateTagSurfaces(tag.id, tag.slug);
  } catch (error) {
    if (isUniqueSlugError(error)) {
      return {
        error: "这个 slug 已经被占用了，请换一个。",
        redirectTo: null,
        createdTag: null,
      };
    }

    return {
      error: error instanceof Error ? error.message : "保存标签时出错了。",
      redirectTo: null,
      createdTag: null,
    };
  }

  return {
    error: null,
    redirectTo: "/admin/workbench?tab=tags",
    createdTag: null,
  };
}

export async function deleteTagAction(formData: FormData) {
  await requireAdminSession();
  const id = getRequiredString(formData, "id");
  const currentTag = await getTagByIdForAdmin(id);

  if (!currentTag) {
    throw new Error("标签不存在。");
  }

  const tag = await deleteTagById(id);

  revalidateTagSurfaces(currentTag.id, currentTag.slug);
  revalidateTagSurfaces(tag.id, tag.slug);
  redirect("/admin/workbench?tab=tags");
}

function revalidateTagSurfaces(id: string, slug: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/workbench");
  revalidatePath(`/admin/tags/${id}`);
  revalidatePath("/");
  revalidatePath("/posts");
  revalidatePath("/updates");
  revalidatePath("/timeline");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
  revalidatePath(`/posts?tag=${encodeURIComponent(slug)}`);
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`请填写 ${key}。`);
  }

  return value.trim();
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
