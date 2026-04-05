import { AdminPageHeader } from "@/app/(admin)/admin/ui";
import { PostEditorForm } from "@/app/(admin)/admin/compose/post/post-editor-form";
import { siteConfig } from "@/lib/site";
import { listPostCategories } from "@/server/repositories/categories";
import { getPostByIdForAdmin } from "@/server/repositories/posts";
import { getSiteSettings } from "@/server/repositories/site";
import { listTags } from "@/server/repositories/tags";

type AdminComposePostPageProps = {
  searchParams: Promise<{
    id?: string;
    saved?: string;
  }>;
};

export default async function AdminComposePostPage({
  searchParams,
}: AdminComposePostPageProps) {
  const { id } = await searchParams;
  const postId = getPostId(id);
  const [post, categories, tags, siteSettings] = await Promise.all([
    postId ? getPostByIdForAdmin(postId) : Promise.resolve(null),
    listPostCategories(),
    listTags(),
    getSiteSettings(),
  ]);
  const siteUrlBase = (siteSettings?.siteUrl ?? siteConfig.url).replace(/\/+$/, "");

  return (
    <div className="grid gap-8">
      <AdminPageHeader eyebrow="Post" title={post ? "编辑文章" : "撰写新文章"} />

      <PostEditorForm
        key={post ? `${post.id}:${post.draftSnapshot?.savedAt ?? post.updatedAt}` : "new-post"}
        post={post}
        categories={categories}
        tags={tags}
        siteUrlBase={siteUrlBase}
        authorName={siteSettings?.authorName ?? siteConfig.author}
      />
    </div>
  );
}

function getPostId(value?: string) {
  if (!value) {
    return null;
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  return Number(value);
}
