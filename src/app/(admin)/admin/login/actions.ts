"use server";

import { redirect } from "next/navigation";
import {
  clearAdminSession,
  signInAdmin,
} from "@/server/auth";

export type AdminLoginState = {
  error: string | null;
};

export async function loginAction(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const username = getRequiredString(formData, "username");
  const password = getRequiredString(formData, "password");
  const next = getOptionalString(formData, "next");
  const result = await signInAdmin(username, password);

  if (!result.ok) {
    return {
      error: result.error,
    };
  }

  redirect(getSafeAdminPath(next) ?? "/admin");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/");
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
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

function getSafeAdminPath(value: string | null) {
  if (!value || !value.startsWith("/admin")) {
    return null;
  }

  return value;
}
