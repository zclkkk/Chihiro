import "server-only";

import { hasDatabaseUrl } from "@/server/db/client";
import {
  isDatabaseSchemaMissingError,
  isDatabaseUnavailableError,
} from "@/server/database-errors";
import { hasAdminUsers } from "@/server/auth";
import { getSiteSettings } from "@/server/repositories/site";

export type InstallationStatus =
  | "missing_database"
  | "database_unavailable"
  | "schema_missing"
  | "ready";

export type InstallationState = {
  installed: boolean;
  status: InstallationStatus;
  hasAdminUser: boolean;
  hasSiteSettings: boolean;
};

export async function getInstallationState(): Promise<InstallationState> {
  if (!hasDatabaseUrl()) {
    return {
      installed: false,
      status: "missing_database",
      hasAdminUser: false,
      hasSiteSettings: false,
    };
  }

  try {
    const [hasAdmin, siteSettings] = await Promise.all([
      hasAdminUsers(),
      getSiteSettings(),
    ]);
    const hasSiteSettings = Boolean(siteSettings);

    return {
      installed: hasAdmin && hasSiteSettings,
      status: "ready",
      hasAdminUser: hasAdmin,
      hasSiteSettings,
    };
  } catch (error) {
    if (isDatabaseSchemaMissingError(error)) {
      return {
        installed: false,
        status: "schema_missing",
        hasAdminUser: false,
        hasSiteSettings: false,
      };
    }

    if (isDatabaseUnavailableError(error)) {
      return {
        installed: false,
        status: "database_unavailable",
        hasAdminUser: false,
        hasSiteSettings: false,
      };
    }

    throw error;
  }
}

export function isInstallationComplete(state: InstallationState) {
  return state.installed;
}
