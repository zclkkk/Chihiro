"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { siteConfig } from "@/lib/site";
import { isDatabaseUnavailableError } from "@/server/database-errors";
import { getInstallationState, type InstallationStatus } from "@/server/installation";
import { upsertSiteSettings } from "@/server/repositories/site";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";

const MIN_ADMIN_PASSWORD_LENGTH = 8;

export type InstallActionState = {
  error: string | null;
};

export async function initializeSiteAction(
  _previousState: InstallActionState,
  formData: FormData,
): Promise<InstallActionState> {
  const installationState = await getInstallationState();

  if (installationState.status !== "ready") {
    return { error: stateErrorMessage(installationState.status) };
  }

  const siteName = getRequiredString(formData, "siteName");
  const siteDescription = getRequiredString(formData, "siteDescription");
  const siteUrl = getValidatedUrl(getRequiredString(formData, "siteUrl"));
  const locale = getOptionalString(formData, "locale") || siteConfig.locale;
  const authorName = getRequiredString(formData, "authorName");
  const authorAvatarUrl = getOptionalImageSource(formData, "authorAvatarUrl");
  const heroIntro = getOptionalString(formData, "heroIntro");
  const summary = getOptionalString(formData, "summary");
  const motto = getOptionalString(formData, "motto");
  const email = getOptionalString(formData, "email");
  const githubUrl = getOptionalUrl(formData, "githubUrl");

  if (!siteName) return { error: "请填写站点名称。" };
  if (!authorName) return { error: "请填写作者名称。" };
  if (!siteDescription) return { error: "请填写站点简介。" };
  if (!siteUrl) return { error: "请填写有效的站点地址。" };

  try {
    if (!installationState.hasAdminUser) {
      const adminEmail = normalizeEmail(getRequiredString(formData, "adminEmail"));
      const adminPassword = getRequiredString(formData, "adminPassword");

      if (!adminEmail) {
        return { error: "请填写有效的管理员邮箱。" };
      }
      if (adminPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
        return { error: `管理员密码至少需要 ${MIN_ADMIN_PASSWORD_LENGTH} 个字符。` };
      }

      const supabaseAdmin = createSupabaseAdminClient();
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        app_metadata: { role: "admin" },
        user_metadata: { display_name: authorName },
      });
      if (createError) {
        return { error: createError.message };
      }

      const supabase = await createSupabaseServerClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });
      if (signInError) {
        return { error: signInError.message };
      }
    }

    await upsertSiteSettings({
      siteName,
      siteDescription,
      siteUrl,
      locale,
      authorName,
      authorAvatarUrl,
      heroIntro,
      summary,
      motto,
      email,
      githubUrl,
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return { error: "数据库当前不可用，请先恢复数据库后再初始化。" };
    }
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/posts");
  revalidatePath("/updates");
  revalidatePath("/timeline");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
  redirect("/admin");
}

function stateErrorMessage(status: Exclude<InstallationStatus, "ready">) {
  switch (status) {
    case "missing_database":
      return "还没有配置 DATABASE_URL，请先把数据库连接串写入环境变量。";
    case "database_unavailable":
      return "数据库当前不可用，请先检查连接状态。";
    case "schema_missing":
      return "数据库表结构还没有初始化，请先运行 npx prisma migrate deploy。";
  }
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) return "";
  return value.trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function getValidatedUrl(value: string) {
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function getOptionalUrl(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString().replace(/\/$/, "");
    }
    return null;
  } catch {
    return null;
  }
}

function getOptionalImageSource(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString().replace(/\/$/, "");
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeEmail(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "";
  return trimmed;
}
