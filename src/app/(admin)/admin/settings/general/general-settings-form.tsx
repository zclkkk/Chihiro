"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { EmptyPanel } from "@/app/(admin)/admin/ui";
import {
  saveSettingsAction,
  type SettingsFormState,
} from "@/app/(admin)/admin/settings/actions";

const initialState: SettingsFormState = {
  error: null,
  success: false,
};

type GeneralSettingsFormProps = {
  defaults: {
    siteName: string;
    authorName: string;
    siteUrl: string;
    email: string;
    githubUrl: string;
    heroIntro: string;
    summary: string;
    motto: string;
  };
  siteUrlLocked: boolean;
};

export function GeneralSettingsForm({ defaults, siteUrlLocked }: GeneralSettingsFormProps) {
  const [state, formAction] = useActionState(saveSettingsAction, initialState);

  return (
    <form action={formAction} className="grid gap-6">
      <section className="grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
          <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
            站点名
          </span>
          <input
            name="siteName"
            type="text"
            required
            defaultValue={defaults.siteName}
            className="h-11 bg-transparent px-0 text-xl tracking-tight text-zinc-950 outline-none transition placeholder:text-zinc-300 focus:outline-none dark:text-zinc-50 dark:placeholder:text-zinc-600"
            placeholder="输入站点名称"
          />
        </label>

        <label className="grid gap-2 border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
          <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
            作者
          </span>
          <input
            name="authorName"
            type="text"
            required
            defaultValue={defaults.authorName}
            className="h-11 bg-transparent px-0 text-base text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:outline-none dark:text-zinc-200 dark:placeholder:text-zinc-600"
            placeholder="输入作者名称"
          />
        </label>

        <div className="md:col-span-2">
          <label className="grid gap-2 border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
              主站点地址 (Canonical URL)
            </span>
            <input
              name="siteUrl"
              type="url"
              required={!siteUrlLocked}
              readOnly={siteUrlLocked}
              defaultValue={defaults.siteUrl}
              className={`h-11 bg-transparent px-0 text-base outline-none transition placeholder:text-zinc-400 focus:outline-none dark:placeholder:text-zinc-600 ${
                siteUrlLocked
                  ? "cursor-not-allowed text-zinc-400 dark:text-zinc-500"
                  : "text-zinc-700 dark:text-zinc-200"
              }`}
              placeholder="https://example.com"
            />
            <span className="text-xs leading-6 text-zinc-500 dark:text-zinc-400">
              {siteUrlLocked
                ? "已由环境变量 NEXT_PUBLIC_SITE_URL 锁定；要修改请更新部署配置。"
                : "对外的权威域名，用于 SEO / RSS / sitemap / og:url。多域名部署请把其它域名在托管层 301 跳转到这里。"}
            </span>
          </label>
        </div>

        <div className="md:col-span-2">
          <label className="grid gap-2 border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
              首页介绍
            </span>
            <textarea
              name="heroIntro"
              rows={4}
              defaultValue={defaults.heroIntro}
              className="min-h-32 bg-transparent px-0 py-1 text-base leading-8 text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:outline-none dark:text-zinc-200 dark:placeholder:text-zinc-600"
              placeholder="在首页作者名下方展示的介绍段落"
            />
            <span className="text-xs leading-6 text-zinc-500 dark:text-zinc-400">
              支持换行形成多段；<code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.72rem] text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">{"{author}"}</code> 自动替换作者名；反引号包裹的内容（如 <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.72rem] text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">`&lt;Developer /&gt;`</code>）会以打字机动画原样显示；<code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.72rem] text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">**xxx**</code> 加斜体强调。
            </span>
          </label>
        </div>

        <div className="md:col-span-2">
          <label className="grid gap-2 border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
              首页摘要
            </span>
            <textarea
              name="summary"
              rows={3}
              defaultValue={defaults.summary}
              className="min-h-28 bg-transparent px-0 py-1 text-base leading-8 text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:outline-none dark:text-zinc-200 dark:placeholder:text-zinc-600"
              placeholder="在首页介绍下方的副文案"
            />
          </label>
        </div>

        <div className="md:col-span-2">
          <label className="grid gap-2 border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
              座右铭
            </span>
            <textarea
              name="motto"
              rows={4}
              defaultValue={defaults.motto}
              className="min-h-32 bg-transparent px-0 py-1 text-base leading-8 text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:outline-none dark:text-zinc-200 dark:placeholder:text-zinc-600"
              placeholder="写一句会出现在站点里的短句"
            />
          </label>
        </div>

        <label className="grid gap-2 border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
          <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
            邮箱
          </span>
          <input
            name="email"
            type="email"
            defaultValue={defaults.email}
            className="h-11 bg-transparent px-0 text-base text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:outline-none dark:text-zinc-200 dark:placeholder:text-zinc-600"
            placeholder="name@example.com"
          />
        </label>

        <label className="grid gap-2 border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
          <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
            GitHub
          </span>
          <input
            name="githubUrl"
            type="url"
            defaultValue={defaults.githubUrl}
            className="h-11 bg-transparent px-0 text-base text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:outline-none dark:text-zinc-200 dark:placeholder:text-zinc-600"
            placeholder="https://github.com/username"
          />
        </label>
      </section>

      <section className="grid gap-3">
        {state.error ? <EmptyPanel text={state.error} /> : null}
        {state.success ? (
          <div className="border border-emerald-200/80 bg-emerald-50/80 px-5 py-4 text-sm text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/20 dark:text-emerald-300">
            设置已保存。
          </div>
        ) : null}
        <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:border-zinc-800/70 dark:bg-zinc-950/75 supports-[backdrop-filter]:dark:bg-zinc-950/65">
          <div className="min-w-0 text-xs text-zinc-500 dark:text-zinc-400">
            保存后会同步更新公开站点和后台默认信息。
          </div>
          <SaveButton />
        </div>
      </section>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center border border-transparent bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
    >
      {pending ? "保存中..." : "保存设置"}
    </button>
  );
}
