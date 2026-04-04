import { AdminPageHeader } from "@/app/(admin)/admin/ui";
import { CategoryEditorForm } from "@/app/(admin)/admin/categories/[id]/category-editor-form";
import { CategoryKind } from "@prisma/client";

export default function AdminCategoryNewPage() {
  return (
    <div className="grid gap-8">
      <AdminPageHeader eyebrow="Category" title="添加分类" />
      <CategoryEditorForm defaultKind={CategoryKind.POST} />
    </div>
  );
}
