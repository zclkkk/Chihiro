export const ADMIN_SESSION_COOKIE = "chihiro_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
export const MIN_ADMIN_USERNAME_LENGTH = 3;
export const MIN_ADMIN_PASSWORD_LENGTH = 8;

export function normalizeAdminUsername(value: string) {
  return value.trim().toLowerCase();
}
