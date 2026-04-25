"use server";

import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getInstallationState } from "@/server/installation";
import { upsertSiteSettings } from "@/server/supabase/site";
import type { SiteSettingsRecord } from "@/types/domain";

export type InstallActionState = {
  error: string | null;
};

export async function initializeSiteAction(
  _previousState: InstallActionState,
  formData: FormData,
): Promise<InstallActionState> {
  if (!hasSupabaseEnv()) {
    return {
      error:
        "还没有配置 Supabase 环境变量，请先配置 NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY 和 SUPABASE_SERVICE_ROLE_KEY。",
    };
  }

  const installationState = await getInstallationState();

  if (installationState.installed) {
    redirect("/admin");
  }

  const needsAdminSetup = installationState.adminUserCount === 0;

  const siteName = getRequiredString(formData, "siteName");
  const siteDescription = getOptionalString(formData, "siteDescription") ?? "";
  const siteUrl = getRequiredString(formData, "siteUrl");
  const locale = getOptionalString(formData, "locale") ?? "zh-CN";
  const authorName = getOptionalString(formData, "authorName") ?? "Admin";
  const authorAvatarUrl = getOptionalString(formData, "authorAvatarUrl");
  const heroIntro = getOptionalString(formData, "heroIntro");
  const summary = getOptionalString(formData, "summary");
  const motto = getOptionalString(formData, "motto");
  const siteEmail = getOptionalString(formData, "email");
  const githubUrl = getOptionalString(formData, "githubUrl");

  try {
    const adminSupabase = createAdminClient();
    let adminCredentials: { email: string; password: string } | null = null;

    if (needsAdminSetup) {
      const adminEmail = getRequiredString(formData, "adminEmail");
      const password = getRequiredString(formData, "password");
      const confirmPassword = getRequiredString(formData, "confirmPassword");

      if (password !== confirmPassword) {
        return {
          error: "两次输入的密码不一致。",
        };
      }

      if (password.length < 8) {
        return {
          error: "密码长度至少为 8 位。",
        };
      }

      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: adminEmail,
        password,
        email_confirm: true,
      });

      if (authError) {
        return {
          error: `创建管理员账号失败：${authError.message}`,
        };
      }

      const userId = authData.user.id;

      const { error: profileError } = await adminSupabase
        .from("admin_profiles")
        .insert({ id: userId });

      if (profileError) {
        return {
          error: `创建管理员档案失败：${profileError.message}`,
        };
      }

      adminCredentials = { email: adminEmail, password };
    }

    const settings: SiteSettingsRecord = {
      siteName,
      siteDescription,
      siteUrl,
      locale,
      authorName,
      authorAvatarUrl,
      heroIntro,
      summary,
      motto,
      email: siteEmail,
      githubUrl,
    };

    await upsertSiteSettings(settings, adminSupabase);

    if (adminCredentials) {
      const supabase = await createServerClient();
      await supabase.auth.signInWithPassword({
        email: adminCredentials.email,
        password: adminCredentials.password,
      });
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "初始化站点时出错了。",
    };
  }

  redirect("/admin");
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`请填写 ${key}。`);
  }

  return value.trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}
