import "server-only";

import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export const MAX_IMAGE_UPLOAD_SIZE = 5 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
]);

export async function uploadImageToObjectStorage(file: File) {
  if (!file || file.size === 0) {
    throw new Error("请选择要上传的图片。");
  }
  if (file.size > MAX_IMAGE_UPLOAD_SIZE) {
    throw new Error(`图片不能超过 ${MAX_IMAGE_UPLOAD_SIZE / 1024 / 1024}MB。`);
  }
  if (!IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error("只支持上传 AVIF、GIF、JPEG、PNG、SVG 或 WebP 图片。");
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  const publicBaseUrl = process.env.SUPABASE_STORAGE_PUBLIC_BASE_URL;
  if (!bucket || !publicBaseUrl) {
    throw new Error("Supabase Storage 未正确配置。");
  }

  const storageKey = createStorageKey(file.name, file.type);
  const supabase = createSupabaseAdminClient();
  const body = await file.arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(storageKey, body, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    url: createPublicUrl(publicBaseUrl, storageKey),
    storageKey,
  };
}

function createPublicUrl(publicBaseUrl: string, storageKey: string) {
  return `${publicBaseUrl.replace(/\/+$/, "")}/${storageKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function createStorageKey(filename: string, mimeType: string) {
  const ext = getSafeExtension(filename, mimeType);
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `posts/${year}/${month}/${day}/${randomUUID()}${ext}`;
}

function getSafeExtension(filename: string, mimeType: string) {
  const ext = extname(filename).toLowerCase();
  if (/^\.[a-z0-9]+$/.test(ext)) return ext;
  switch (mimeType) {
    case "image/avif": return ".avif";
    case "image/gif": return ".gif";
    case "image/jpeg": return ".jpg";
    case "image/png": return ".png";
    case "image/svg+xml": return ".svg";
    case "image/webp": return ".webp";
    default: return "";
  }
}
