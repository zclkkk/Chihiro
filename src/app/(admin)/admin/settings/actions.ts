"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/server/auth";
import { getSiteSettings, upsertSiteSettings } from "@/server/repositories/site";
import { isSiteUrlLockedByEnv, siteConfig } from "@/lib/site";
import { getOptionalString, getRequiredString } from "@/lib/form-helpers";

export type SaveGeneralSettingsState = {
  error: string | null;
  success: string | null;
};

export async function saveGeneralSettingsAction(
  _previousState: SaveGeneralSettingsState,
  formData: FormData,
): Promise<SaveGeneralSettingsState> {
  await requireAdminSession();

  const siteUrlLocked = isSiteUrlLockedByEnv();

  const siteName = getRequiredString(formData, "siteName", "站点名");
  const authorName = getRequiredString(formData, "authorName", "作者");
  const submittedSiteUrl = siteUrlLocked
    ? null
    : getRequiredUrl(formData, "siteUrl", "站点地址");
  const email = getOptionalEmail(formData, "email", "邮箱");
  const githubUrl = getOptionalUrl(formData, "githubUrl", "GitHub");
  const authorAvatarUrl = getOptionalImageSource(formData, "authorAvatarUrl", "作者头像");
  const heroIntro = getOptionalString(formData, "heroIntro");
  const summary = getOptionalString(formData, "summary");
  const motto = getOptionalString(formData, "motto");

  try {
    const currentSettings = await getSiteSettings();

    const siteUrl =
      submittedSiteUrl ??
      currentSettings?.siteUrl ??
      siteConfig.url;

    await upsertSiteSettings({
      siteName,
      siteDescription: currentSettings?.siteDescription ?? siteConfig.description,
      siteUrl,
      locale: currentSettings?.locale ?? siteConfig.locale,
      authorName,
      authorAvatarUrl,
      heroIntro,
      summary,
      motto,
      email,
      githubUrl,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "保存常规设置时出错了。",
      success: null,
    };
  }

  revalidatePath("/");
  revalidatePath("/posts");
  revalidatePath("/updates");
  revalidatePath("/timeline");
  revalidatePath("/more");
  revalidatePath("/message");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
  revalidatePath("/admin/settings");

  return {
    error: null,
    success: "常规设置已更新。",
  };
}

function parseUrl(value: string, label: string) {
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`请填写有效的${label}。`);
  }
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

function getOptionalImageSource(formData: FormData, key: string, label: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  try {
    const url = new URL(value);

    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    // Fall through to the shared validation message below.
  }

  throw new Error(`请填写有效的${label}。`);
}

function getOptionalEmail(formData: FormData, key: string, label: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`请填写有效的${label}。`);
  }

  return value;
}
