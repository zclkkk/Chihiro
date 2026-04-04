"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPostPath } from "@/lib/routes";
import { requireAdminSession } from "@/server/auth";
import {
  deletePostById,
  publishPostById,
  unpublishPostById,
} from "@/server/repositories/posts";
import {
  publishUpdateById,
  unpublishUpdateById,
} from "@/server/repositories/updates";

export async function publishPostAction(formData: FormData) {
  await requireAdminSession();
  const id = getRequiredPostId(formData, "id");
  const post = await publishPostById(id);

  revalidatePostSurface(post.slug, post.category?.slug);
  redirect("/admin/workbench?tab=posts");
}

export async function unpublishPostAction(formData: FormData) {
  await requireAdminSession();
  const id = getRequiredPostId(formData, "id");
  const post = await unpublishPostById(id);

  revalidatePostSurface(post.slug, post.category?.slug);
  redirect("/admin/workbench?tab=posts");
}

export async function deletePostAction(formData: FormData) {
  await requireAdminSession();
  const id = getRequiredPostId(formData, "id");
  const post = await deletePostById(id);

  revalidatePostSurface(post.slug, post.category?.slug);
  redirect("/admin/workbench?tab=posts");
}

export async function publishUpdateAction(formData: FormData) {
  await requireAdminSession();
  const id = getRequiredId(formData, "id");
  const update = await publishUpdateById(id);

  revalidateUpdateSurface(update.slug);
  redirect("/admin/workbench?tab=updates");
}

export async function unpublishUpdateAction(formData: FormData) {
  await requireAdminSession();
  const id = getRequiredId(formData, "id");
  const update = await unpublishUpdateById(id);

  revalidateUpdateSurface(update.slug);
  redirect("/admin/workbench?tab=updates");
}

function revalidatePostSurface(slug: string, categorySlug?: string | null) {
  revalidatePath("/admin");
  revalidatePath("/admin/workbench");
  revalidatePath("/");
  revalidatePath("/archives");
  revalidatePath("/posts");
  revalidatePath(getPostPath({ slug, categorySlug }));
  revalidatePath(`/posts/${slug}`);
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
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

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing form field: ${key}`);
  }

  return value;
}

function getRequiredPostId(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);

  if (!/^\d+$/.test(value)) {
    throw new Error("请填写有效的文章编号。");
  }

  return Number(value);
}

function getRequiredId(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);

  if (!/^\d+$/.test(value)) {
    throw new Error("请填写有效的编号。");
  }

  return Number(value);
}
