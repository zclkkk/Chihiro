import { CategoryKind, ContentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";

const postInclude = {
  category: true,
  coverAsset: true,
  tags: {
    include: {
      tag: true,
    },
  },
} satisfies Prisma.PostInclude;

type PostRecord = Prisma.PostGetPayload<{
  include: typeof postInclude;
}>;

export type PostListSort = "latest" | "earliest" | "updated";

export type PostItem = {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  status: ContentStatus;
  content: Prisma.JsonValue | null;
  contentHtml: string | null;
  authorId: string | null;
  authorName: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  publishedSnapshot: PublishedPostSnapshot | null;
  draftSnapshot: DraftPostSnapshot | null;
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
  coverAsset: AssetSummary | null;
  tags: TagSummary[];
};

export type PostListResult = {
  items: PostItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type PostNavigationItem = {
  id: number;
  title: string;
  slug: string;
  publishedAt: string | null;
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
};

export type PostNavigationCategory = {
  slug: string;
  label: string;
  contentCount: number;
  posts: Array<{
    id: number;
    title: string;
    slug: string;
  }>;
};

type AssetSummary = {
  id: string;
  url: string;
  alt: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
};

type TagSummary = {
  id: string;
  name: string;
  slug: string;
};

type PublishedPostSnapshot = {
  title: string;
  slug: string;
  summary: string | null;
  content: Prisma.JsonValue | null;
  contentHtml: string | null;
  authorId: string | null;
  authorName: string | null;
  publishedAt: string | null;
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
  coverAsset: AssetSummary | null;
  tags: TagSummary[];
};

type DraftPostSnapshot = PublishedPostSnapshot & {
  savedAt: string;
};

export type ListPublishedPostsOptions = {
  page?: number;
  pageSize?: number;
  sort?: PostListSort;
  categorySlug?: string;
  tagSlugs?: string[];
  query?: string;
};

export async function listPostsForAdmin(): Promise<PostItem[]> {
  const items = await prisma.post.findMany({
    include: postInclude,
    orderBy: [{ updatedAt: Prisma.SortOrder.desc }, { createdAt: Prisma.SortOrder.desc }],
  });

  return items.map(mapPostRecord);
}

export async function getPostByIdForAdmin(id: number): Promise<PostItem | null> {
  const post = await prisma.post.findUnique({
    where: { id },
    include: postInclude,
  });

  return post ? mapPostRecord(post) : null;
}

export type SavePostDraftInput = {
  id?: number;
  title: string;
  slug: string | null;
  summary: string | null;
  content: Prisma.JsonValue | null;
  contentHtml: string | null;
  status: ContentStatus;
  categoryId: number | null;
  publishedAt: Date | null;
  tagIds: string[];
  authorId: string | null;
  authorName: string | null;
};

export async function savePostDraft(input: SavePostDraftInput): Promise<PostItem> {
  const tagIds = Array.from(new Set(input.tagIds.filter(Boolean)));
  const resolvedSlug = input.slug ?? (typeof input.id === "number" ? String(input.id) : null);
  if (typeof input.id === "number" && input.status === ContentStatus.PUBLISHED) {
    const current = await prisma.post.findUnique({
      where: { id: input.id },
      include: postInclude,
    });

    if (!current) {
      throw new Error(`Post not found: ${input.id}`);
    }

    const category = input.categoryId
      ? await prisma.category.findUnique({
          where: { id: input.categoryId },
          select: { id: true, name: true, slug: true },
        })
      : null;
    const tags =
      tagIds.length > 0
        ? await prisma.tag.findMany({
            where: { id: { in: tagIds } },
            select: { id: true, name: true, slug: true },
          })
        : [];

    const draftSnapshot = buildDraftSnapshot({
      title: input.title,
      slug: resolvedSlug ?? current.slug,
      summary: input.summary,
      content: input.content,
      contentHtml: input.contentHtml,
      authorId: input.authorId,
      authorName: input.authorName,
      publishedAt: input.publishedAt,
      category,
      coverAsset: current.coverAsset,
      tags,
    });

    const post = await prisma.post.update({
      where: { id: input.id },
      data: {
        draftSnapshot,
      },
      include: postInclude,
    });

    return mapPostRecord(post);
  }

  const baseData = {
    title: input.title,
    summary: input.summary,
    content: input.content ?? Prisma.DbNull,
    contentHtml: input.contentHtml,
    authorId: input.authorId,
    authorName: input.authorName,
    publishedAt: input.publishedAt,
    status: input.status,
  };
  const nextTags =
    tagIds.length > 0
      ? {
          create: tagIds.map((tagId) => ({
            tag: {
              connect: { id: tagId },
            },
          })),
        }
      : {};
  const updateData = {
    ...baseData,
    slug: resolvedSlug ?? undefined,
    category: input.categoryId
      ? {
          connect: { id: input.categoryId },
        }
      : {
          disconnect: true,
        },
    tags: {
      deleteMany: {},
      ...nextTags,
    },
  } satisfies Prisma.PostUpdateInput;
  const createData = {
    ...baseData,
    slug: resolvedSlug ?? createTemporarySlug(),
    ...(input.categoryId
      ? {
          category: {
            connect: { id: input.categoryId },
          },
        }
      : {}),
    ...(tagIds.length > 0
      ? {
          tags: nextTags,
        }
      : {}),
  } satisfies Prisma.PostCreateInput;

  const post = input.id
    ? await prisma.post.update({
        where: { id: input.id },
        data: {
          ...updateData,
          draftSnapshot: Prisma.DbNull,
        },
        include: postInclude,
      })
    : await prisma.post.create({
        data: createData,
        include: postInclude,
      });

  if (typeof input.id !== "number" && !input.slug && post.slug !== String(post.id)) {
    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      data: {
        slug: String(post.id),
      },
      include: postInclude,
    });

    return mapPostRecord(updatedPost);
  }

  return mapPostRecord(post);
}

