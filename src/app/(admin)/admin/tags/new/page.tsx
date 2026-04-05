import { AdminPageHeader } from "@/app/(admin)/admin/ui";
import { TagEditorForm } from "@/app/(admin)/admin/tags/[id]/tag-editor-form";

export default function AdminTagNewPage() {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8">
      <AdminPageHeader eyebrow="Tag" title="添加标签" />
      <TagEditorForm />
    </div>
  );
}
