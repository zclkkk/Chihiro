import { ContentStatus, Prisma } from "@prisma/client";
import { getParagraphsFromContent } from "@/lib/content";
import { siteConfig } from "@/lib/site";
import { prisma } from "@/server/db/client";

type UpdateRecord = NonNullable<Awaited<ReturnType<typeof prisma.update.findUnique>>>;

export type UpdateListSort = "latest" | "earliest" | "updated";

export type UpdateItem = {
  id: number;
  title: string;
  authorId: string | null;
  authorName: string;
  status: ContentStatus;
  content: Prisma.JsonValue | null;
  contentHtml: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  draftSnapshot: DraftUpdateSnapshot | null;
};

export type UpdateListResult = {
  items: UpdateItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type UpdateNavigationItem = {
  id: number;
  title: string;
  authorName: string;
  publishedAt: string | null;
};

type PublishedUpdateSnapshot = {
  title: string;
  authorId: string | null;
  authorName: string | null;
  content: Prisma.JsonValue | null;
  contentHtml: string | null;
  publishedAt: string | null;
};

type DraftUpdateSnapshot = PublishedUpdateSnapshot & {
  savedAt: string;
};

export type ListPublishedUpdatesOptions = {
  page?: number;
  pageSize?: number;
  sort?: UpdateListSort;
  query?: string;
};

export async function listUpdatesForAdmin(): Promise<UpdateItem[]> {
  const items = await prisma.update.findMany({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return items.map(mapUpdateRecord);
}

export async function getUpdateByIdForAdmin(id: number): Promise<UpdateItem | null> {
  const update = await fetchUpdateRowById(id);

  return update ? mapUpdateRecord(update) : null;
}

export async function listPublishedUpdates(
  options: ListPublishedUpdatesOptions = {},
): Promise<UpdateListResult> {
  const pageSize = getSafePageSize(options.pageSize);
  const page = getSafePage(options.page);
  const where = buildPublishedUpdateWhere(options);
  const [items, totalCount] = await Promise.all([
    fetchPublishedUpdateRows(options.sort, pageSize, page, where),
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
  const items = await fetchPublishedUpdateRows(options.sort);

  return items.map(mapUpdateRecord);
}

export async function listRecentPublishedUpdatesForNavigation(
  limit = 5,
): Promise<UpdateNavigationItem[]> {
  const items = await fetchPublishedUpdateRows("latest", limit, 1);

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    authorName: item.authorName ?? siteConfig.author,
    publishedAt: item.publishedAt?.toISOString() ?? null,
  }));
}

export type SaveUpdateInput = {
  id?: number;
  content: Prisma.JsonValue | null;
  contentHtml: string | null;
  authorId: string | null;
  authorName: string | null;
  status: ContentStatus;
  publishedAt: Date | null;
};

export async function saveUpdate(input: SaveUpdateInput): Promise<UpdateItem> {
  const current =
    typeof input.id === "number"
      ? await fetchUpdateRowById(input.id)
      : null;

  if (current && (current.status === ContentStatus.PUBLISHED || current.draftSnapshot)) {
    const resolvedTitle = resolveUpdateTitle(current.title, input.content);
    const resolvedAuthorName = input.authorName ?? current.authorName;

    const draftSnapshot = buildDraftSnapshot({
      title: resolvedTitle,
      authorId: input.authorId,
      authorName: resolvedAuthorName,
      content: input.content,
      contentHtml: input.contentHtml,
      publishedAt: input.publishedAt,
    });

    const update = await prisma.update.update({
      where: { id: input.id },
      data: {
        draftSnapshot,
      },
    });

    await persistUpdateAuthor(update.id, input.authorId, resolvedAuthorName);

    const refreshed = await fetchUpdateRowById(update.id);

    return mapUpdateRecord(refreshed ?? update);
  }

  const resolvedTitle = resolveUpdateTitle(current?.title ?? null, input.content);
  const baseData = {
    title: resolvedTitle,
    content: input.content ?? Prisma.DbNull,
    contentHtml: input.contentHtml,
    authorId: input.authorId,
    authorName: input.authorName,
    publishedAt: input.publishedAt,
    status: input.status,
  };
  const updateData = {
    ...baseData,
    draftSnapshot: Prisma.DbNull,
  } satisfies Prisma.UpdateUpdateInput;
  const createData = {
    ...baseData,
  } satisfies Prisma.UpdateCreateInput;

  const update = current
    ? await prisma.update.update({
        where: { id: input.id },
        data: updateData,
      })
    : await prisma.update.create({
        data: createData,
      });

  await persistUpdateAuthor(update.id, input.authorId, input.authorName);

  const refreshed = await fetchUpdateRowById(update.id);

  return mapUpdateRecord(refreshed ?? update);
}

export async function publishUpdateById(id: number): Promise<UpdateItem> {
  const current = await fetchUpdateRowById(id);

  if (!current) {
    throw new Error(`Update not found: ${id}`);
  }

  const draftSnapshot = parseDraftSnapshot(current.draftSnapshot);
  const publishedAt = current.publishedAt ?? new Date();
  const resolvedPublishedAt = draftSnapshot?.publishedAt ? new Date(draftSnapshot.publishedAt) : publishedAt;
  const resolvedAuthorName = draftSnapshot?.authorName ?? current.authorName;
  const updateData = draftSnapshot
    ? {
        title: draftSnapshot.title,
        content: draftSnapshot.content ?? Prisma.DbNull,
        contentHtml: draftSnapshot.contentHtml,
        publishedAt: resolvedPublishedAt,
      }
    : {
        title: current.title,
        content: current.content ?? Prisma.DbNull,
        contentHtml: current.contentHtml,
        publishedAt,
      };
  const update = await prisma.update.update({
    where: { id },
    data: {
      status: ContentStatus.PUBLISHED,
      ...updateData,
      publishedAt: resolvedPublishedAt,
      draftSnapshot: Prisma.DbNull,
    },
  });

  const resolvedAuthorId = draftSnapshot?.authorId ?? current.authorId;
  await persistUpdateAuthor(update.id, resolvedAuthorId, resolvedAuthorName);

  const refreshed = await fetchUpdateRowById(update.id);

  return mapUpdateRecord(refreshed ?? update);
}

export async function unpublishUpdateById(id: number): Promise<UpdateItem> {
  const update = await prisma.update.update({
    where: { id },
    data: {
      status: ContentStatus.DRAFT,
      publishedAt: null,
    },
  });

  return mapUpdateRecord(update);
}

export async function deleteUpdateById(id: number): Promise<UpdateItem> {
  const update = await prisma.update.delete({
    where: { id },
  });

  return mapUpdateRecord(update);
}

export async function discardUpdateRevisionById(id: number): Promise<UpdateItem> {
  const current = await fetchUpdateRowById(id);

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
  });

  return mapUpdateRecord(update);
}

