import { createClient as createAnonClient } from "@/lib/supabase/anon";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type {
  CategoryOption,
} from "@/types/domain";

export async function listPostCategories(): Promise<CategoryOption[]> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, posts(count)")
    .order("name");

  if (error) {
    throw error;
  }

  return (data ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    contentCount: category.posts?.[0]?.count ?? 0,
  }));
}

export async function listCategoriesForAdmin(): Promise<CategoryOption[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, posts(count)")
    .order("name");

  if (error) {
    throw error;
  }

  return (data ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    contentCount: category.posts?.[0]?.count ?? 0,
  }));
}

export async function getCategoryByIdForAdmin(id: string): Promise<CategoryOption | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, posts(count)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    contentCount: data.posts?.[0]?.count ?? 0,
  };
}

export async function createCategory(input: {
  name: string;
  slug: string;
  description: string | null;
}): Promise<CategoryOption> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description,
    })
    .select("id, name, slug, description, posts(count)")
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
    description: data.description,
    contentCount: 0,
  };
}

export async function updateCategoryById(input: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}): Promise<CategoryOption> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("categories")
    .update({
      name: input.name,
      slug: input.slug,
      description: input.description,
    })
    .eq("id", input.id)
    .select("id, name, slug, description, posts(count)")
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
    description: data.description,
    contentCount: data.posts?.[0]?.count ?? 0,
  };
}

export async function deleteCategoryById(id: string): Promise<CategoryOption | null> {
  const supabase = await createServerClient();

  const category = await getCategoryByIdForAdmin(id);
  if (!category) {
    throw new Error("分类不存在。");
  }

  const { error } = await supabase.rpc("delete_category", { p_id: id });

  if (error) {
    throw error;
  }

  return category;
}
