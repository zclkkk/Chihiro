import { createClient as createAnonClient } from "@/lib/supabase/anon";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { CONTENT_STATUS, type ContentStatus } from "@/types/domain";
import type {
  PostItem,
  PostListResult,
  PostListSort,
  PostNavigationItem,
  PostNavigationCategory,
} from "@/types/domain";
import type { Database, Tables, TablesInsert, Json } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type PostRowWithRelations = Tables<"posts"> & {
  category: { id: string; name: string; slug: string } | null;
  cover_asset: { id: string; alt: string | null; mime_type: string | null; width: number | null; height: number | null } | null;
  post_tags: Array<{ tags: { id: string; name: string; slug: string } }>;
};

type PostNavigationRowWithCategory = Tables<"posts"> & {
  category: { id: string; name: string; slug: string } | null;
};

const POST_SELECT = `
  id, title, slug, summary, status, content, content_html, author_name,
  published_at, created_at, updated_at, category_id, cover_asset_id,
  category:categories!posts_category_id_fkey(id, name, slug),
  cover_asset:assets!fk_posts_cover_asset(id, alt, mime_type, width, height),
  post_tags(tag_id, tags!post_tags_tag_id_fkey(id, name, slug))
`;

const NAVIGATION_SELECT = "id, title, slug, published_at, category:categories!posts_category_id_fkey(id, name, slug)";

export async function listPostsForAdmin(): Promise<PostItem[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const posts = (data ?? []) as unknown as PostRowWithRelations[];
  const postIds = posts.map((p) => p.id);

  const revisions = await getRevisionsForPosts(postIds);

  return posts.map((post) => mapPostRecord(post, revisions));
}

export async function getPostByIdForAdmin(id: string): Promise<PostItem | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  const revisions = await getRevisionsForPosts([data.id]);

  return mapPostRecord(data as unknown as PostRowWithRelations, revisions);
}

export async function getPublishedPostBySlug(slug: string): Promise<PostItem | null> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapPublicPostRecord(data as unknown as PostRowWithRelations);
}

