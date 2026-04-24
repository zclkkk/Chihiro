"use server";

import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/server/auth";

export type AdminLoginState = {
  error: string | null;
};

export async function loginAction(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const email = getRequiredString(formData, "email");
  const password = getRequiredString(formData, "password");
  const next = getOptionalString(formData, "next");

  const supabase = await createServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: "邮箱或密码不正确。",
    };
  }

  redirect(getSafeAdminPath(next) ?? "/admin");
}

export async function logoutAction() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
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
