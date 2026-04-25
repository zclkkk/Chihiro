import "server-only";

import { createClient as createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export type InstallationStatus = "needs_installation" | "ready";

export type InstallationState = {
  installed: boolean;
  status: InstallationStatus;
  adminUserCount: number;
  hasSiteSettings: boolean;
};

export async function getInstallationState(): Promise<InstallationState> {
  if (!hasSupabaseEnv()) {
    return {
      installed: false,
      status: "needs_installation",
      adminUserCount: 0,
      hasSiteSettings: false,
    };
  }

  const adminSupabase = createAdminClient();

  const [adminResult, siteSettingsResult] = await Promise.all([
    adminSupabase
      .from("admin_profiles")
      .select("id", { count: "exact", head: true }),
    adminSupabase
      .from("site_settings")
      .select("id", { count: "exact", head: true })
      .eq("id", "default"),
  ]);

  if (adminResult.error) {
    throw adminResult.error;
  }

  if (siteSettingsResult.error) {
    throw siteSettingsResult.error;
  }

  const adminUserCount = adminResult.count ?? 0;
  const hasSiteSettings = (siteSettingsResult.count ?? 0) > 0;

  return {
    installed: adminUserCount > 0 && hasSiteSettings,
    status: adminUserCount > 0 && hasSiteSettings ? "ready" : "needs_installation",
    adminUserCount,
    hasSiteSettings,
  };
}

export function isInstallationComplete(state: InstallationState) {
  return state.installed;
}
