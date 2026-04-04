import { notFound } from "next/navigation";
import { CategoryEditorForm } from "@/app/(admin)/admin/categories/[id]/category-editor-form";
import { AdminPageHeader } from "@/app/(admin)/admin/ui";
import { getCategoryByIdForAdmin } from "@/server/repositories/categories";

type AdminCategoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminCategoryPage({ params }: AdminCategoryPageProps) {
  const { id } = await params;
  const categoryId = Number(id);

  if (!Number.isInteger(categoryId)) {
    notFound();
  }

  const category = await getCategoryByIdForAdmin(categoryId);

  if (!category) {
    notFound();
  }

  return (
    <div className="grid gap-8">
      <AdminPageHeader eyebrow="Category" title="编辑分类" />
      <CategoryEditorForm category={category} />
    </div>
  );
}