export async function listAllPublishedPosts(
  options: { categorySlug?: string; tagSlugs?: string[]; query?: string } = {},
): Promise<PostItem[]> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    throw error;
  }

  let items = ((data ?? []) as unknown as PostRowWithRelations[]).map((post) => mapPublicPostRecord(post));

  if (options.categorySlug) {
    items = items.filter(
      (item) => item.category?.slug === options.categorySlug || (!item.category && options.categorySlug === "uncategorized"),
    );
  }

  if (options.tagSlugs && options.tagSlugs.length > 0) {
    items = items.filter((item) =>
      options.tagSlugs!.every((slug) => item.tags.some((tag) => tag.slug === slug)),
    );
  }

  if (options.query) {
    const q = options.query.toLowerCase();
    items = items.filter((item) => {
      const haystack = [
        item.title,
        item.summary ?? "",
        item.contentHtml ?? "",
        item.authorName ?? "",
        item.category?.name ?? "",
        ...item.tags.map((tag) => tag.name),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  return items;
}

export async function listPublishedPosts(
  options: {
    page?: number;
    pageSize?: number;
    sort?: PostListSort;
    categorySlug?: string;
    tagSlugs?: string[];
    query?: string;
  } = {},
): Promise<PostListResult> {
  const supabase = createAnonClient();
  const pageSize = getSafePageSize(options.pageSize);
  const page = getSafePage(options.page);

  let queryBuilder = supabase
    .from("posts")
    .select(POST_SELECT, { count: "exact" })
    .eq("status", "published");

  if (options.categorySlug) {
    if (options.categorySlug === "uncategorized") {
      queryBuilder = queryBuilder.is("category_id", null);
    } else {
      const { data: catData } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", options.categorySlug)
        .maybeSingle();
      if (!catData) {
        return { items: [], page, pageSize, totalCount: 0, totalPages: 0 };
      }
      queryBuilder = queryBuilder.eq("category_id", catData.id);
    }
  }

  if (options.tagSlugs && options.tagSlugs.length > 0) {
    const { data: tagData } = await supabase
      .from("tags")
      .select("id")
      .in("slug", options.tagSlugs);
    if (!tagData || tagData.length === 0) {
      return { items: [], page, pageSize, totalCount: 0, totalPages: 0 };
    }
    const tagIds = tagData.map((t) => t.id);
    const { data: postTagData } = await supabase
      .from("post_tags")
      .select("post_id")
      .in("tag_id", tagIds);
    if (!postTagData || postTagData.length === 0) {
      return { items: [], page, pageSize, totalCount: 0, totalPages: 0 };
    }
    const postTagCounts = new Map<string, number>();
    for (const pt of postTagData) {
      postTagCounts.set(pt.post_id, (postTagCounts.get(pt.post_id) ?? 0) + 1);
    }
    const matchingPostIds = [...postTagCounts.entries()]
      .filter(([, count]) => count === tagIds.length)
      .map(([id]) => id);
    if (matchingPostIds.length === 0) {
      return { items: [], page, pageSize, totalCount: 0, totalPages: 0 };
    }
    queryBuilder = queryBuilder.in("id", matchingPostIds);
  }

  if (options.query) {
    const q = options.query.replace(/[%_]/g, "\\$&");
    queryBuilder = queryBuilder.or(`title.ilike.%${q}%,summary.ilike.%${q}%`);
  }

  if (options.sort === "earliest") {
    queryBuilder = queryBuilder.order("published_at", { ascending: true });
  } else if (options.sort === "updated") {
    queryBuilder = queryBuilder.order("updated_at", { ascending: false });
  } else {
    queryBuilder = queryBuilder.order("published_at", { ascending: false });
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  queryBuilder = queryBuilder.range(from, to);

  const { data, error, count } = await queryBuilder;

  if (error) {
    throw error;
  }

  const items = ((data ?? []) as unknown as PostRowWithRelations[]).map(mapPublicPostRecord);

  return {
    items,
    page,
    pageSize,
    totalCount: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

export async function listRecentPublishedPostsForNavigation(
  limit = 5,
): Promise<PostNavigationItem[]> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from("posts")
    .select(NAVIGATION_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as PostNavigationRowWithCategory[]).map((record) => ({
    id: record.id,
    title: record.title,
    slug: record.slug,
    publishedAt: record.published_at ?? null,
    category: record.category
      ? { id: record.category.id, name: record.category.name, slug: record.category.slug }
      : null,
  }));
}

export async function listPublishedPostCategoriesForNavigation(
  limitPerCategory = 5,
): Promise<PostNavigationCategory[]> {
  const supabase = createAnonClient();

  const { data, error } = await supabase.rpc("list_published_post_categories_for_navigation", {
    p_limit: limitPerCategory,
  });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    slug: row.slug as string,
    label: row.label as string,
    contentCount: Number(row.content_count ?? 0),
    posts: (Array.isArray(row.posts) ? row.posts : []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      title: p.title as string,
      slug: p.slug as string,
    })),
  }));
}

export async function getPublishedPostSlugs(): Promise<string[]> {
  const posts = await listAllPublishedPosts();
  return posts.map((post) => post.slug);
}

export async function getPublishedPostRouteParams(): Promise<Array<{ category: string; slug: string }>> {
  const posts = await listAllPublishedPosts();
  return posts.map((post) => ({
    category: post.category?.slug ?? "uncategorized",
    slug: post.slug,
  }));
}

export type SavePostDraftInput = {
  id?: string;
  title: string;
  slug: string | null;
  summary: string | null;
  content: unknown;
  contentHtml: string | null;
  status: ContentStatus;
  categoryId: string | null;
  publishedAt: Date | null;
  tagIds: string[];
  authorName: string | null;
};

