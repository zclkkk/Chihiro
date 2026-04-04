import { CategoryKind } from "@prisma/client";
import { AdminPageHeader } from "@/app/(admin)/admin/ui";
import { UpdateEditorForm } from "@/app/(admin)/admin/compose/update/update-editor-form";
import { siteConfig } from "@/lib/site";
import { listCategoriesByKind } from "@/server/repositories/categories";
import { getUpdateByIdForAdmin } from "@/server/repositories/updates";
import { getSiteSettings } from "@/server/repositories/site";
import { listTags } from "@/server/repositories/tags";

type AdminComposeUpdatePageProps = {
  searchParams: Promise<{
    id?: string;
  }>;
};

export default async function AdminComposeUpdatePage({
  searchParams,
}: AdminComposeUpdatePageProps) {
  const { id } = await searchParams;
  const updateId = getUpdateId(id);
  const [update, categories, tags, siteSettings] = await Promise.all([
    updateId ? getUpdateByIdForAdmin(updateId) : Promise.resolve(null),
    listCategoriesByKind(CategoryKind.UPDATE),
    listTags(),
    getSiteSettings(),
  ]);
  const siteUrlBase = (siteSettings?.siteUrl ?? siteConfig.url).replace(/\/+$/, "");

  return (
    <div className="grid gap-8">
      <AdminPageHeader eyebrow="Update" title={update ? "编辑动态" : "撰写新动态"} />

      <UpdateEditorForm
        key={update ? `${update.id}:${update.draftSnapshot?.savedAt ?? update.updatedAt}` : "new-update"}
        update={update}
        categories={categories}
        tags={tags}
        siteUrlBase={siteUrlBase}
      />
    </div>
  );
}

function getUpdateId(value?: string) {
  if (!value) {
    return null;
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  return Number(value);
}
