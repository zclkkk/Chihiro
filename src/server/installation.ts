import "server-only";

import { createClient as createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getSiteSettings } from "@/server/supabase/site";

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

  try {
    const adminSupabase = createAdminClient();

    const [adminResult, settings] = await Promise.all([
      adminSupabase.from("admin_profiles").select("id", { count: "exact", head: true }),
      getSiteSettings(),
    ]);

    const adminUserCount = adminResult.count ?? 0;
    const hasSiteSettings = Boolean(settings);

    return {
      installed: adminUserCount > 0 && hasSiteSettings,
      status: adminUserCount > 0 && hasSiteSettings ? "ready" : "needs_installation",
      adminUserCount,
      hasSiteSettings,
    };
  } catch {
    return {
      installed: false,
      status: "needs_installation",
      adminUserCount: 0,
      hasSiteSettings: false,
    };
  }
}

export function isInstallationComplete(state: InstallationState) {
  return state.installed;
}
