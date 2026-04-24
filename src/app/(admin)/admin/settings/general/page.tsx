import Link from "next/link";
import { isSiteUrlLockedByEnv, resolveCanonicalSiteUrl, siteConfig } from "@/lib/site";
import { AdminPageHeader } from "@/app/(admin)/admin/ui";
import { GeneralSettingsForm } from "@/app/(admin)/admin/settings/general/general-settings-form";
import { getSiteSettings } from "@/server/supabase/site";

export default async function AdminGeneralSettingsPage() {
  const siteSettings = await getSiteSettings();
  const siteUrlLocked = isSiteUrlLockedByEnv();
  const defaults = {
    siteName: siteSettings?.siteName ?? siteConfig.name,
    authorName: siteSettings?.authorName ?? siteConfig.author,
    siteUrl: resolveCanonicalSiteUrl(siteSettings),
    email: siteSettings?.email ?? siteConfig.email,
    githubUrl: siteSettings?.githubUrl ?? siteConfig.github,
    heroIntro: siteSettings?.heroIntro ?? siteConfig.heroIntro,
    summary: siteSettings?.summary ?? siteConfig.summary,
    motto: siteSettings?.motto ?? siteConfig.motto,
  };

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <Link
          href="/admin/settings"
          className="inline-flex w-fit items-center text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          返回设置
        </Link>
        <AdminPageHeader eyebrow="Settings" title="设置" />
      </div>
      <GeneralSettingsForm defaults={defaults} siteUrlLocked={siteUrlLocked} />
    </div>
  );
}
