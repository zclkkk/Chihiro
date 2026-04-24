import "server-only";

import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function getAuthContext() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, isAdmin: false };
  }

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  return {
    user,
    isAdmin: Boolean(profile),
  };
}

export async function requireAdmin(nextPath = "/admin") {
  const { user, isAdmin } = await getAuthContext();

  if (!user || !isAdmin) {
    const params = new URLSearchParams();
    params.set("admin-login", "1");
    params.set("next", nextPath.startsWith("/admin") ? nextPath : "/admin");
    redirect(`/?${params.toString()}`);
  }

  return { user, isAdmin };
}

export async function hasAdminUsers(): Promise<boolean> {
  const adminSupabase = createAdminClient();
  const { count, error } = await adminSupabase
    .from("admin_profiles")
    .select("*", { count: "exact", head: true });

  if (error) {
    return false;
  }

  return (count ?? 0) > 0;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const { isAdmin } = await getAuthContext();
  return isAdmin;
}