export async function savePostDraft(input: SavePostDraftInput): Promise<PostItem> {
  const supabase = await createServerClient();
  const tagIds = Array.from(new Set(input.tagIds.filter(Boolean)));
  const resolvedSlug = input.slug ?? (input.id ? null : createTemporarySlug());

  if (input.id && input.status === CONTENT_STATUS.PUBLISHED) {
    const current = await getPostByIdForAdmin(input.id);
    if (!current) {
      throw new Error(`Post not found: ${input.id}`);
    }

    const tagsSnapshot = tagIds.length > 0
      ? await fetchTagSnapshots(supabase, tagIds)
      : [];

    const revisionInsert: TablesInsert<"post_revisions"> = {
      post_id: input.id,
      kind: "draft",
      title: input.title,
      slug: resolvedSlug ?? current.slug,
      summary: input.summary,
      content: input.content as Json,
      content_html: input.contentHtml,
      author_name: input.authorName,
      published_at: input.publishedAt?.toISOString() ?? null,
      category_id: input.categoryId,
      cover_asset_id: current.coverAsset?.id ?? null,
      tags_snapshot: tagsSnapshot as Json,
    };

    const { error: revError } = await supabase
      .from("post_revisions")
      .insert(revisionInsert);

    if (revError) {
      throw revError;
    }

    const post = await getPostByIdForAdmin(input.id);
    if (!post) {
      throw new Error(`Post not found after revision: ${input.id}`);
    }
    return post;
  }

  const postData: TablesInsert<"posts"> = {
    title: input.title,
    summary: input.summary,
    content: input.content as Json,
    content_html: input.contentHtml,
    author_name: input.authorName,
    published_at: input.publishedAt?.toISOString() ?? null,
    status: input.status,
    slug: resolvedSlug ?? createTemporarySlug(),
    category_id: input.categoryId,
  };

  let postId: string;

  if (input.id) {
    const { error } = await supabase
      .from("posts")
      .update({ ...postData, slug: resolvedSlug ?? undefined })
      .eq("id", input.id);

    if (error) {
      if (error.code === "23505") {
        throw Object.assign(new Error("Unique constraint violation"), { code: "23505" });
      }
      throw error;
    }
    postId = input.id;

    await supabase.from("post_revisions").delete().eq("post_id", postId).eq("kind", "draft");
  } else {
    const { data, error } = await supabase
      .from("posts")
      .insert(postData)
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw Object.assign(new Error("Unique constraint violation"), { code: "23505" });
      }
      throw error;
    }
    postId = data.id;
  }

  await syncPostTags(supabase, postId, tagIds);

  const post = await getPostByIdForAdmin(postId);
  if (!post) {
    throw new Error(`Post not found: ${postId}`);
  }

  if (!input.id && !input.slug && post.slug.startsWith("draft-")) {
    const { error } = await supabase
      .from("posts")
      .update({ slug: post.id })
      .eq("id", post.id);

    if (!error) {
      return (await getPostByIdForAdmin(post.id)) ?? post;
    }
  }

  return post;
}

export async function publishPostById(id: string): Promise<PostItem> {
  const supabase = await createServerClient();
  const current = await getPostByIdForAdmin(id);

  if (!current) {
    throw new Error(`Post not found: ${id}`);
  }

  const draftRevision = await getDraftRevision(id);
  const publishedAt = current.publishedAt ?? new Date().toISOString();
  const resolvedPublishedAt = draftRevision?.publishedAt ?? publishedAt;

  if (draftRevision) {
    const { error } = await supabase
      .from("posts")
      .update({
        title: draftRevision.title,
        slug: draftRevision.slug,
        summary: draftRevision.summary,
        content: draftRevision.content as Json,
        content_html: draftRevision.contentHtml,
        author_name: draftRevision.authorName,
        published_at: resolvedPublishedAt,
        category_id: draftRevision.categoryId,
        cover_asset_id: draftRevision.coverAssetId,
        status: CONTENT_STATUS.PUBLISHED,
      })
      .eq("id", id);

    if (error) {
      throw error;
    }

    await supabase.from("post_revisions").delete().eq("post_id", id).eq("kind", "draft");

    if (draftRevision.tagIds && draftRevision.tagIds.length > 0) {
      await syncPostTags(supabase, id, draftRevision.tagIds);
    }

    const tagsSnapshot = draftRevision.tagIds
      ? await fetchTagSnapshots(supabase, draftRevision.tagIds)
      : [];

    await supabase.from("post_revisions").insert({
      post_id: id,
      kind: "published",
      title: draftRevision.title,
      slug: draftRevision.slug,
      summary: draftRevision.summary,
      content: draftRevision.content as Json,
      content_html: draftRevision.contentHtml,
      author_name: draftRevision.authorName,
      published_at: resolvedPublishedAt,
      category_id: draftRevision.categoryId,
      cover_asset_id: draftRevision.coverAssetId,
      tags_snapshot: tagsSnapshot as Json,
    });
  } else {
    const { error } = await supabase
      .from("posts")
      .update({
        status: CONTENT_STATUS.PUBLISHED,
        published_at: resolvedPublishedAt,
      })
      .eq("id", id);

    if (error) {
      throw error;
    }

    const tagIds = current.tags.map((t) => t.id);
    const tagsSnapshot = await fetchTagSnapshots(supabase, tagIds);

    await supabase.from("post_revisions").insert({
      post_id: id,
      kind: "published",
      title: current.title,
      slug: current.slug,
      summary: current.summary,
      content: current.content as Json,
      content_html: current.contentHtml,
      author_name: current.authorName,
      published_at: resolvedPublishedAt,
      category_id: current.category?.id ?? null,
      cover_asset_id: current.coverAsset?.id ?? null,
      tags_snapshot: tagsSnapshot as Json,
    });
  }

  const post = await getPostByIdForAdmin(id);
  if (!post) {
    throw new Error(`Post not found after publish: ${id}`);
  }
  return post;
}

