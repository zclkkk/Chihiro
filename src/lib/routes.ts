export function getPostCategorySegment(categorySlug: string | null | undefined) {
  return categorySlug?.trim() || "uncategorized";
}

export function getPostPath(input: {
  slug: string;
  categorySlug?: string | null;
}) {
  return `/posts/${getPostCategorySegment(input.categorySlug)}/${input.slug}`;
}

export function getTimelinePath(input: {
  type?: "all" | "posts" | "updates";
} = {}) {
  const params = new URLSearchParams();

  if (input.type && input.type !== "all") {
    params.set("type", input.type);
  }

  const query = params.toString();
  return query ? `/timeline?${query}` : "/timeline";
}

type UpdatesSortValue = "latest" | "earliest";

export function getUpdatesPath(input: {
  sort?: UpdatesSortValue;
  page?: number;
  anchor?: string;
} = {}) {
  const params = new URLSearchParams();

  if (input.sort && input.sort !== "latest") {
    params.set("sort", input.sort);
  }

  if (typeof input.page === "number" && input.page > 1) {
    params.set("page", String(input.page));
  }

  const query = params.toString();
  const base = query ? `/updates?${query}` : "/updates";

  return input.anchor ? `${base}#${input.anchor}` : base;
}

export function getUpdateAnchorPath(input: {
  updateId: string | number;
  sort?: UpdatesSortValue;
  page?: number;
}) {
  return getUpdatesPath({
    sort: input.sort,
    page: input.page,
    anchor: `update-${input.updateId}`,
  });
}
