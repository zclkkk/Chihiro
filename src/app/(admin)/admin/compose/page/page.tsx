import { AdminPageHeader, EmptyPanel } from "@/app/(admin)/admin/ui";

export default function AdminComposeStandalonePage() {
  return (
    <div className="grid gap-8">
      <AdminPageHeader eyebrow="Page" title="独立页面" />
      <EmptyPanel text="独立页面撰写页先作为占位，后续再接入完整表单。" />
    </div>
  );
}
