"use server";

import { AssetProvider } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/server/auth";
import {
  getObjectStorageSettings,
  upsertObjectStorageSettings,
} from "@/server/repositories/object-storage";

export type SaveImageHostingSettingsState = {
  error: string | null;
  success: string | null;
};

export async function saveImageHostingSettingsAction(
  _previousState: SaveImageHostingSettingsState,
  formData: FormData,
): Promise<SaveImageHostingSettingsState> {
  await requireAdminSession();

  try {
    const currentSettings = await getObjectStorageSettings();
    const provider = getObjectStorageProvider(formData, "provider");
    const endpoint = getOptionalUrl(formData, "endpoint", "接口地址");
    const region = getRequiredString(formData, "region", "区域");
    const bucket = getRequiredString(formData, "bucket", "存储桶");
    const accessKeyId = getRequiredString(formData, "accessKeyId", "访问密钥 ID");
    const submittedSecretAccessKey = getOptionalString(formData, "secretAccessKey");
    const secretAccessKey = submittedSecretAccessKey ?? currentSettings?.secretAccessKey;
    const publicBaseUrl = getRequiredUrl(formData, "publicBaseUrl", "公开访问地址");
    const keyPrefix = normalizeKeyPrefix(getOptionalString(formData, "keyPrefix"));
    const forcePathStyle = getOptionalString(formData, "forcePathStyle") === "1";

    if (!secretAccessKey) {
      throw new Error("请填写访问密钥 Secret。");
    }

    if (provider === AssetProvider.R2 && !endpoint) {
      throw new Error("R2 需要填写 S3 API 接口地址。");
    }

    await upsertObjectStorageSettings({
      provider,
      endpoint,
      region,
      bucket,
      accessKeyId,
      secretAccessKey,
      publicBaseUrl,
      keyPrefix,
      forcePathStyle,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "保存图床设置时出错了。",
      success: null,
    };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/settings/image-hosting");

  return {
    error: null,
    success: "图床设置已更新。",
  };
}

function getObjectStorageProvider(formData: FormData, key: string) {
  const value = getRequiredString(formData, key, "存储服务");

  if (value === AssetProvider.S3 || value === AssetProvider.R2) {
    return value;
  }

  throw new Error("图床只支持 S3 或 R2。");
}

function getRequiredString(formData: FormData, key: string, label: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    throw new Error(`请填写 ${label}。`);
  }

  return value;
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function getRequiredUrl(formData: FormData, key: string, label: string) {
  const value = getRequiredString(formData, key, label);
  return parseUrl(value, label);
}

function getOptionalUrl(formData: FormData, key: string, label: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  return parseUrl(value, label);
}

function parseUrl(value: string, label: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error();
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    throw new Error(`请填写有效的 ${label}。`);
  }
}

function normalizeKeyPrefix(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/^\/+|\/+$/g, "");

  if (!normalized) {
    return null;
  }

  if (normalized.includes("..") || normalized.includes("\\") || normalized.includes("//")) {
    throw new Error("文件路径前缀不能包含 ..、反斜杠或连续斜杠。");
  }

  return normalized;
}
