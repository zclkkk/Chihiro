import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/app/(admin)/admin/ui";
import { getTagByIdForAdmin } from "@/server/supabase/tags";
import { TagEditorForm } from "@/app/(admin)/admin/tags/[id]/tag-editor-form";

type AdminTagPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminTagPage({ params }: AdminTagPageProps) {
  const { id } = await params;
  const tag = await getTagByIdForAdmin(id);

  if (!tag) {
    notFound();
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8">
      <AdminPageHeader eyebrow="Tag" title="编辑标签" />
      <TagEditorForm tag={tag} />
    </div>
  );
}
