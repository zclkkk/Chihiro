"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  publishPostById,
  unpublishPostById,
} from "@/server/repositories/posts";
import {
  publishUpdateById,
  unpublishUpdateById,
} from "@/server/repositories/updates";

export async function publishPostAction(formData: FormData) {
  const id = getRequiredString(formData, "id");
  const post = await publishPostById(id);

  revalidatePostSurface(post.slug);
  redirect("/admin");
}

export async function unpublishPostAction(formData: FormData) {
  const id = getRequiredString(formData, "id");
  const post = await unpublishPostById(id);

  revalidatePostSurface(post.slug);
  redirect("/admin");
}

export async function publishUpdateAction(formData: FormData) {
  const id = getRequiredString(formData, "id");
  const update = await publishUpdateById(id);

  revalidateUpdateSurface(update.slug);
  redirect("/admin");
}

export async function unpublishUpdateAction(formData: FormData) {
  const id = getRequiredString(formData, "id");
  const update = await unpublishUpdateById(id);

  revalidateUpdateSurface(update.slug);
  redirect("/admin");
}

function revalidatePostSurface(slug: string) {
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/archives");
  revalidatePath("/posts");
  revalidatePath(`/posts/${slug}`);
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
}

function revalidateUpdateSurface(slug: string) {
  revalidatePath("/admin");
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
