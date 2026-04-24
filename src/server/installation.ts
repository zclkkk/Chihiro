import "server-only";

import { hasDatabaseUrl } from "@/server/db/client";
import {
  isDatabaseSchemaMissingError,
  isDatabaseUnavailableError,
} from "@/server/database-errors";
import { countAdminUsers } from "@/server/repositories/admin-auth";
import { getSiteSettings } from "@/server/repositories/site";

export type InstallationStatus =
  | "missing_database"
  | "database_unavailable"
  | "schema_missing"
  | "ready";

export type InstallationState = {
  installed: boolean;
  status: InstallationStatus;
  adminUserCount: number;
  hasSiteSettings: boolean;
};

export async function getInstallationState(): Promise<InstallationState> {
  if (!hasDatabaseUrl()) {
    return {
      installed: false,
      status: "missing_database",
      adminUserCount: 0,
      hasSiteSettings: false,
    };
  }

  try {
    const [adminUserCount, siteSettings] = await Promise.all([
      countAdminUsers(),
      getSiteSettings(),
    ]);
    const hasSiteSettings = Boolean(siteSettings);

    return {
      installed: adminUserCount > 0 && hasSiteSettings,
      status: "ready",
      adminUserCount,
      hasSiteSettings,
    };
  } catch (error) {
    if (isDatabaseSchemaMissingError(error)) {
      return {
        installed: false,
        status: "schema_missing",
        adminUserCount: 0,
        hasSiteSettings: false,
      };
    }

    if (isDatabaseUnavailableError(error)) {
      return {
        installed: false,
        status: "database_unavailable",
        adminUserCount: 0,
        hasSiteSettings: false,
      };
    }

    throw error;
  }
}

export function isInstallationComplete(state: InstallationState) {
  return state.installed;
}
