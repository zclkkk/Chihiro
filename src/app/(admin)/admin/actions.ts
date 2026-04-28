"use server";

import { redirect } from "next/navigation";
import { getRequiredString } from "@/lib/form-helpers";
import { requireAdminSession } from "@/server/auth";
import { revalidatePostSurface, revalidateUpdateSurface } from "@/server/revalidation";
import {
  deletePostById,
  publishPostById,
  unpublishPostById,
} from "@/server/repositories/posts";
import {
  deleteUpdateById,
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
  await publishUpdateById(id);

  revalidateUpdateSurface();
  redirect("/admin/workbench?tab=updates");
}

export async function unpublishUpdateAction(formData: FormData) {
  await requireAdminSession();
  const id = getRequiredId(formData, "id");
  await unpublishUpdateById(id);

  revalidateUpdateSurface();
  redirect("/admin/workbench?tab=updates");
}

export async function deleteUpdateAction(formData: FormData) {
  await requireAdminSession();
  const id = getRequiredId(formData, "id");
  await deleteUpdateById(id);

  revalidateUpdateSurface();
  redirect("/admin/workbench?tab=updates");
}

function getRequiredPostId(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);
  if (!/^\d+$/.test(value)) throw new Error("请填写有效的文章编号。");
  return Number(value);
}

function getRequiredId(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);
  if (!/^\d+$/.test(value)) throw new Error("请填写有效的编号。");
  return Number(value);
}
