export function getPostCategorySegment(categorySlug: string | null | undefined) {
  return categorySlug?.trim() || "uncategorized";
}

export function getPostPath(input: {
  slug: string;
  categorySlug?: string | null;
}) {
  return `/posts/${getPostCategorySegment(input.categorySlug)}/${input.slug}`;
}