export async function listPublishedPosts(
  options: ListPublishedPostsOptions = {},
): Promise<PostListResult> {
  const pageSize = getSafePageSize(options.pageSize);
  const page = getSafePage(options.page);
  const items = await listAllPublishedPosts(options);
  const totalCount = items.length;
  const sortedItems = sortPublishedPosts(items, options.sort);
  const paginatedItems = sortedItems.slice((page - 1) * pageSize, page * pageSize);

  return {
    items: paginatedItems,
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function listAllPublishedPosts(
  options: Omit<ListPublishedPostsOptions, "page" | "pageSize"> = {},
): Promise<PostItem[]> {
  const records = await prisma.post.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
    },
    include: postInclude,
  });

  const items = records.map(mapPublishedPostRecord);
  return filterPublishedPosts(items, options);
}

export async function listRecentPublishedPostsForNavigation(
  limit = 5,
): Promise<PostNavigationItem[]> {
  const records = await prisma.post.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
    },
    orderBy: [{ publishedAt: Prisma.SortOrder.desc }, { updatedAt: Prisma.SortOrder.desc }],
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      publishedAt: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  return records.map((record) => ({
    id: record.id,
    title: record.title,
    slug: record.slug,
    publishedAt: record.publishedAt?.toISOString() ?? null,
    category: record.category,
  }));
}

