import { createClient as createAnonClient } from "@/lib/supabase/anon";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { AssetKind, AssetItem } from "@/types/domain";
import type { Tables } from "@/types/database";

export async function getAssetById(id: string): Promise<AssetItem | null> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return mapAsset(data);
}

export async function getAssetByStoragePath(storagePath: string): Promise<AssetItem | null> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("storage_path", storagePath)
    .single();

  if (error || !data) return null;

  return mapAsset(data);
}

export async function listAssets(params: {
  kind?: AssetKind;
  page?: number;
  pageSize?: number;
} = {}) {
  const supabase = await createServerClient();
  const page = getSafePage(params.page);
  const pageSize = getSafePageSize(params.pageSize);

  let query = supabase
    .from("assets")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params.kind) {
    query = query.eq("kind", params.kind);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    items: (data ?? []).map(mapAsset),
    page,
    pageSize,
    totalCount: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

export async function createAsset(input: {
  kind: AssetKind;
  storagePath: string;
  bucket?: string;
  alt?: string | null;
  mimeType?: string | null;
  size?: number | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
}): Promise<AssetItem> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("assets")
    .insert({
      kind: input.kind,
      storage_path: input.storagePath,
      bucket: input.bucket ?? "site-assets",
      alt: input.alt,
      mime_type: input.mimeType,
      size: input.size,
      width: input.width,
      height: input.height,
      duration: input.duration,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapAsset(data);
}

export function getAssetPublicUrl(storagePath: string): string {
  const supabase = createAnonClient();
  const { data } = supabase.storage.from("site-assets").getPublicUrl(storagePath);
  return data.publicUrl;
}

function mapAsset(asset: Tables<"assets">): AssetItem {
  return {
    id: asset.id,
    kind: asset.kind as AssetKind,
    storagePath: asset.storage_path ?? "",
    bucket: asset.bucket ?? "site-assets",
    alt: asset.alt,
    mimeType: asset.mime_type,
    size: asset.size,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
    createdAt: asset.created_at ?? "",
    updatedAt: asset.updated_at ?? "",
  };
}

function getSafePage(value?: number) {
  if (!value || value < 1) return 1;
  return Math.floor(value);
}

function getSafePageSize(value?: number) {
  if (!value || value < 1) return 24;
  return Math.min(Math.floor(value), 100);
}