export async function discardPostRevisionById(id: string): Promise<PostItem> {
  const supabase = await createServerClient();
  const publishedRevision = await getPublishedRevision(id);

  if (!publishedRevision) {
    throw new Error("这篇文章没有可以删除的草稿。");
  }

  const { error } = await supabase
    .from("posts")
    .update({
      title: publishedRevision.title,
      slug: publishedRevision.slug,
      summary: publishedRevision.summary,
      content: publishedRevision.content as Json,
      content_html: publishedRevision.contentHtml,
      author_name: publishedRevision.authorName,
      published_at: publishedRevision.publishedAt,
      category_id: publishedRevision.categoryId,
      cover_asset_id: publishedRevision.coverAssetId,
      status: CONTENT_STATUS.PUBLISHED,
    })
    .eq("id", id);

  if (error) {
    throw error;
  }

  await supabase.from("post_revisions").delete().eq("post_id", id).eq("kind", "draft");

  if (publishedRevision.tagIds && publishedRevision.tagIds.length > 0) {
    await syncPostTags(supabase, id, publishedRevision.tagIds);
  }

  const post = await getPostByIdForAdmin(id);
  if (!post) {
    throw new Error(`Post not found after discard: ${id}`);
  }
  return post;
}

export async function deletePostById(id: string): Promise<PostItem> {
  const post = await getPostByIdForAdmin(id);
  if (!post) {
    throw new Error(`Post not found: ${id}`);
  }

  const supabase = await createServerClient();
  const { error } = await supabase.from("posts").delete().eq("id", id);

  if (error) {
    throw error;
  }

  return post;
}

export async function unpublishPostById(id: string): Promise<PostItem> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("posts")
    .update({
      status: CONTENT_STATUS.DRAFT,
      published_at: null,
    })
    .eq("id", id);

  if (error) {
    throw error;
  }

  const post = await getPostByIdForAdmin(id);
  if (!post) {
    throw new Error(`Post not found after unpublish: ${id}`);
  }
  return post;
}

async function getRevisionsForPosts(postIds: string[]) {
  if (postIds.length === 0) return new Map<string, { hasDraft: boolean; hasPublished: boolean }>();

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("post_revisions")
    .select("post_id, kind")
    .in("post_id", postIds);

  if (error) {
    return new Map<string, { hasDraft: boolean; hasPublished: boolean }>();
  }

  const map = new Map<string, { hasDraft: boolean; hasPublished: boolean }>();
  for (const rev of data ?? []) {
    const existing = map.get(rev.post_id) ?? { hasDraft: false, hasPublished: false };
    if (rev.kind === "draft") existing.hasDraft = true;
    if (rev.kind === "published") existing.hasPublished = true;
    map.set(rev.post_id, existing);
  }
  return map;
}

async function getDraftRevision(postId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("post_revisions")
    .select("*")
    .eq("post_id", postId)
    .eq("kind", "draft")
    .order("saved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    title: data.title,
    slug: data.slug,
    summary: data.summary,
    content: data.content,
    contentHtml: data.content_html,
    authorName: data.author_name,
    publishedAt: data.published_at,
    categoryId: data.category_id,
    coverAssetId: data.cover_asset_id,
    tagIds: extractTagIds(data.tags_snapshot),
  };
}

