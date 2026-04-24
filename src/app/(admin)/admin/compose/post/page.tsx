import { AdminPageHeader } from "@/app/(admin)/admin/ui";
import { PostEditorForm } from "@/app/(admin)/admin/compose/post/post-editor-form";
import { resolveCanonicalSiteUrl, siteConfig } from "@/lib/site";
import { listPostCategories } from "@/server/supabase/categories";
import { getPostByIdForAdmin } from "@/server/supabase/posts";
import { getSiteSettings } from "@/server/supabase/site";
import { listTags } from "@/server/supabase/tags";

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
  const postId = id || null;
  const [post, categories, tags, siteSettings] = await Promise.all([
    postId ? getPostByIdForAdmin(postId) : Promise.resolve(null),
    listPostCategories(),
    listTags(),
    getSiteSettings(),
  ]);
  const siteUrlBase = resolveCanonicalSiteUrl(siteSettings);

  return (
    <div className="grid gap-8">
      <AdminPageHeader eyebrow="Post" title={post ? "编辑文章" : "撰写新文章"} />

      <PostEditorForm
        key={post ? `${post.id}:${post.updatedAt}` : "new-post"}
        post={post}
        categories={categories}
        tags={tags}
        siteUrlBase={siteUrlBase}
        authorName={siteSettings?.authorName ?? siteConfig.author}
      />
    </div>
  );
}
