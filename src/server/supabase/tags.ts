import { createClient as createAnonClient } from "@/lib/supabase/anon";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type {
  TagOption,
  TagItem,
} from "@/types/domain";

export async function listTags(): Promise<TagOption[]> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from("tags")
    .select("id, name, slug")
    .order("name");

  if (error) {
    throw error;
  }

  return (data ?? []).map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
  }));
}

export async function listTagsForAdmin(): Promise<TagItem[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("tags")
    .select("id, name, slug, created_at, updated_at, post_tags(count)")
    .order("name");

  if (error) {
    throw error;
  }

  return (data ?? []).map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    createdAt: tag.created_at,
    updatedAt: tag.updated_at,
    postCount: tag.post_tags?.[0]?.count ?? 0,
    contentCount: tag.post_tags?.[0]?.count ?? 0,
  }));
}

export async function getTagByIdForAdmin(id: string): Promise<TagItem | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("tags")
    .select("id, name, slug, created_at, updated_at, post_tags(count)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    postCount: data.post_tags?.[0]?.count ?? 0,
    contentCount: data.post_tags?.[0]?.count ?? 0,
  };
}

export async function createTag(input: {
  name: string;
  slug: string;
}): Promise<TagItem> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("tags")
    .insert({
      name: input.name,
      slug: input.slug,
    })
    .select("id, name, slug, created_at, updated_at, post_tags(count)")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw Object.assign(new Error("Unique constraint violation"), { code: "23505" });
    }
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    postCount: 0,
    contentCount: 0,
  };
}

export async function updateTagById(input: {
  id: string;
  name: string;
  slug: string;
}): Promise<TagItem> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("tags")
    .update({
      name: input.name,
      slug: input.slug,
    })
    .eq("id", input.id)
    .select("id, name, slug, created_at, updated_at, post_tags(count)")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw Object.assign(new Error("Unique constraint violation"), { code: "23505" });
    }
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    postCount: data.post_tags?.[0]?.count ?? 0,
    contentCount: data.post_tags?.[0]?.count ?? 0,
  };
}

export async function deleteTagById(id: string): Promise<TagItem | null> {
  const supabase = await createServerClient();

  const tag = await getTagByIdForAdmin(id);
  if (!tag) {
    throw new Error("标签不存在。");
  }

  const { error } = await supabase.rpc("delete_tag", { p_id: id });

  if (error) {
    throw error;
  }

  return tag;
}
