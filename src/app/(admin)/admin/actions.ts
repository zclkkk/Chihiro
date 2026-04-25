"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPostPath } from "@/lib/routes";
import { requireAdmin } from "@/server/auth";
import { createAsset } from "@/server/supabase/assets";
import {
  deletePostById,
  publishPostById,
  unpublishPostById,
} from "@/server/supabase/posts";
import {
  deleteUpdateById,
  publishUpdateById,
  unpublishUpdateById,
} from "@/server/supabase/updates";
import type { AssetKind } from "@/types/domain";

export async function publishPostAction(formData: FormData) {
  await requireAdmin();
  const id = getRequiredId(formData, "id");
  const post = await publishPostById(id);

  revalidatePostSurface(post.slug, post.category?.slug);
  redirect("/admin/workbench?tab=posts");
}

export async function unpublishPostAction(formData: FormData) {
  await requireAdmin();
  const id = getRequiredId(formData, "id");
  const post = await unpublishPostById(id);

  revalidatePostSurface(post.slug, post.category?.slug);
  redirect("/admin/workbench?tab=posts");
}

export async function deletePostAction(formData: FormData) {
  await requireAdmin();
  const id = getRequiredId(formData, "id");
  const post = await deletePostById(id);

  revalidatePostSurface(post.slug, post.category?.slug);
  redirect("/admin/workbench?tab=posts");
}

export async function publishUpdateAction(formData: FormData) {
  await requireAdmin();
  const id = getRequiredId(formData, "id");
  await publishUpdateById(id);

  revalidateUpdateSurface();
  redirect("/admin/workbench?tab=updates");
}

export async function unpublishUpdateAction(formData: FormData) {
  await requireAdmin();
  const id = getRequiredId(formData, "id");
  await unpublishUpdateById(id);

  revalidateUpdateSurface();
  redirect("/admin/workbench?tab=updates");
}

export async function deleteUpdateAction(formData: FormData) {
  await requireAdmin();
  const id = getRequiredId(formData, "id");
  await deleteUpdateById(id);

  revalidateUpdateSurface();
  redirect("/admin/workbench?tab=updates");
}

function revalidatePostSurface(slug: string, categorySlug?: string | null) {
  revalidatePath("/admin");
  revalidatePath("/admin/workbench");
  revalidatePath("/");
  revalidatePath("/timeline");
  revalidatePath("/posts");
  revalidatePath(getPostPath({ slug, categorySlug }));
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
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

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing form field: ${key}`);
  }

  return value;
}

function getRequiredId(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);
  return value;
}

export async function createAssetAction(input: {
  kind: AssetKind;
  storagePath: string;
  mimeType?: string | null;
  size?: number | null;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
}) {
  await requireAdmin();
  return createAsset(input);
}
