"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth";
import { upsertSiteSettings, getSiteSettings } from "@/server/supabase/site";
import { siteConfig } from "@/lib/site";
import type { SiteSettingsRecord } from "@/types/domain";

export type SettingsFormState = {
  error: string | null;
  success: boolean;
};

export async function saveSettingsAction(
  _previousState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  await requireAdmin();

  const siteName = getRequiredString(formData, "siteName");
  const siteUrl = getRequiredString(formData, "siteUrl");
  const authorName = getRequiredString(formData, "authorName");
  const heroIntro = getOptionalString(formData, "heroIntro");
  const summary = getOptionalString(formData, "summary");
  const motto = getOptionalString(formData, "motto");
  const email = getOptionalString(formData, "email");
  const githubUrl = getOptionalString(formData, "githubUrl");

  const currentSettings = await getSiteSettings();

  const settings: SiteSettingsRecord = {
    siteName,
    siteDescription: currentSettings?.siteDescription ?? siteConfig.description,
    siteUrl,
    locale: currentSettings?.locale ?? siteConfig.locale,
    authorName,
    authorAvatarUrl: currentSettings?.authorAvatarUrl ?? null,
    heroIntro,
    summary,
    motto,
    email,
    githubUrl,
  };

  try {
    await upsertSiteSettings(settings);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "保存设置时出错了。",
      success: false,
    };
  }

  revalidateSettingsSurface();

  return {
    error: null,
    success: true,
  };
}

function getRequiredString(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    throw new Error(`请填写 ${key}。`);
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

function revalidateSettingsSurface() {
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/posts");
  revalidatePath("/updates");
  revalidatePath("/timeline");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
}
