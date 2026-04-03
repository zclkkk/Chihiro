import { ContentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";

const updateInclude = {
  category: true,
  coverAsset: true,
  tags: {
    include: {
      tag: true,
    },
  },
} satisfies Prisma.UpdateInclude;

type UpdateRecord = Prisma.UpdateGetPayload<{
  include: typeof updateInclude;
}>;

export type UpdateListSort = "latest" | "earliest" | "updated";

export type UpdateItem = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  status: ContentStatus;
  content: Prisma.JsonValue | null;
  contentHtml: string | null;
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

export type UpdateListResult = {
  items: UpdateItem[];
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

export type ListPublishedUpdatesOptions = {
  page?: number;
  pageSize?: number;
  sort?: UpdateListSort;
  categorySlug?: string;
  tagSlugs?: string[];
  query?: string;
};

export async function listUpdatesForAdmin(): Promise<UpdateItem[]> {
  const items = await prisma.update.findMany({
    include: updateInclude,
    orderBy: [{ updatedAt: Prisma.SortOrder.desc }, { createdAt: Prisma.SortOrder.desc }],
  });

  return items.map(mapUpdateRecord);
}

export async function listPublishedUpdates(
  options: ListPublishedUpdatesOptions = {},
): Promise<UpdateListResult> {
  const pageSize = getSafePageSize(options.pageSize);
  const page = getSafePage(options.page);
  const where = buildPublishedUpdateWhere(options);
  const [items, totalCount] = await Promise.all([
    prisma.update.findMany({
      where,
      include: updateInclude,
      orderBy: getUpdateOrderBy(options.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.update.count({ where }),
  ]);

  return {
    items: items.map(mapUpdateRecord),
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function listAllPublishedUpdates(
  options: Omit<ListPublishedUpdatesOptions, "page" | "pageSize"> = {},
): Promise<UpdateItem[]> {
  const items = await prisma.update.findMany({
    where: buildPublishedUpdateWhere(options),
    include: updateInclude,
    orderBy: getUpdateOrderBy(options.sort),
  });

  return items.map(mapUpdateRecord);
}

export async function getPublishedUpdateBySlug(slug: string): Promise<UpdateItem | null> {
  const update = await prisma.update.findFirst({
    where: {
      slug,
      status: ContentStatus.PUBLISHED,
    },
    include: updateInclude,
  });

  return update ? mapUpdateRecord(update) : null;
}

export async function publishUpdateById(id: string): Promise<UpdateItem> {
  const current = await prisma.update.findUnique({
    where: { id },
    include: updateInclude,
  });

  if (!current) {
    throw new Error(`Update not found: ${id}`);
  }

  const update = await prisma.update.update({
    where: { id },
    data: {
      status: ContentStatus.PUBLISHED,
      publishedAt: current.publishedAt ?? new Date(),
    },
    include: updateInclude,
  });

  return mapUpdateRecord(update);
}

export async function unpublishUpdateById(id: string): Promise<UpdateItem> {
  const update = await prisma.update.update({
    where: { id },
    data: {
      status: ContentStatus.DRAFT,
      publishedAt: null,
    },
    include: updateInclude,
  });

  return mapUpdateRecord(update);
}

export async function getPublishedUpdateSlugs(): Promise<string[]> {
  const updates = await prisma.update.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
    },
    select: {
      slug: true,
    },
    orderBy: getUpdateOrderBy("latest"),
  });

  return updates.map((update) => update.slug);
}

function buildPublishedUpdateWhere(
  options: ListPublishedUpdatesOptions,
): Prisma.UpdateWhereInput {
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

function getUpdateOrderBy(
  sort: UpdateListSort = "latest",
): Prisma.UpdateOrderByWithRelationInput[] {
  if (sort === "earliest") {
    return [{ publishedAt: Prisma.SortOrder.asc }, { createdAt: Prisma.SortOrder.asc }];
  }

  if (sort === "updated") {
    return [{ updatedAt: Prisma.SortOrder.desc }];
  }

  return [{ publishedAt: Prisma.SortOrder.desc }, { createdAt: Prisma.SortOrder.desc }];
}

function mapUpdateRecord(record: UpdateRecord): UpdateItem {
  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    summary: record.summary,
    status: record.status,
    content: record.content,
    contentHtml: record.contentHtml,
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
