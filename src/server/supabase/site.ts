import { createClient as createAnonClient } from "@/lib/supabase/anon";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  SiteSettingsRecord,
} from "@/types/domain";

export async function getSiteSettings(): Promise<SiteSettingsRecord | null> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", "default")
    .single();

  if (error || !data) {
    return null;
  }

  return {
    siteName: data.site_name,
    siteDescription: data.site_description,
    siteUrl: data.site_url,
    locale: data.locale,
    authorName: data.author_name,
    authorAvatarUrl: data.author_avatar_url,
    heroIntro: data.hero_intro,
    summary: data.summary,
    motto: data.motto,
    email: data.email,
    githubUrl: data.github_url,
  };
}

export async function getSiteCreatedAt(): Promise<string | null> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from("site_settings")
    .select("created_at")
    .eq("id", "default")
    .single();

  if (error || !data) {
    return null;
  }

  return data.created_at;
}

export async function upsertSiteSettings(
  input: SiteSettingsRecord,
  supabaseOverride?: import("@supabase/supabase-js").SupabaseClient<Database>,
) {
  const supabase = supabaseOverride ?? await createServerClient();

  const { error } = await supabase
    .from("site_settings")
    .upsert(
      {
        id: "default",
        site_name: input.siteName,
        site_description: input.siteDescription,
        site_url: input.siteUrl,
        locale: input.locale,
        author_name: input.authorName,
        author_avatar_url: input.authorAvatarUrl,
        hero_intro: input.heroIntro,
        summary: input.summary,
        motto: input.motto,
        email: input.email,
        github_url: input.githubUrl,
      },
      { onConflict: "id" },
    );

  if (error) {
    throw error;
  }
}