async function getPublishedRevision(postId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("post_revisions")
    .select("*")
    .eq("post_id", postId)
    .eq("kind", "published")
    .order("saved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    title: data.title,
    slug: data.slug,
    summary: data.summary,
    content: data.content,
    contentHtml: data.content_html,
    authorName: data.author_name,
    publishedAt: data.published_at,
    categoryId: data.category_id,
    coverAssetId: data.cover_asset_id,
    tagIds: extractTagIds(data.tags_snapshot),
  };
}

function extractTagIds(tagsSnapshot: unknown): string[] {
  if (!Array.isArray(tagsSnapshot)) return [];
  return (tagsSnapshot as Array<Record<string, unknown>>)
    .filter((item) => item != null && typeof item === "object" && typeof item.id === "string")
    .map((item) => item.id as string);
}

async function fetchTagSnapshots(supabase: SupabaseClient<Database>, tagIds: string[]) {
  if (tagIds.length === 0) return [];
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, slug")
    .in("id", tagIds);

  if (error || !data) return [];
  return data.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
  }));
}

async function syncPostTags(supabase: SupabaseClient<Database>, postId: string, tagIds: string[]) {
  const { error } = await supabase.rpc("sync_post_tags", {
    p_post_id: postId,
    p_tag_ids: tagIds,
  });

  if (error) {
    throw error;
  }
}

function mapPostRecord(
  post: PostRowWithRelations,
  revisions: Map<string, { hasDraft: boolean; hasPublished: boolean }>,
): PostItem {
  const rev = revisions.get(post.id) ?? { hasDraft: false, hasPublished: false };
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    status: post.status as ContentStatus,
    content: post.content,
    contentHtml: post.content_html,
    authorName: post.author_name,
    publishedAt: post.published_at ?? null,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    hasDraftRevision: rev.hasDraft,
    hasPublishedRevision: rev.hasPublished,
    category: post.category
      ? { id: post.category.id, name: post.category.name, slug: post.category.slug }
      : null,
    coverAsset: post.cover_asset
      ? {
          id: post.cover_asset.id,
          alt: post.cover_asset.alt,
          mimeType: post.cover_asset.mime_type,
          width: post.cover_asset.width,
          height: post.cover_asset.height,
        }
      : null,
    tags: (post.post_tags ?? []).map((pt) => ({
      id: pt.tags.id,
      name: pt.tags.name,
      slug: pt.tags.slug,
    })),
  };
}

function mapPublicPostRecord(
  post: PostRowWithRelations,
): PostItem {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    status: post.status as ContentStatus,
    content: post.content,
    contentHtml: post.content_html,
    authorName: post.author_name,
    publishedAt: post.published_at ?? null,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    hasDraftRevision: false,
    hasPublishedRevision: false,
    category: post.category
      ? { id: post.category.id, name: post.category.name, slug: post.category.slug }
      : null,
    coverAsset: post.cover_asset
      ? {
          id: post.cover_asset.id,
          alt: post.cover_asset.alt,
          mimeType: post.cover_asset.mime_type,
          width: post.cover_asset.width,
          height: post.cover_asset.height,
        }
      : null,
    tags: (post.post_tags ?? []).map((pt) => ({
      id: pt.tags.id,
      name: pt.tags.name,
      slug: pt.tags.slug,
    })),
  };
}

function sortPublishedPosts(items: PostItem[], sort: PostListSort = "latest") {
  const nextItems = [...items];
  if (sort === "earliest") {
    nextItems.sort((a, b) => compareDates(a.publishedAt, b.publishedAt));
  } else if (sort === "updated") {
    nextItems.sort((a, b) => compareDates(b.updatedAt, a.updatedAt));
  } else {
    nextItems.sort((a, b) => compareDates(b.publishedAt, a.publishedAt));
  }
  return nextItems;
}

function compareDates(left?: string | null, right?: string | null) {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return leftTime - rightTime;
}

function getSafePage(value?: number) {
  if (!value || value < 1) return 1;
  return Math.floor(value);
}

function getSafePageSize(value?: number) {
  if (!value || value < 1) return 10;
  return Math.min(Math.floor(value), 100);
}

function createTemporarySlug() {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