export async function listPublishedPostCategoriesForNavigation(
  limitPerCategory = 5,
): Promise<PostNavigationCategory[]> {
  const [categories, categoryCounts, uncategorizedPosts, uncategorizedCount] = await Promise.all([
    prisma.category.findMany({
      where: {
        kind: CategoryKind.POST,
        posts: {
          some: {
            status: ContentStatus.PUBLISHED,
          },
        },
      },
      orderBy: [{ name: Prisma.SortOrder.asc }],
      select: {
        id: true,
        name: true,
        slug: true,
        posts: {
          where: {
            status: ContentStatus.PUBLISHED,
          },
          orderBy: [{ publishedAt: Prisma.SortOrder.desc }, { updatedAt: Prisma.SortOrder.desc }],
          take: limitPerCategory,
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    }),
    prisma.post.groupBy({
      by: ["categoryId"],
      where: {
        status: ContentStatus.PUBLISHED,
        categoryId: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.post.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
        categoryId: null,
      },
      orderBy: [{ publishedAt: Prisma.SortOrder.desc }, { updatedAt: Prisma.SortOrder.desc }],
      take: limitPerCategory,
      select: {
        id: true,
        title: true,
        slug: true,
      },
    }),
    prisma.post.count({
      where: {
        status: ContentStatus.PUBLISHED,
        categoryId: null,
      },
    }),
  ]);

  const categoryCountMap = new Map<number, number>();

  for (const row of categoryCounts) {
    if (typeof row.categoryId === "number") {
      categoryCountMap.set(row.categoryId, row._count._all);
    }
  }

  const items = categories.map((category) => ({
    slug: category.slug,
    label: category.name,
    contentCount: categoryCountMap.get(category.id) ?? category.posts.length,
    posts: category.posts,
  }));

  if (uncategorizedPosts.length > 0) {
    items.push({
      slug: "uncategorized",
      label: "Uncategorized",
      contentCount: uncategorizedCount,
      posts: uncategorizedPosts,
    });
  }

  return items;
}

export async function getPublishedPostBySlug(slug: string): Promise<PostItem | null> {
  const post = await listAllPublishedPosts();
  const found = post.find((item) => item.slug === slug);

  return found ?? null;
}

export async function getPublishedPostByCategoryAndSlug(
  categorySlug: string,
  slug: string,
): Promise<PostItem | null> {
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    return null;
  }

  const expectedCategorySlug = post.category?.slug ?? "uncategorized";

  if (expectedCategorySlug !== categorySlug) {
    return null;
  }

  return post;
}

export async function publishPostById(id: number): Promise<PostItem> {
  const current = await prisma.post.findUnique({
    where: { id },
    include: postInclude,
  });

  if (!current) {
    throw new Error(`Post not found: ${id}`);
  }

  const draftSnapshot = parsePublishedSnapshot(current.draftSnapshot);
  const publishedAt = current.publishedAt ?? new Date();
  const resolvedPublishedAt = draftSnapshot?.publishedAt ? new Date(draftSnapshot.publishedAt) : publishedAt;
  const updateData = draftSnapshot
    ? {
        title: draftSnapshot.title,
        slug: draftSnapshot.slug,
        summary: draftSnapshot.summary,
        content: draftSnapshot.content ?? Prisma.DbNull,
        contentHtml: draftSnapshot.contentHtml,
        authorId: draftSnapshot.authorId,
        authorName: draftSnapshot.authorName,
        publishedAt: resolvedPublishedAt,
        category: draftSnapshot.category
          ? {
              connect: { id: draftSnapshot.category.id },
            }
          : {
              disconnect: true,
            },
        coverAsset: draftSnapshot.coverAsset
          ? {
              connect: { id: draftSnapshot.coverAsset.id },
            }
          : {
              disconnect: true,
            },
        tags: {
          deleteMany: {},
          ...(draftSnapshot.tags.length > 0
            ? {
                create: draftSnapshot.tags.map((tag) => ({
                  tag: {
                    connect: { id: tag.id },
                  },
                })),
              }
            : {}),
        },
      }
    : {
        title: current.title,
        slug: current.slug,
        summary: current.summary,
        content: current.content ?? Prisma.DbNull,
        contentHtml: current.contentHtml,
        authorId: current.authorId,
        authorName: current.authorName,
        publishedAt,
        category: current.category
          ? {
              connect: { id: current.category.id },
            }
          : {
              disconnect: true,
            },
        coverAsset: current.coverAsset
          ? {
              connect: { id: current.coverAsset.id },
            }
          : {
              disconnect: true,
            },
        tags: {
          deleteMany: {},
          create: current.tags.map(({ tag }) => ({
            tag: {
              connect: { id: tag.id },
            },
          })),
        },
      };
  const publishedPost = await prisma.post.update({
    where: { id },
    data: {
      status: ContentStatus.PUBLISHED,
      ...updateData,
      publishedAt: resolvedPublishedAt,
      draftSnapshot: Prisma.DbNull,
    },
    include: postInclude,
  });

  const snapshot = buildPublishedSnapshot(publishedPost, resolvedPublishedAt);
  const post = await prisma.post.update({
    where: { id },
    data: {
      publishedSnapshot: snapshot,
    },
    include: postInclude,
  });

  return mapPostRecord(post);
}

export async function discardPostRevisionById(id: number): Promise<PostItem> {
  const current = await prisma.post.findUnique({
    where: { id },
    include: postInclude,
  });

  if (!current) {
    throw new Error(`Post not found: ${id}`);
  }

  const snapshot = parsePublishedSnapshot(current.publishedSnapshot);

  if (!snapshot) {
    throw new Error("这篇文章没有可以删除的草稿。");
  }

  const tagIds = snapshot.tags.map((tag) => tag.id);
  const post = await prisma.post.update({
    where: { id },
    data: {
      title: snapshot.title,
      slug: snapshot.slug,
      summary: snapshot.summary,
      content: snapshot.content ?? Prisma.DbNull,
      contentHtml: snapshot.contentHtml,
      authorName: snapshot.authorName,
      publishedAt: snapshot.publishedAt ? new Date(snapshot.publishedAt) : null,
      status: ContentStatus.PUBLISHED,
      category: snapshot.category
        ? {
            connect: { id: snapshot.category.id },
          }
        : {
            disconnect: true,
          },
      coverAsset: snapshot.coverAsset
        ? {
            connect: { id: snapshot.coverAsset.id },
          }
        : {
            disconnect: true,
          },
      tags: {
        deleteMany: {},
        ...(tagIds.length > 0
          ? {
              create: tagIds.map((tagId) => ({
                tag: {
                  connect: { id: tagId },
                },
              })),
            }
          : {}),
      },
      draftSnapshot: Prisma.DbNull,
    },
    include: postInclude,
  });

  return mapPostRecord(post);
}

export async function deletePostById(id: number): Promise<PostItem> {
  const post = await prisma.post.delete({
    where: { id },
    include: postInclude,
  });

  return mapPostRecord(post);
}

export async function unpublishPostById(id: number): Promise<PostItem> {
  const post = await prisma.post.update({
    where: { id },
    data: {
      status: ContentStatus.DRAFT,
      publishedAt: null,
    },
    include: postInclude,
  });

  return mapPostRecord(post);
}

export async function getPublishedPostSlugs(): Promise<string[]> {
  const posts = await listAllPublishedPosts();

  return posts.map((post) => post.slug);
}

export async function getPublishedPostRouteParams(): Promise<Array<{ category: string; slug: string }>> {
  const posts = await listAllPublishedPosts();

  return posts.map((post) => ({
    category: post.category?.slug ?? "uncategorized",
    slug: post.slug,
  }));
}

function getPostOrderBy(sort: PostListSort = "latest"): Prisma.PostOrderByWithRelationInput[] {
  if (sort === "earliest") {
    return [{ publishedAt: Prisma.SortOrder.asc }, { createdAt: Prisma.SortOrder.asc }];
  }

  if (sort === "updated") {
    return [{ updatedAt: Prisma.SortOrder.desc }];
  }

  return [{ publishedAt: Prisma.SortOrder.desc }, { createdAt: Prisma.SortOrder.desc }];
}

function filterPublishedPosts(
  items: PostItem[],
  options: Omit<ListPublishedPostsOptions, "page" | "pageSize">,
) {
  const tagSlugs = Array.from(new Set((options.tagSlugs ?? []).filter(Boolean)));
  const query = options.query?.trim().toLowerCase();

  return items.filter((item) => {
    if (options.categorySlug && item.category?.slug !== options.categorySlug) {
      return false;
    }

    if (
      tagSlugs.length > 0 &&
      !tagSlugs.every((slug) => item.tags.some((tag) => tag.slug === slug))
    ) {
      return false;
    }

    if (query) {
      const haystack = [
        item.title,
        item.summary ?? "",
        item.contentHtml ?? "",
        item.authorName ?? "",
        item.category?.name ?? "",
        ...item.tags.map((tag) => tag.name),
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

function sortPublishedPosts(items: PostItem[], sort: PostListSort = "latest") {
  const nextItems = [...items];

  if (sort === "earliest") {
    nextItems.sort((left, right) => comparePostDates(left.publishedAt, right.publishedAt));
    return nextItems;
  }

  if (sort === "updated") {
    nextItems.sort((left, right) =>
      comparePostDates(right.updatedAt ?? right.publishedAt, left.updatedAt ?? left.publishedAt),
    );
    return nextItems;
  }

  nextItems.sort((left, right) => comparePostDates(right.publishedAt, left.publishedAt));
  return nextItems;
}

function mapPostRecord(record: PostRecord): PostItem {
  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    summary: record.summary,
    status: record.status,
    content: record.content,
    contentHtml: record.contentHtml,
    authorId: record.authorId,
    authorName: record.authorName,
    publishedAt: toIsoString(record.publishedAt),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    publishedSnapshot: parsePublishedSnapshot(record.publishedSnapshot),
    draftSnapshot: parseDraftSnapshot(record.draftSnapshot),
    category: record.category
      ? {
          id: record.category.id,
          name: record.category.name,
          slug: record.category.slug,
        }
      : null,
    coverAsset: record.coverAsset
      ? {
          id: record.coverAsset.id,
          url: record.coverAsset.url,
          alt: record.coverAsset.alt,
          mimeType: record.coverAsset.mimeType,
          width: record.coverAsset.width,
          height: record.coverAsset.height,
        }
      : null,
    tags: record.tags.map(({ tag }) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
    })),
  };
}

function mapPublishedPostRecord(record: PostRecord): PostItem {
  const snapshot = parsePublishedSnapshot(record.publishedSnapshot);

  if (!snapshot) {
    return mapPostRecord(record);
  }

  return {
    id: record.id,
    title: snapshot.title,
    slug: snapshot.slug,
    summary: snapshot.summary,
    status: record.status,
    content: snapshot.content,
    contentHtml: snapshot.contentHtml,
    authorId: snapshot.authorId,
    authorName: snapshot.authorName,
    publishedAt: snapshot.publishedAt,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    publishedSnapshot: snapshot,
    draftSnapshot: parseDraftSnapshot(record.draftSnapshot),
    category: snapshot.category,
    coverAsset: snapshot.coverAsset,
    tags: snapshot.tags,
  };
}

function buildPublishedSnapshot(record: PostRecord, publishedAt: Date): PublishedPostSnapshot {
  return {
    title: record.title,
    slug: record.slug,
    summary: record.summary,
    content: record.content,
    contentHtml: record.contentHtml,
    authorId: record.authorId,
    authorName: record.authorName,
    publishedAt: publishedAt.toISOString(),
    category: record.category
      ? {
          id: record.category.id,
          name: record.category.name,
          slug: record.category.slug,
        }
      : null,
    coverAsset: record.coverAsset
      ? {
          id: record.coverAsset.id,
          url: record.coverAsset.url,
          alt: record.coverAsset.alt,
          mimeType: record.coverAsset.mimeType,
          width: record.coverAsset.width,
          height: record.coverAsset.height,
        }
      : null,
    tags: record.tags.map(({ tag }) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
    })),
  };
}

function buildDraftSnapshot(input: {
  title: string;
  slug: string;
  summary: string | null;
  content: Prisma.JsonValue | null;
  contentHtml: string | null;
  authorId: string | null;
  authorName: string | null;
  publishedAt: Date | null;
  category: { id: number; name: string; slug: string } | null;
  coverAsset: AssetSummary | null;
  tags: Array<{ id: string; name: string; slug: string }>;
}): DraftPostSnapshot {
  const savedAt = new Date().toISOString();

  return {
    title: input.title,
    slug: input.slug,
    summary: input.summary,
    content: input.content,
    contentHtml: input.contentHtml,
    authorId: input.authorId,
    authorName: input.authorName,
    publishedAt: toIsoString(input.publishedAt),
    savedAt,
    category: input.category,
    coverAsset: input.coverAsset,
    tags: input.tags,
  };
}

function parsePublishedSnapshot(value: Prisma.JsonValue | null): PublishedPostSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as PublishedPostSnapshot;
}

