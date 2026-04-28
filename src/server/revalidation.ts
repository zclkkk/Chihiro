import "server-only";

import { revalidatePath } from "next/cache";
import { getPostPath } from "@/lib/routes";

export function revalidatePostSurface(slug: string, categorySlug?: string | null) {
  revalidatePath("/admin");
  revalidatePath("/admin/workbench");
  revalidatePath("/");
  revalidatePath("/timeline");
  revalidatePath("/posts");
  revalidatePath(getPostPath({ slug, categorySlug }));
  revalidatePath(`/posts/${slug}`);
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
}

export function revalidateUpdateSurface() {
  revalidatePath("/admin");
  revalidatePath("/admin/workbench");
  revalidatePath("/");
  revalidatePath("/timeline");
  revalidatePath("/updates");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
}
