import { AdminPageHeader } from "@/app/(admin)/admin/ui";
import { UpdateEditorForm } from "@/app/(admin)/admin/compose/update/update-editor-form";
import { getUpdateByIdForAdmin } from "@/server/repositories/updates";
import { getSiteSettings } from "@/server/repositories/site";
import { siteConfig } from "@/lib/site";

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
  const [update, siteSettings] = await Promise.all([
    updateId ? getUpdateByIdForAdmin(updateId) : Promise.resolve(null),
    getSiteSettings(),
  ]);

  return (
    <div className="grid gap-8">
      <AdminPageHeader eyebrow="Update" title={update ? "编辑动态" : "撰写新动态"} />

      <UpdateEditorForm
        key={update ? `${update.id}:${update.draftSnapshot?.savedAt ?? update.updatedAt}` : "new-update"}
        update={update}
        authorName={siteSettings?.authorName ?? siteConfig.author}
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
