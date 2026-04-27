import "server-only";

import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getObjectStorageSettings } from "@/server/repositories/object-storage";

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
  const settings = await getObjectStorageSettings();

  if (!settings) {
    throw new Error("图床尚未配置，请先在后台设置里填写对象存储信息。");
  }

  if (!file || file.size === 0) {
    throw new Error("请选择要上传的图片。");
  }

  if (file.size > MAX_IMAGE_UPLOAD_SIZE) {
    throw new Error(`图片不能超过 ${MAX_IMAGE_UPLOAD_SIZE / 1024 / 1024}MB。`);
  }

  if (!IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error("只支持上传 AVIF、GIF、JPEG、PNG、SVG 或 WebP 图片。");
  }

  const storageKey = createStorageKey(file.name, file.type, settings.keyPrefix);
  const body = Buffer.from(await file.arrayBuffer());
  const client = new S3Client({
    region: settings.region,
    endpoint: settings.endpoint ?? undefined,
    forcePathStyle: settings.forcePathStyle,
    credentials: {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: settings.bucket,
      Key: storageKey,
      Body: body,
      ContentLength: body.byteLength,
      ContentType: file.type,
    }),
  );

  return {
    url: createPublicUrl(settings.publicBaseUrl, storageKey),
    storageKey,
  };
}

function createPublicUrl(publicBaseUrl: string, storageKey: string) {
  return `${publicBaseUrl.replace(/\/+$/, "")}/${storageKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function createStorageKey(filename: string, mimeType: string, keyPrefix: string | null) {
  const prefix = normalizeKeyPrefix(keyPrefix);
  const extension = getSafeExtension(filename, mimeType);
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${prefix}${year}/${month}/${day}/${randomUUID()}${extension}`;
}

function normalizeKeyPrefix(prefix: string | null) {
  if (!prefix) {
    return "";
  }

  return `${prefix.replace(/^\/+|\/+$/g, "")}/`;
}

function getSafeExtension(filename: string, mimeType: string) {
  const extension = extname(filename).toLowerCase();

  if (/^\.[a-z0-9]+$/.test(extension)) {
    return extension;
  }

  switch (mimeType) {
    case "image/avif":
      return ".avif";
    case "image/gif":
      return ".gif";
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/svg+xml":
      return ".svg";
    case "image/webp":
      return ".webp";
    default:
      return "";
  }
}