function parseDraftSnapshot(value: Prisma.JsonValue | null): DraftPostSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const snapshot = value as Partial<PublishedPostSnapshot> & {
    savedAt?: unknown;
    updatedAt?: unknown;
    createdAt?: unknown;
  };

  const savedAt =
    typeof snapshot.savedAt === "string"
      ? snapshot.savedAt
      : typeof snapshot.updatedAt === "string"
        ? snapshot.updatedAt
        : typeof snapshot.createdAt === "string"
          ? snapshot.createdAt
          : null;

  if (!savedAt) {
    return null;
  }

  return {
    title: snapshot.title ?? "",
    slug: snapshot.slug ?? "",
    summary: snapshot.summary ?? null,
    content: snapshot.content ?? null,
    contentHtml: snapshot.contentHtml ?? null,
    authorId: snapshot.authorId ?? null,
    authorName: snapshot.authorName ?? null,
    publishedAt: snapshot.publishedAt ?? null,
    savedAt,
    category: snapshot.category ?? null,
    coverAsset: snapshot.coverAsset ?? null,
    tags: Array.isArray(snapshot.tags) ? snapshot.tags : [],
  };
}

function comparePostDates(left?: string | null, right?: string | null) {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;

  return leftTime - rightTime;
}

function getSafePage(value?: number) {
  if (!value || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

function getSafePageSize(value?: number) {
  if (!value || value < 1) {
    return 10;
  }

  return Math.min(Math.floor(value), 100);
}

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function createTemporarySlug() {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
