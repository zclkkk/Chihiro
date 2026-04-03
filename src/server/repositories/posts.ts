import { ContentStatus, Prisma } from "@prisma/client";
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
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  status: ContentStatus;
  content: Prisma.JsonValue | null;
  contentHtml: string | null;
  authorName: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
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

export async function listPublishedPosts(
  options: ListPublishedPostsOptions = {},
): Promise<PostListResult> {
  const pageSize = getSafePageSize(options.pageSize);
  const page = getSafePage(options.page);
  const where = buildPublishedPostWhere(options);
  const [items, totalCount] = await Promise.all([
    prisma.post.findMany({
      where,
      include: postInclude,
      orderBy: getPostOrderBy(options.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.post.count({ where }),
  ]);

  return {
    items: items.map(mapPostRecord),
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function listAllPublishedPosts(
  options: Omit<ListPublishedPostsOptions, "page" | "pageSize"> = {},
): Promise<PostItem[]> {
  const items = await prisma.post.findMany({
    where: buildPublishedPostWhere(options),
    include: postInclude,
    orderBy: getPostOrderBy(options.sort),
  });

  return items.map(mapPostRecord);
}

export async function getPublishedPostBySlug(slug: string): Promise<PostItem | null> {
  const post = await prisma.post.findFirst({
    where: {
      slug,
      status: ContentStatus.PUBLISHED,
    },
    include: postInclude,
  });

  return post ? mapPostRecord(post) : null;
}

export async function publishPostById(id: string): Promise<PostItem> {
  const current = await prisma.post.findUnique({
    where: { id },
    include: postInclude,
  });

  if (!current) {
    throw new Error(`Post not found: ${id}`);
  }

  const post = await prisma.post.update({
    where: { id },
    data: {
      status: ContentStatus.PUBLISHED,
      publishedAt: current.publishedAt ?? new Date(),
    },
    include: postInclude,
  });

  return mapPostRecord(post);
}

export async function unpublishPostById(id: string): Promise<PostItem> {
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
  const posts = await prisma.post.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
    },
    select: {
      slug: true,
    },
    orderBy: getPostOrderBy("latest"),
  });

  return posts.map((post) => post.slug);
}

function buildPublishedPostWhere(options: ListPublishedPostsOptions): Prisma.PostWhereInput {
  const tagSlugs = Array.from(new Set((options.tagSlugs ?? []).filter(Boolean)));
  const query = options.query?.trim();

  return {
    status: ContentStatus.PUBLISHED,
    ...(options.categorySlug
      ? {
          category: {
            slug: options.categorySlug,
          },
        }
      : {}),
    ...(query
      ? {
          OR: [
            {
              title: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              summary: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              contentHtml: {
                contains: query,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(tagSlugs.length > 0
      ? {
          AND: tagSlugs.map((slug) => ({
            tags: {
              some: {
                tag: {
                  slug,
                },
              },
            },
          })),
        }
      : {}),
  };
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

function mapPostRecord(record: PostRecord): PostItem {
  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    summary: record.summary,
    status: record.status,
    content: record.content,
    contentHtml: record.contentHtml,
    authorName: record.authorName,
    publishedAt: toIsoString(record.publishedAt),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
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
