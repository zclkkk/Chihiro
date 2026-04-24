import "server-only";

import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getInstallationState } from "@/server/installation";

export type AdminBackendStatus =
  | "ready"
  | "needs_installation"
  | "missing_env";

export type AdminBackendState = {
  status: AdminBackendStatus;
};

export async function getAdminBackendState(): Promise<AdminBackendState> {
  if (!hasSupabaseEnv()) {
    return { status: "missing_env" };
  }

  try {
    const installationState = await getInstallationState();

    if (installationState.installed) {
      return { status: "ready" };
    }

    return { status: "needs_installation" };
  } catch {
    return { status: "needs_installation" };
  }
}
