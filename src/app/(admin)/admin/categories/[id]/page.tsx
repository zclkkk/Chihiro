import { notFound } from "next/navigation";
import { CategoryEditorForm } from "@/app/(admin)/admin/categories/[id]/category-editor-form";
import { AdminPageHeader } from "@/app/(admin)/admin/ui";
import { getCategoryByIdForAdmin } from "@/server/supabase/categories";

type AdminCategoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminCategoryPage({ params }: AdminCategoryPageProps) {
  const { id } = await params;

  const category = await getCategoryByIdForAdmin(id);

  if (!category) {
    notFound();
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8">
      <AdminPageHeader eyebrow="Category" title="编辑分类" />
      <CategoryEditorForm category={category} />
    </div>
  );
}