function buildPublishedUpdateWhere(
  options: ListPublishedUpdatesOptions,
): Prisma.UpdateWhereInput {
  const query = options.query?.trim();

  return {
    status: ContentStatus.PUBLISHED,
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
              authorName: {
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
  };
}

function mapUpdateRecord(record: UpdateRecord): UpdateItem {
  return {
    id: record.id,
    title: record.title,
    authorId: record.authorId,
    authorName: record.authorName ?? siteConfig.author,
    status: record.status,
    content: record.content,
    contentHtml: record.contentHtml,
    publishedAt: toIsoString(record.publishedAt),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    draftSnapshot: parseDraftSnapshot(record.draftSnapshot),
  };
}

async function fetchUpdateRowById(id: number) {
  const rows = await prisma.$queryRaw<Array<{
    id: number;
    title: string;
    authorId: string | null;
    authorName: string | null;
    status: ContentStatus;
    content: Prisma.JsonValue | null;
    contentHtml: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    draftSnapshot: Prisma.JsonValue | null;
  }>>(
    Prisma.sql`
      SELECT id, title, "authorId", "authorName", status, content, "contentHtml", "publishedAt", "createdAt", "updatedAt", "draftSnapshot"
      FROM "Update"
      WHERE id = ${id}
      LIMIT 1
    `,
  );

  return rows[0] ?? null;
}

async function fetchPublishedUpdateRows(
  sort?: UpdateListSort,
  pageSize?: number,
  page?: number,
  where?: Prisma.UpdateWhereInput,
) {
  const orderBySql =
    sort === "earliest"
      ? Prisma.sql`ORDER BY "publishedAt" ASC, "createdAt" ASC`
      : sort === "updated"
        ? Prisma.sql`ORDER BY "updatedAt" DESC`
        : Prisma.sql`ORDER BY "publishedAt" DESC, "createdAt" DESC`;

  const whereSql = buildPublishedUpdateWhereSql(where);
  const limitSql = typeof pageSize === "number" ? Prisma.sql`LIMIT ${pageSize}` : Prisma.empty;
  const offsetSql =
    typeof pageSize === "number" && typeof page === "number"
      ? Prisma.sql`OFFSET ${(page - 1) * pageSize}`
      : Prisma.empty;

  return prisma.$queryRaw<Array<{
    id: number;
    title: string;
    authorId: string | null;
    authorName: string | null;
    status: ContentStatus;
    content: Prisma.JsonValue | null;
    contentHtml: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    draftSnapshot: Prisma.JsonValue | null;
  }>>(
    Prisma.sql`
      SELECT id, title, "authorId", "authorName", status, content, "contentHtml", "publishedAt", "createdAt", "updatedAt", "draftSnapshot"
      FROM "Update"
      ${whereSql}
      ${orderBySql}
      ${limitSql}
      ${offsetSql}
    `,
  );
}

function buildPublishedUpdateWhereSql(where?: Prisma.UpdateWhereInput) {
  if (!where) {
    return Prisma.sql`WHERE status = ${ContentStatus.PUBLISHED}`;
  }

  return Prisma.sql`WHERE status = ${ContentStatus.PUBLISHED}`;
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

function buildDraftSnapshot(input: {
  title: string;
  authorId: string | null;
  authorName: string | null;
  content: Prisma.JsonValue | null;
  contentHtml: string | null;
  publishedAt: Date | null;
}): DraftUpdateSnapshot {
  const savedAt = new Date().toISOString();

  return {
    title: input.title,
    authorId: input.authorId,
    authorName: input.authorName,
    content: input.content,
    contentHtml: input.contentHtml,
    publishedAt: toIsoString(input.publishedAt),
    savedAt,
  };
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
    authorId: snapshot.authorId ?? null,
    authorName: typeof snapshot.authorName === "string" ? snapshot.authorName : null,
    content: snapshot.content ?? null,
    contentHtml: snapshot.contentHtml ?? null,
    publishedAt: snapshot.publishedAt ?? null,
    savedAt,
  };
}

function resolveUpdateTitle(
  currentTitle: string | null,
  content: Prisma.JsonValue | null,
) {
  const contentTitle = deriveTitleFromContent(content);
  if (contentTitle) {
    return contentTitle;
  }

  if (currentTitle) {
    return currentTitle;
  }

  return "未命名动态";
}

function deriveTitleFromContent(content: Prisma.JsonValue | null) {
  if (!content) {
    return null;
  }

  const firstLine = getParagraphsFromContent(content)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return null;
  }

  return truncateTitle(firstLine);
}

function truncateTitle(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= 24) {
    return normalized;
  }

  return `${normalized.slice(0, 24)}…`;
}

async function persistUpdateAuthor(updateId: number, authorId: string | null, authorName: string | null) {
  await prisma.$executeRaw`
    UPDATE "Update"
    SET "authorId" = ${authorId}, "authorName" = ${authorName}
    WHERE id = ${updateId}
  `;
}
