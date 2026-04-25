import { createClient as createAnonClient } from "@/lib/supabase/anon";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { CONTENT_STATUS, type ContentStatus } from "@/types/domain";
import type {
  UpdateItem,
  UpdateListResult,
  UpdateListSort,
  UpdateNavigationItem,
} from "@/types/domain";
import type { Tables, TablesInsert, Json } from "@/types/database";
import { getParagraphsFromContent } from "@/lib/content";
import { siteConfig } from "@/lib/site";

const UPDATE_SELECT = "id, title, author_name, status, content, content_html, published_at, created_at, updated_at";

export async function listUpdatesForAdmin(): Promise<UpdateItem[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("updates")
    .select(UPDATE_SELECT)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const updates = data ?? [];
  const updateIds = updates.map((u) => u.id);
  const revisions = await getRevisionsForUpdates(updateIds);

  return updates.map((update) => mapUpdateRecord(update, revisions));
}

export async function getUpdateByIdForAdmin(id: string): Promise<UpdateItem | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("updates")
    .select(UPDATE_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  const revisions = await getRevisionsForUpdates([data.id]);
  return mapUpdateRecord(data, revisions);
}

export async function listAllPublishedUpdates(
  options: { query?: string } = {},
): Promise<UpdateItem[]> {
  const supabase = createAnonClient();

  let queryBuilder = supabase
    .from("updates")
    .select(UPDATE_SELECT)
    .eq("status", "published");

  if (options.query) {
    const q = options.query.replace(/[%_]/g, "\\$&");
    queryBuilder = queryBuilder.or(`title.ilike.%${q}%,content_html.ilike.%${q}%`);
  }

  const { data, error } = await queryBuilder.order("published_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((update) => mapUpdateRecord(update, new Map()));
}

export async function listPublishedUpdates(
  options: {
    page?: number;
    pageSize?: number;
    sort?: UpdateListSort;
    query?: string;
  } = {},
): Promise<UpdateListResult> {
  const supabase = createAnonClient();
  const pageSize = getSafePageSize(options.pageSize);
  const page = getSafePage(options.page);

  let queryBuilder = supabase
    .from("updates")
    .select(UPDATE_SELECT, { count: "exact" })
    .eq("status", "published");

  if (options.query) {
    const q = options.query.replace(/[%_]/g, "\\$&");
    queryBuilder = queryBuilder.or(`title.ilike.%${q}%,content_html.ilike.%${q}%`);
  }

  if (options.sort === "earliest") {
    queryBuilder = queryBuilder.order("published_at", { ascending: true });
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

  const items = (data ?? []).map((update) => mapUpdateRecord(update, new Map()));

  return {
    items,
    page,
    pageSize,
    totalCount: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

export async function listRecentPublishedUpdatesForNavigation(
  limit = 5,
): Promise<UpdateNavigationItem[]> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from("updates")
    .select("id, title, author_name, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    authorName: item.author_name ?? siteConfig.author,
    publishedAt: item.published_at ?? null,
  }));
}

export type SaveUpdateInput = {
  id?: string;
  content: unknown;
  contentHtml: string | null;
  authorName: string | null;
  status: ContentStatus;
  publishedAt: Date | null;
};

export async function saveUpdate(input: SaveUpdateInput): Promise<UpdateItem> {
  const supabase = await createServerClient();

  const current = input.id ? await getUpdateByIdForAdmin(input.id) : null;

  if (current && (current.status === CONTENT_STATUS.PUBLISHED || current.hasDraftRevision)) {
    const resolvedTitle = resolveUpdateTitle(current.title, input.content);
    const resolvedAuthorName = input.authorName ?? current.authorName;

    const revisionInsert: TablesInsert<"update_revisions"> = {
      update_id: input.id!,
      kind: "draft",
      title: resolvedTitle,
      author_name: resolvedAuthorName,
      content: input.content as Json,
      content_html: input.contentHtml,
      published_at: input.publishedAt?.toISOString() ?? null,
    };

    const { error } = await supabase
      .from("update_revisions")
      .insert(revisionInsert);

    if (error) {
      throw error;
    }

    if (resolvedAuthorName) {
      await supabase
        .from("updates")
        .update({ author_name: resolvedAuthorName })
        .eq("id", input.id!);
    }

    const refreshed = await getUpdateByIdForAdmin(input.id!);
    if (!refreshed) throw new Error(`Update not found after save: ${input.id!}`);
    return refreshed;
  }

  const resolvedTitle = resolveUpdateTitle(current?.title ?? null, input.content);
  const baseData: TablesInsert<"updates"> = {
    title: resolvedTitle,
    content: input.content as Json,
    content_html: input.contentHtml,
    published_at: input.publishedAt?.toISOString() ?? null,
    status: input.status,
  };

  if (current && input.id) {
    const { error } = await supabase
      .from("updates")
      .update({ ...baseData, author_name: input.authorName ?? current.authorName })
      .eq("id", input.id);

    if (error) {
      throw error;
    }

    await supabase.from("update_revisions").delete().eq("update_id", input.id).eq("kind", "draft");
  } else {
    const { data, error } = await supabase
      .from("updates")
      .insert({ ...baseData, author_name: input.authorName })
      .select("id")
      .single();

    if (error) {
      throw error;
    }
    input.id = data.id;
  }

  const refreshed = await getUpdateByIdForAdmin(input.id!);
  if (!refreshed) throw new Error(`Update not found after save: ${input.id}`);
  return refreshed;
}

export async function publishUpdateById(id: string): Promise<UpdateItem> {
  const supabase = await createServerClient();
  const current = await getUpdateByIdForAdmin(id);

  if (!current) {
    throw new Error(`Update not found: ${id}`);
  }

  const draftRevision = await getDraftRevision(id);
  const publishedAt = current.publishedAt ?? new Date().toISOString();
  const resolvedPublishedAt = draftRevision?.publishedAt ?? publishedAt;
  const resolvedAuthorName = draftRevision?.authorName ?? current.authorName;
  const resolvedTitle = draftRevision?.title ?? current.title;
  const resolvedContent = (draftRevision?.content ?? current.content) as Json;
  const resolvedContentHtml = draftRevision?.contentHtml ?? current.contentHtml;

  if (draftRevision) {
    const { error } = await supabase
      .from("updates")
      .update({
        title: resolvedTitle,
        content: resolvedContent,
        content_html: resolvedContentHtml,
        published_at: resolvedPublishedAt,
        author_name: resolvedAuthorName,
        status: CONTENT_STATUS.PUBLISHED,
      })
      .eq("id", id);

    if (error) {
      throw error;
    }

    await supabase.from("update_revisions").delete().eq("update_id", id).eq("kind", "draft");
  } else {
    const { error } = await supabase
      .from("updates")
      .update({
        title: resolvedTitle,
        content: resolvedContent,
        content_html: resolvedContentHtml,
        author_name: resolvedAuthorName,
        status: CONTENT_STATUS.PUBLISHED,
        published_at: resolvedPublishedAt,
      })
      .eq("id", id);

    if (error) {
      throw error;
    }
  }

  const { error: publishedRevisionError } = await supabase
    .from("update_revisions")
    .insert({
      update_id: id,
      kind: "published",
      title: resolvedTitle,
      author_name: resolvedAuthorName,
      content: resolvedContent,
      content_html: resolvedContentHtml,
      published_at: resolvedPublishedAt,
    });

  if (publishedRevisionError) {
    throw publishedRevisionError;
  }

  const refreshed = await getUpdateByIdForAdmin(id);
  if (!refreshed) throw new Error(`Update not found after publish: ${id}`);
  return refreshed;
}

export async function unpublishUpdateById(id: string): Promise<UpdateItem> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("updates")
    .update({
      status: CONTENT_STATUS.DRAFT,
      published_at: null,
    })
    .eq("id", id);

  if (error) {
    throw error;
  }

  const refreshed = await getUpdateByIdForAdmin(id);
  if (!refreshed) throw new Error(`Update not found after unpublish: ${id}`);
  return refreshed;
}

