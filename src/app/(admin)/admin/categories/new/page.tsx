import { AdminPageHeader } from "@/app/(admin)/admin/ui";
import { CategoryEditorForm } from "@/app/(admin)/admin/categories/[id]/category-editor-form";

export default function AdminCategoryNewPage() {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8">
      <AdminPageHeader eyebrow="Category" title="添加分类" />
      <CategoryEditorForm />
    </div>
  );
}
