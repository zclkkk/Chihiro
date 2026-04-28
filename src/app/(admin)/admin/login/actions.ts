"use server";

import { redirect } from "next/navigation";
import { clearAdminSession, signInAdmin } from "@/server/auth";
import { getOptionalString } from "@/lib/form-helpers";

export type AdminLoginState = {
  error: string | null;
};

export async function loginAction(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const email = getOptionalString(formData, "email") ?? "";
  const password = getOptionalString(formData, "password") ?? "";
  const next = getOptionalString(formData, "next");
  const result = await signInAdmin(email, password);

  if (!result.ok) {
    return { error: result.error };
  }

  redirect(next && next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/");
}