export async function deleteUpdateById(id: string): Promise<UpdateItem> {
  const update = await getUpdateByIdForAdmin(id);
  if (!update) {
    throw new Error(`Update not found: ${id}`);
  }

  const supabase = await createServerClient();
  const { error } = await supabase.from("updates").delete().eq("id", id);

  if (error) {
    throw error;
  }

  return update;
}

export async function discardUpdateRevisionById(id: string): Promise<UpdateItem> {
  const supabase = await createServerClient();
  const current = await getUpdateByIdForAdmin(id);

  if (!current) {
    throw new Error(`Update not found: ${id}`);
  }

  if (!current.hasDraftRevision) {
    throw new Error("这条动态没有可以删除的草稿。");
  }

  const publishedRevision = await getPublishedRevision(id);
  if (!publishedRevision) {
    const { error } = await supabase
      .from("updates")
      .update({ status: CONTENT_STATUS.PUBLISHED })
      .eq("id", id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("updates")
      .update({
        title: publishedRevision.title,
        content: publishedRevision.content as Json,
        content_html: publishedRevision.contentHtml,
        author_name: publishedRevision.authorName,
        published_at: publishedRevision.publishedAt ?? current.publishedAt,
        status: CONTENT_STATUS.PUBLISHED,
      })
      .eq("id", id);

    if (error) throw error;
  }

  await supabase.from("update_revisions").delete().eq("update_id", id).eq("kind", "draft");

  const refreshed = await getUpdateByIdForAdmin(id);
  if (!refreshed) throw new Error(`Update not found after discard: ${id}`);
  return refreshed;
}

async function getRevisionsForUpdates(updateIds: string[]) {
  if (updateIds.length === 0) return new Map<string, { hasDraft: boolean }>();

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("update_revisions")
    .select("update_id, kind")
    .in("update_id", updateIds);

  if (error) {
    return new Map<string, { hasDraft: boolean }>();
  }

  const map = new Map<string, { hasDraft: boolean }>();
  for (const rev of data ?? []) {
    const existing = map.get(rev.update_id) ?? { hasDraft: false };
    if (rev.kind === "draft") existing.hasDraft = true;
    map.set(rev.update_id, existing);
  }
  return map;
}

async function getDraftRevision(updateId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("update_revisions")
    .select("*")
    .eq("update_id", updateId)
    .eq("kind", "draft")
    .order("saved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    title: data.title,
    authorName: data.author_name,
    content: data.content,
    contentHtml: data.content_html,
    publishedAt: data.published_at,
  };
}

async function getPublishedRevision(updateId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("update_revisions")
    .select("*")
    .eq("update_id", updateId)
    .eq("kind", "published")
    .order("saved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    title: data.title,
    authorName: data.author_name,
    content: data.content,
    contentHtml: data.content_html,
    publishedAt: data.published_at,
  };
}

function mapUpdateRecord(
  update: Tables<"updates">,
  revisions: Map<string, { hasDraft: boolean }>,
): UpdateItem {
  const rev = revisions.get(update.id) ?? { hasDraft: false };
  return {
    id: update.id,
    title: update.title,
    authorName: update.author_name ?? siteConfig.author,
    status: update.status as ContentStatus,
    content: update.content,
    contentHtml: update.content_html,
    publishedAt: update.published_at ?? null,
    createdAt: update.created_at,
    updatedAt: update.updated_at,
    hasDraftRevision: rev.hasDraft,
  };
}

function resolveUpdateTitle(currentTitle: string | null, content: unknown) {
  const contentTitle = deriveTitleFromContent(content);
  if (contentTitle) return contentTitle;
  if (currentTitle) return currentTitle;
  return "未命名动态";
}

function deriveTitleFromContent(content: unknown) {
  if (!content) return null;
  const firstLine = getParagraphsFromContent(content)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return null;
  return truncateTitle(firstLine);
}

function truncateTitle(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= 24) return normalized;
  return `${normalized.slice(0, 24)}…`;
}

function getSafePage(value?: number) {
  if (!value || value < 1) return 1;
  return Math.floor(value);
}

function getSafePageSize(value?: number) {
  if (!value || value < 1) return 10;
  return Math.min(Math.floor(value), 100);
}
