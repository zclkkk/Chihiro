"use client";

import { useActionState, useMemo, useState } from "react";
import { type InstallActionState, initializeSiteAction } from "@/app/install/actions";

const initialState: InstallActionState = {
  error: null,
};

type InstallFormProps = {
  defaults: {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
    locale: string;
    authorName: string;
    authorAvatarUrl: string;
    heroIntro: string;
    summary: string;
    motto: string;
    email: string;
    githubUrl: string;
  };
  needsAdminSetup: boolean;
};

type SiteDefaults = InstallFormProps["defaults"];

export function InstallForm({ defaults, needsAdminSetup }: InstallFormProps) {
  const [state, formAction] = useActionState(initializeSiteAction, initialState);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [siteFields, setSiteFields] = useState<SiteDefaults>(defaults);
  const steps = useMemo(
    () => [
      {
        id: 1 as const,
        eyebrow: "Supabase",
        title: "确认 Supabase 状态",
        description: "这一阶段确认 Supabase 环境变量已配置，数据库连接就绪。",
      },
      {
        id: 2 as const,
        eyebrow: "Site",
        title: "填写站点信息",
        description: "这部分会写入 SiteSettings，作为后台和公开页面的正式运行时配置。",
      },
      {
        id: 3 as const,
        eyebrow: "Admin",
        title: needsAdminSetup ? "创建首个管理员" : "确认并完成初始化",
        description: needsAdminSetup
          ? "首个管理员使用 Supabase Auth 创建，通过邮箱和密码登录。"
          : "当前数据库已经有管理员帐号，这一步只负责确认并完成初始化。",
      },
    ],
    [needsAdminSetup],
  );

  const currentStep = steps.find((item) => item.id === step)!;
  const updateSiteField = (name: keyof SiteDefaults, value: string) => {
    setSiteFields((current) => ({
      ...current,
      [name]: value,
    }));
  };
  const siteFieldProps = (name: keyof SiteDefaults) => ({
    name,
    value: siteFields[name],
    onChange: (value: string) => updateSiteField(name, value),
  });

  return (
    <form action={formAction} className="grid gap-10">
      {step !== 2
        ? Object.entries(siteFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}

      <section className="grid gap-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {steps.map((item) => {
            const isActive = item.id === step;
            const isCompleted = item.id < step;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(item.id)}
                className={`grid gap-2 rounded-[1.5rem] border px-4 py-4 text-left transition ${
                  isActive
                    ? "border-zinc-950 bg-zinc-950 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                    : isCompleted
                      ? "border-zinc-200/80 bg-zinc-100/70 text-zinc-700 dark:border-zinc-800/80 dark:bg-zinc-900/70 dark:text-zinc-200"
                      : "border-zinc-200/80 bg-white/60 text-zinc-500 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-400"
                }`}
              >
                <span className="text-[0.68rem] font-medium uppercase tracking-[0.22em] opacity-70">
                  Step {item.id}
                </span>
                <span className="text-base font-semibold tracking-tight">{item.title}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-2">
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.26em] text-zinc-400 dark:text-zinc-500">
            {currentStep.eyebrow}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {currentStep.title}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-zinc-500 dark:text-zinc-400">
            {currentStep.description}
          </p>
        </div>
      </section>

      {step === 1 ? (
        <section className="grid gap-5 border-t border-zinc-200/80 pt-6 dark:border-zinc-800/80">
          <div className="grid gap-4 md:grid-cols-3">
            <StepInfoCard
              label="Supabase URL"
              value="已配置"
              description="NEXT_PUBLIC_SUPABASE_URL 环境变量已就绪。"
            />
            <StepInfoCard
              label="Supabase Key"
              value="已就绪"
              description="NEXT_PUBLIC_SUPABASE_ANON_KEY 环境变量已就绪。"
            />
            <StepInfoCard
              label="Install Marker"
              value="待写入"
              description="提交完成后会写入安装标记，之后公开页与后台都会按正式站点状态运行。"
            />
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="grid gap-5 border-t border-zinc-200/80 pt-6 dark:border-zinc-800/80">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="站点名称" {...siteFieldProps("siteName")} required />
            <Field label="作者名称" {...siteFieldProps("authorName")} required />
            <Field label="站点地址" {...siteFieldProps("siteUrl")} required />
            <Field label="语言" {...siteFieldProps("locale")} />
            <Field label="作者头像" {...siteFieldProps("authorAvatarUrl")} />
            <Field label="邮箱" {...siteFieldProps("email")} />
            <Field label="GitHub" {...siteFieldProps("githubUrl")} />
            <Field label="站点简介" {...siteFieldProps("siteDescription")} required />
          </div>

          <FieldArea label="首页介绍" {...siteFieldProps("heroIntro")} />
          <FieldArea label="首页摘要" {...siteFieldProps("summary")} />
          <FieldArea label="站点格言" {...siteFieldProps("motto")} />
        </section>
      ) : null}

      {step === 3 ? (
        <section className="grid gap-5 border-t border-zinc-200/80 pt-6 dark:border-zinc-800/80">
          {needsAdminSetup ? (
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="管理员邮箱" name="email" type="email" required placeholder="admin@example.com" />
              <Field label="管理员密码" name="password" type="password" required placeholder="至少 8 位" />
              <Field label="确认密码" name="confirmPassword" type="password" required placeholder="再次输入密码" />
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-zinc-200/80 bg-zinc-50/80 px-5 py-4 text-sm leading-7 text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:text-zinc-300">
              当前数据库里已经存在管理员帐号，这次安装不会重复创建管理员，只会更新站点信息并直接进入后台。
            </div>
          )}
        </section>
      ) : null}

      {state.error ? (
        <p className="rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 border-t border-zinc-200/80 pt-6 dark:border-zinc-800/80">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((current) => (current === 1 ? current : ((current - 1) as 1 | 2 | 3)))}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white px-5 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:text-zinc-50"
          >
            上一步
          </button>
        ) : null}
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((current) => (current === 3 ? current : ((current + 1) as 1 | 2 | 3)))}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            下一步
          </button>
        ) : (
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            完成初始化
          </button>
        )}
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {step < 3
            ? "确认无误后继续下一步。"
            : "提交后会写入站点信息，并在需要时创建首个管理员。"}
        </p>
      </div>
    </form>
  );
}

function StepInfoCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-zinc-200/80 bg-zinc-50/80 px-5 py-4 dark:border-zinc-800/80 dark:bg-zinc-900/60">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {value}
      </p>
      <p className="mt-2 text-sm leading-7 text-zinc-500 dark:text-zinc-400">{description}</p>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-2xl border border-zinc-200/80 bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-primary/40 dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:text-zinc-100 dark:placeholder:text-zinc-500"
      />
    </label>
  );
}

function FieldArea({
  label,
  name,
  defaultValue,
  value,
  onChange,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{label}</span>
      <textarea
        name={name}
        rows={4}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="min-h-28 rounded-[1.5rem] border border-zinc-200/80 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-primary/40 dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:text-zinc-100 dark:placeholder:text-zinc-500"
      />
    </label>
  );
}
