import { AssetKind, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";

export type AssetItem = {
  id: string;
  provider: string;
  kind: string;
  storageKey: string;
  bucket: string | null;
  url: string;
  alt: string | null;
  mimeType: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  createdAt: string;
  updatedAt: string;
};

export async function getAssetById(id: string): Promise<AssetItem | null> {
  const asset = await prisma.asset.findUnique({
    where: { id },
  });

  return asset ? mapAsset(asset) : null;
}

export async function getAssetByStorageKey(storageKey: string): Promise<AssetItem | null> {
  const asset = await prisma.asset.findUnique({
    where: { storageKey },
  });

  return asset ? mapAsset(asset) : null;
}

export async function listAssets(params: {
  kind?: AssetKind;
  page?: number;
  pageSize?: number;
} = {}) {
  const page = getSafePage(params.page);
  const pageSize = getSafePageSize(params.pageSize);
  const where: Prisma.AssetWhereInput = {
    ...(params.kind ? { kind: params.kind } : {}),
  };
  const [items, totalCount] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy: [{ createdAt: Prisma.SortOrder.desc }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.asset.count({ where }),
  ]);

  return {
    items: items.map(mapAsset),
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function createAsset(input: {
  provider: Prisma.AssetCreateInput["provider"];
  kind: Prisma.AssetCreateInput["kind"];
  storageKey: string;
  bucket?: string | null;
  url: string;
  alt?: string | null;
  mimeType?: string | null;
  size?: number | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
}) {
  const asset = await prisma.asset.create({
    data: {
      provider: input.provider,
      kind: input.kind,
      storageKey: input.storageKey,
      bucket: input.bucket ?? null,
      url: input.url,
      alt: input.alt ?? null,
      mimeType: input.mimeType ?? null,
      size: input.size ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      duration: input.duration ?? null,
    },
  });

  return mapAsset(asset);
}

function mapAsset(asset: Awaited<ReturnType<typeof prisma.asset.findUnique>> extends infer T
  ? T extends null
    ? never
    : NonNullable<T>
  : never): AssetItem {
  return {
    id: asset.id,
    provider: asset.provider,
    kind: asset.kind,
    storageKey: asset.storageKey,
    bucket: asset.bucket,
    url: asset.url,
    alt: asset.alt,
    mimeType: asset.mimeType,
    size: asset.size,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
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
    return 24;
  }

  return Math.min(Math.floor(value), 100);
}
