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
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  status: ContentStatus;
  content: Prisma.JsonValue | null;
  contentHtml: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  draftSnapshot: DraftUpdateSnapshot | null;
  category: {
    id: number;
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

type PublishedUpdateSnapshot = {
  title: string;
  slug: string;
  summary: string | null;
  content: Prisma.JsonValue | null;
  contentHtml: string | null;
  publishedAt: string | null;
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
  coverAsset: AssetSummary | null;
  tags: TagSummary[];
};

type DraftUpdateSnapshot = PublishedUpdateSnapshot & {
  savedAt: string;
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

export async function getUpdateByIdForAdmin(id: number): Promise<UpdateItem | null> {
  const update = await prisma.update.findUnique({
    where: { id },
    include: updateInclude,
  });

  return update ? mapUpdateRecord(update) : null;
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

export type SaveUpdateInput = {
  id?: number;
  title: string;
  slug: string | null;
  summary: string | null;
  content: string | null;
  contentHtml: string | null;
  status: ContentStatus;
  categoryId: number | null;
  publishedAt: Date | null;
  tagIds: string[];
};

export async function saveUpdate(input: SaveUpdateInput): Promise<UpdateItem> {
  const tagIds = Array.from(new Set(input.tagIds.filter(Boolean)));
  const resolvedSlug = input.slug ?? (typeof input.id === "number" ? String(input.id) : null);
  const current =
    typeof input.id === "number"
      ? await prisma.update.findUnique({
          where: { id: input.id },
          include: updateInclude,
        })
      : null;

  if (current && (current.status === ContentStatus.PUBLISHED || current.draftSnapshot)) {
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
      publishedAt: input.publishedAt,
      category,
      coverAsset: current.coverAsset,
      tags,
    });

    const update = await prisma.update.update({
      where: { id: input.id },
      data: {
        draftSnapshot,
      },
      include: updateInclude,
    });

    return mapUpdateRecord(update);
  }

  const baseData = {
    title: input.title,
    summary: input.summary,
    content: input.content ?? Prisma.DbNull,
    contentHtml: input.contentHtml,
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
    draftSnapshot: Prisma.DbNull,
  } satisfies Prisma.UpdateUpdateInput;
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
  } satisfies Prisma.UpdateCreateInput;

  const update = current
    ? await prisma.update.update({
        where: { id: input.id },
        data: updateData,
        include: updateInclude,
      })
    : await prisma.update.create({
        data: createData,
        include: updateInclude,
      });

  if (typeof input.id !== "number" && !input.slug && update.slug !== String(update.id)) {
    const updatedUpdate = await prisma.update.update({
      where: { id: update.id },
      data: {
        slug: String(update.id),
      },
      include: updateInclude,
    });

    return mapUpdateRecord(updatedUpdate);
  }

  return mapUpdateRecord(update);
}

export async function publishUpdateById(id: number): Promise<UpdateItem> {
  const current = await prisma.update.findUnique({
    where: { id },
    include: updateInclude,
  });

  if (!current) {
    throw new Error(`Update not found: ${id}`);
  }

  const draftSnapshot = parseDraftSnapshot(current.draftSnapshot);
  const publishedAt = current.publishedAt ?? new Date();
  const resolvedPublishedAt = draftSnapshot?.publishedAt ? new Date(draftSnapshot.publishedAt) : publishedAt;
  const updateData = draftSnapshot
    ? {
        title: draftSnapshot.title,
        slug: draftSnapshot.slug,
        summary: draftSnapshot.summary,
        content: draftSnapshot.content ?? Prisma.DbNull,
        contentHtml: draftSnapshot.contentHtml,
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
  const update = await prisma.update.update({
    where: { id },
    data: {
      status: ContentStatus.PUBLISHED,
      ...updateData,
      publishedAt: resolvedPublishedAt,
      draftSnapshot: Prisma.DbNull,
    },
    include: updateInclude,
  });

  return mapUpdateRecord(update);
}

export async function unpublishUpdateById(id: number): Promise<UpdateItem> {
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

export async function discardUpdateRevisionById(id: number): Promise<UpdateItem> {
  const current = await prisma.update.findUnique({
    where: { id },
    include: updateInclude,
  });

  if (!current) {
    throw new Error(`Update not found: ${id}`);
  }

  if (!current.draftSnapshot) {
    throw new Error("这条动态没有可以删除的草稿。");
  }

  const draftSnapshot = parseDraftSnapshot(current.draftSnapshot);

  const update = await prisma.update.update({
    where: { id },
    data: {
      status: ContentStatus.PUBLISHED,
      publishedAt:
        draftSnapshot?.publishedAt ? new Date(draftSnapshot.publishedAt) : current.publishedAt ?? new Date(),
      draftSnapshot: Prisma.DbNull,
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
  return `update-${Math.random().toString(36).slice(2, 10)}`;
}

function buildPublishedSnapshot(record: UpdateRecord, publishedAt: Date): PublishedUpdateSnapshot {
  return {
    title: record.title,
    slug: record.slug,
    summary: record.summary,
    content: record.content,
    contentHtml: record.contentHtml,
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
  publishedAt: Date | null;
  category: { id: number; name: string; slug: string } | null;
  coverAsset: AssetSummary | null;
  tags: Array<{ id: string; name: string; slug: string }>;
}): DraftUpdateSnapshot {
  const savedAt = new Date().toISOString();

  return {
    title: input.title,
    slug: input.slug,
    summary: input.summary,
    content: input.content,
    contentHtml: input.contentHtml,
    publishedAt: toIsoString(input.publishedAt),
    savedAt,
    category: input.category,
    coverAsset: input.coverAsset,
    tags: input.tags,
  };
}

function parsePublishedSnapshot(value: Prisma.JsonValue | null): PublishedUpdateSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as PublishedUpdateSnapshot;
}

function parseDraftSnapshot(value: Prisma.JsonValue | null): DraftUpdateSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const snapshot = value as Partial<PublishedUpdateSnapshot> & {
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
    publishedAt: snapshot.publishedAt ?? null,
    savedAt,
    category: snapshot.category ?? null,
    coverAsset: snapshot.coverAsset ?? null,
    tags: snapshot.tags ?? [],
  };
}
