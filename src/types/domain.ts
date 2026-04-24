export type ContentStatus = "draft" | "published" | "archived";

export type AssetKind = "image" | "video" | "file";

export const CONTENT_STATUS = {
  DRAFT: "draft" as ContentStatus,
  PUBLISHED: "published" as ContentStatus,
  ARCHIVED: "archived" as ContentStatus,
};

export const ASSET_KIND = {
  IMAGE: "image" as AssetKind,
  VIDEO: "video" as AssetKind,
  FILE: "file" as AssetKind,
};

export type SiteSettingsRecord = {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  locale: string;
  authorName: string;
  authorAvatarUrl: string | null;
  heroIntro: string | null;
  summary: string | null;
  motto: string | null;
  email: string | null;
  githubUrl: string | null;
};

export type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  contentCount: number;
};

export type TagOption = {
  id: string;
  name: string;
  slug: string;
};

export type TagItem = TagOption & {
  createdAt: string;
  updatedAt: string;
  postCount: number;
  contentCount: number;
};

export type AssetItem = {
  id: string;
  kind: AssetKind;
  storagePath: string;
  bucket: string | null;
  alt: string | null;
  mimeType: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  createdAt: string;
  updatedAt: string;
};

export type PostItem = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  status: ContentStatus;
  content: unknown;
  contentHtml: string | null;
  authorName: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  hasDraftRevision: boolean;
  hasPublishedRevision: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  coverAsset: {
    id: string;
    alt: string | null;
    mimeType: string | null;
    width: number | null;
    height: number | null;
  } | null;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

export type UpdateItem = {
  id: string;
  title: string;
  authorName: string;
  status: ContentStatus;
  content: unknown;
  contentHtml: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  hasDraftRevision: boolean;
};

export type PostRevision = {
  id: string;
  postId: string;
  kind: "draft" | "published";
  title: string;
  slug: string;
  summary: string | null;
  content: unknown;
  contentHtml: string | null;
  authorName: string | null;
  publishedAt: string | null;
  categoryId: string | null;
  coverAssetId: string | null;
  tagsSnapshot: unknown;
  savedAt: string;
};

export type UpdateRevision = {
  id: string;
  updateId: string;
  kind: "draft" | "published";
  title: string;
  authorName: string | null;
  content: unknown;
  contentHtml: string | null;
  publishedAt: string | null;
  savedAt: string;
};

export type PostListResult = {
  items: PostItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type UpdateListResult = {
  items: UpdateItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type PostListSort = "latest" | "earliest" | "updated";
export type UpdateListSort = "latest" | "earliest" | "updated";

export type PostNavigationItem = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export type PostNavigationCategory = {
  slug: string;
  label: string;
  contentCount: number;
  posts: Array<{
    id: string;
    title: string;
    slug: string;
  }>;
};

export type UpdateNavigationItem = {
  id: string;
  title: string;
  authorName: string;
  publishedAt: string | null;
};
