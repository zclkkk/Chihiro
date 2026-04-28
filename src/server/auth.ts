import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

type AdminSignInResult =
  | { ok: true }
  | { ok: false; error: string };

export async function getCurrentAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && user.app_metadata?.role === "admin" ? user : null;
}

export async function isAdminAuthenticated() {
  return Boolean(await getCurrentAdmin());
}

export async function hasAdminUsers() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 50 });
  if (error) return false;
  return data.users.some((user) => user.app_metadata?.role === "admin");
}

export async function signInAdmin(email: string, password: string): Promise<AdminSignInResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data.user) {
    return { ok: false, error: "邮箱或密码不正确。" };
  }

  if (data.user.app_metadata?.role !== "admin") {
    await supabase.auth.signOut();
    return { ok: false, error: "该帐号没有管理员权限。" };
  }

  return { ok: true };
}

export async function clearAdminSession() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

export async function requireAdminSession(nextPath = "/admin") {
  const admin = await getCurrentAdmin();
  if (!admin) {
    const params = new URLSearchParams();
    params.set("admin-login", "1");
    params.set("next", nextPath.startsWith("/admin") ? nextPath : "/admin");
    redirect(`/?${params.toString()}`);
  }
}
