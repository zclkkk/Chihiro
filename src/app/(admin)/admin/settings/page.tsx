import { AdminSectionCard, EmptyPanel } from "@/app/(admin)/admin/ui";
import { getSiteSettings } from "@/server/repositories/site";

export default async function AdminSettingsPage() {
  const siteSettings = await getSiteSettings();

  return (
    <div className="grid gap-8">
      <AdminSectionCard title="站点信息" eyebrow="Site">
        {siteSettings ? (
          <div className="grid gap-4 md:grid-cols-2">
            <SettingItem label="站点名" value={siteSettings.siteName} />
            <SettingItem label="作者" value={siteSettings.authorName} />
            <SettingItem label="站点地址" value={siteSettings.siteUrl} />
            <SettingItem label="语言" value={siteSettings.locale} />
            <SettingItem label="邮箱" value={siteSettings.email ?? "Not set"} />
            <SettingItem label="GitHub" value={siteSettings.githubUrl ?? "Not set"} />
          </div>
        ) : (
          <EmptyPanel text="数据库里还没有 SiteSettings 记录。" />
        )}
      </AdminSectionCard>
    </div>
  );
}

function SettingItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-zinc-200/80 pb-4 last:border-b-0 dark:border-zinc-800/80">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <p className="mt-3 break-all text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
    </div>
  );
}
