# Chihiro 全量原生 Supabase 迁移计划

把 Chihiro 改造为「Prisma + Supabase Postgres + Supabase Auth（email + password）+ 原生 Supabase Storage + RLS 强制开」的执行级运行手册。

**前提**：数据库 / Storage / Auth 全部从零 init，不保留任何旧数据，不做向前兼容。手册里没有数据迁移、双写、回滚到旧库的章节。

## 终点架构

- **数据库**：Supabase Postgres，运行时走 Supavisor session pooler，`prisma migrate` 走 Direct
- **ORM**：Prisma 7 + `@prisma/adapter-pg`，`postgres` 角色默认 `BYPASSRLS`
- **鉴权**：Supabase Auth，仅 email + password；admin 标识用 JWT `app_metadata.role = "admin"`
- **存储**：Supabase Storage 原生 SDK（`@supabase/supabase-js`），单 bucket `content`
- **RLS**：所有业务表 RLS=on，公开内容 anon SELECT，写入永远走 Prisma → service role
- **不存在的表**：`AdminUser` / `AdminSession` / `ObjectStorageSettings`（连 migration 历史里都不会出现）

## 不变量

执行顺序 Phase 0 → 1 → 2 → 3 → 4 → 5。每个 Phase 完成后项目都能编译运行。

- `prisma/schema.prisma` 是 schema 单一来源
- `prisma/migrations/` 只保留新生成的迁移，旧 6 个版本一律删除
- 浏览器只用 anon key 维护 auth 状态，**不直连数据库**
- Server-side 只用 Prisma 写库；只用 service role client 调 `auth.admin.*` 与 `storage.*`

## 命名约定

固定 8 个环境变量名，所有阶段引用以下名称：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon key>"
SUPABASE_SERVICE_ROLE_KEY="<service role key>"

# Postgres
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"

# Storage
SUPABASE_STORAGE_BUCKET="content"
SUPABASE_STORAGE_PUBLIC_BASE_URL="https://<ref>.supabase.co/storage/v1/object/public/content"

# Tuning
DATABASE_POOL_MAX=5
```

## Phase 0：前置准备

### 0.1 创建 Supabase 项目

Supabase Dashboard：

1. New project → 选距离应用部署最近的 region
2. 设置并妥善保存 DB Password
3. 等待项目就绪

### 0.2 收集所有连接串与密钥

- `Settings → API`：`URL`、`anon public key`、`service_role secret key`
- `Settings → Database → Connection string`：分别复制 **Session pooler (5432)** 与 **Direct connection (5432)**

### 0.3 安装新依赖

```bash
npm i @supabase/supabase-js @supabase/ssr
```

### 0.4 创建 `.env.example`

新建文件 `.env.example`：

```bash
# 复制为 .env 后填入真实值

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

DATABASE_URL=
DIRECT_URL=

SUPABASE_STORAGE_BUCKET=content
SUPABASE_STORAGE_PUBLIC_BASE_URL=

DATABASE_POOL_MAX=5
```

把对应真实值同步写到本地 `.env` 与部署平台 Secret。

### 0.5 Phase 0 验收

- [ ] `.env` 含上面 8 个变量
- [ ] `npm i` 完成无错误

## Phase 1：重建 Schema 与 RLS

> 这一步彻底丢弃旧 6 个 migration，写出最终态 schema，在新 Supabase 项目上用单个 init migration 落地，包含 RLS。

### 1.1 删除旧 migrations

```bash
Remove-Item -Recurse -Force prisma\migrations
```

### 1.2 重写 `prisma/schema.prisma`

整文件替换为：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum ContentStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum CategoryKind {
  POST
  UPDATE
}

enum AssetKind {
  IMAGE
  VIDEO
  FILE
}

enum AssetProvider {
  SUPABASE
  LOCAL
}

model Post {
  id                Int           @id @default(autoincrement())
  title             String
  slug              String        @unique
  summary           String?
  status            ContentStatus @default(DRAFT)
  content           Json?
  contentHtml       String?
  authorId          String?       @db.Uuid
  authorName        String?
  publishedAt       DateTime?
  publishedSnapshot Json?
  draftSnapshot     Json?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  categoryId        Int?
  coverAssetId      String?
  category          Category?     @relation("PostCategory", fields: [categoryId], references: [id], onDelete: SetNull)
  coverAsset        Asset?        @relation("PostCoverAsset", fields: [coverAssetId], references: [id], onDelete: SetNull)
  tags              PostTag[]

  @@index([status, publishedAt])
  @@index([categoryId])
  @@index([authorId])
}

model Update {
  id            Int           @id @default(autoincrement())
  title         String
  authorId      String?       @db.Uuid
  authorName    String?
  status        ContentStatus @default(DRAFT)
  content       Json?
  contentHtml   String?
  publishedAt   DateTime?
  draftSnapshot Json?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([status, publishedAt])
  @@index([authorId])
}

model Asset {
  id           String        @id @default(cuid())
  provider     AssetProvider
  kind         AssetKind
  storageKey   String        @unique
  bucket       String?
  url          String
  alt          String?
  mimeType     String?
  size         Int?
  width        Int?
  height       Int?
  duration     Int?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  postCovers   Post[]        @relation("PostCoverAsset")
}

model Category {
  id          Int          @id @default(autoincrement())
  kind        CategoryKind
  name        String
  slug        String
  description String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  posts       Post[]       @relation("PostCategory")

  @@unique([kind, slug])
  @@index([kind, name])
}

model Tag {
  id        String      @id @default(cuid())
  name      String
  slug      String      @unique
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  posts     PostTag[]
}

model PostTag {
  postId     Int
  tagId      String
  assignedAt DateTime @default(now())
  post       Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag        Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@index([tagId])
}

model SiteSettings {
  id              String   @id @default("default")
  siteName        String
  siteDescription String
  siteUrl         String
  locale          String   @default("zh-CN")
  authorName      String
  authorAvatarUrl String?
  heroIntro       String?
  summary         String?
  motto           String?
  email           String?
  githubUrl       String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 1.3 收紧 `src/server/db/client.ts`

把 `Pool` 实例化部分替换为：

```ts
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    keepAlive: true,
  });
```

### 1.4 生成单个 init migration

```bash
npx prisma migrate dev --name init --create-only
```

预期：`prisma/migrations/<ts>_init/migration.sql` 被生成，里面包含 8 个 `CREATE TABLE` 与 4 个 `CREATE TYPE` 语句。

### 1.5 把 RLS 追加到 init migration

打开 `prisma/migrations/<ts>_init/migration.sql`，在文件末尾追加：

```sql
-- Row Level Security baseline
ALTER TABLE "Post" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Update" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PostTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SiteSettings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_public_read" ON "Post"
  FOR SELECT TO anon, authenticated USING (status = 'PUBLISHED');
CREATE POLICY "update_public_read" ON "Update"
  FOR SELECT TO anon, authenticated USING (status = 'PUBLISHED');
CREATE POLICY "category_public_read" ON "Category"
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "tag_public_read" ON "Tag"
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "post_tag_public_read" ON "PostTag"
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "asset_public_read" ON "Asset"
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "site_settings_public_read" ON "SiteSettings"
  FOR SELECT TO anon, authenticated USING (true);
```

### 1.6 在 Supabase 上落库

```bash
npx prisma generate
npx prisma migrate deploy
```

### 1.7 Phase 1 验收

- [ ] `prisma/migrations/` 目录里只有一个 `<ts>_init` 子目录
- [ ] Supabase Dashboard → Table Editor 看到 7 张业务表 + Prisma 自管的 `_prisma_migrations`
- [ ] 所有 7 张业务表 RLS = ON
- [ ] `npm run dev` 启动无错（公开页此刻读不到任何数据是正常的，Phase 3 完成后会被 install 写入）

## Phase 2：Supabase 客户端基建

> 仅新增 3 个工厂文件，不修改任何已有代码。

### 2.1 新建 `src/lib/supabase/browser.ts`

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

### 2.2 新建 `src/server/supabase/server.ts`

```ts
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(items) {
          for (const { name, value, options } of items) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );
}
```

### 2.3 新建 `src/server/supabase/admin.ts`

```ts
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function createSupabaseAdminClient() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role 配置缺失。");
  }
  cached = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cached;
}
```

### 2.4 Phase 2 验收

- [ ] `npx tsc --noEmit` 通过
- [ ] 三个文件仅被自身导出，没有任何反向 import

## Phase 3：Auth 切换到 Supabase Auth

> Auth 用 email + password。直接替换全部相关文件，不保留任何旧 cookie session 路径。

### 3.1 重写 `middleware.ts`

整文件替换为：

```ts
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(items) {
          for (const { name, value, options } of items) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user || user.app_metadata?.role !== "admin") {
      const target = new URL("/", request.url);
      target.searchParams.set("admin-login", "1");
      target.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(target);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
```

### 3.2 重写 `src/server/auth.ts`

整文件替换为：

```ts
import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

type AdminSignInResult =
  | { ok: true }
  | { ok: false; error: string };

export async function getCurrentAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && user.app_metadata?.role === "admin" ? user : null;
}

export async function isAdminAuthenticated() {
  return Boolean(await getCurrentAdmin());
}

export async function hasAdminUsers() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 50 });
  if (error) return false;
  return data.users.some((user) => user.app_metadata?.role === "admin");
}

export async function signInAdmin(email: string, password: string): Promise<AdminSignInResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data.user) {
    return { ok: false, error: "邮箱或密码不正确。" };
  }

  if (data.user.app_metadata?.role !== "admin") {
    await supabase.auth.signOut();
    return { ok: false, error: "该帐号没有管理员权限。" };
  }

  return { ok: true };
}

export async function clearAdminSession() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

export async function requireAdminSession(nextPath = "/admin") {
  const admin = await getCurrentAdmin();
  if (!admin) {
    const params = new URLSearchParams();
    params.set("admin-login", "1");
    params.set("next", nextPath.startsWith("/admin") ? nextPath : "/admin");
    redirect(`/?${params.toString()}`);
  }
}
```

### 3.3 重写 `src/server/installation.ts`

整文件替换为：

```ts
import "server-only";

import { hasDatabaseUrl } from "@/server/db/client";
import {
  isDatabaseSchemaMissingError,
  isDatabaseUnavailableError,
} from "@/server/database-errors";
import { hasAdminUsers } from "@/server/auth";
import { getSiteSettings } from "@/server/repositories/site";

export type InstallationStatus =
  | "missing_database"
  | "database_unavailable"
  | "schema_missing"
  | "ready";

export type InstallationState = {
  installed: boolean;
  status: InstallationStatus;
  hasAdminUser: boolean;
  hasSiteSettings: boolean;
};

export async function getInstallationState(): Promise<InstallationState> {
  if (!hasDatabaseUrl()) {
    return {
      installed: false,
      status: "missing_database",
      hasAdminUser: false,
      hasSiteSettings: false,
    };
  }

  try {
    const [hasAdmin, siteSettings] = await Promise.all([
      hasAdminUsers(),
      getSiteSettings(),
    ]);
    const hasSiteSettings = Boolean(siteSettings);

    return {
      installed: hasAdmin && hasSiteSettings,
      status: "ready",
      hasAdminUser: hasAdmin,
      hasSiteSettings,
    };
  } catch (error) {
    if (isDatabaseSchemaMissingError(error)) {
      return {
        installed: false,
        status: "schema_missing",
        hasAdminUser: false,
        hasSiteSettings: false,
      };
    }

    if (isDatabaseUnavailableError(error)) {
      return {
        installed: false,
        status: "database_unavailable",
        hasAdminUser: false,
        hasSiteSettings: false,
      };
    }

    throw error;
  }
}

export function isInstallationComplete(state: InstallationState) {
  return state.installed;
}
```

### 3.4 重写 `src/app/install/actions.ts`

整文件替换为：

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { siteConfig } from "@/lib/site";
import { isDatabaseUnavailableError } from "@/server/database-errors";
import { getInstallationState } from "@/server/installation";
import { upsertSiteSettings } from "@/server/repositories/site";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";

const MIN_ADMIN_PASSWORD_LENGTH = 8;

export type InstallActionState = {
  error: string | null;
};

export async function initializeSiteAction(
  _previousState: InstallActionState,
  formData: FormData,
): Promise<InstallActionState> {
  const installationState = await getInstallationState();

  if (installationState.status !== "ready") {
    return { error: stateErrorMessage(installationState.status) };
  }

  const siteName = getRequiredString(formData, "siteName");
  const siteDescription = getRequiredString(formData, "siteDescription");
  const siteUrl = getValidatedUrl(getRequiredString(formData, "siteUrl"));
  const locale = getOptionalString(formData, "locale") || siteConfig.locale;
  const authorName = getRequiredString(formData, "authorName");
  const authorAvatarUrl = getOptionalImageSource(formData, "authorAvatarUrl");
  const heroIntro = getOptionalString(formData, "heroIntro");
  const summary = getOptionalString(formData, "summary");
  const motto = getOptionalString(formData, "motto");
  const email = getOptionalString(formData, "email");
  const githubUrl = getOptionalUrl(formData, "githubUrl");

  if (!siteName) return { error: "请填写站点名称。" };
  if (!authorName) return { error: "请填写作者名称。" };
  if (!siteDescription) return { error: "请填写站点简介。" };
  if (!siteUrl) return { error: "请填写有效的站点地址。" };

  try {
    if (!installationState.hasAdminUser) {
      const adminEmail = normalizeEmail(getRequiredString(formData, "adminEmail"));
      const adminPassword = getRequiredString(formData, "adminPassword");

      if (!adminEmail) {
        return { error: "请填写有效的管理员邮箱。" };
      }
      if (adminPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
        return { error: `管理员密码至少需要 ${MIN_ADMIN_PASSWORD_LENGTH} 个字符。` };
      }

      const supabaseAdmin = createSupabaseAdminClient();
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        app_metadata: { role: "admin" },
        user_metadata: { display_name: authorName },
      });
      if (createError) {
        return { error: createError.message };
      }

      const supabase = await createSupabaseServerClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });
      if (signInError) {
        return { error: signInError.message };
      }
    }

    await upsertSiteSettings({
      siteName,
      siteDescription,
      siteUrl,
      locale,
      authorName,
      authorAvatarUrl,
      heroIntro,
      summary,
      motto,
      email,
      githubUrl,
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return { error: "数据库当前不可用，请先恢复数据库后再初始化。" };
    }
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/posts");
  revalidatePath("/updates");
  revalidatePath("/timeline");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
  redirect("/admin");
}

function stateErrorMessage(status: Exclude<InstallActionState, "ready"> | string) {
  if (status === "missing_database") return "还没有配置 DATABASE_URL，请先把数据库连接串写入环境变量。";
  if (status === "database_unavailable") return "数据库当前不可用，请先检查连接状态。";
  if (status === "schema_missing") return "数据库表结构还没有初始化，请先运行 npx prisma migrate deploy。";
  return "无法继续初始化。";
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) return "";
  return value.trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function getValidatedUrl(value: string) {
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function getOptionalUrl(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString().replace(/\/$/, "");
    }
    return null;
  } catch {
    return null;
  }
}

function getOptionalImageSource(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString().replace(/\/$/, "");
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeEmail(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "";
  return trimmed;
}
```

### 3.5 改 `src/app/install/install-form.tsx`

只改 Step 3 中两个 `Field`：

```tsx
<Field label="管理员邮箱" name="adminEmail" type="email" required />
<Field label="管理员密码" name="adminPassword" type="password" required />
```

删掉 `defaultValue="admin"` 与原 `name="adminUsername"` 字段。

### 3.6 改 `src/app/(admin)/admin/login/actions.ts`

整文件替换为：

```ts
"use server";

import { redirect } from "next/navigation";
import { clearAdminSession, signInAdmin } from "@/server/auth";

export type AdminLoginState = {
  error: string | null;
};

export async function loginAction(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const email = getRequiredString(formData, "email");
  const password = getRequiredString(formData, "password");
  const next = getOptionalString(formData, "next");
  const result = await signInAdmin(email, password);

  if (!result.ok) {
    return { error: result.error };
  }

  redirect(next && next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/");
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) return "";
  return value.trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}
```

同步把页面 / 表单里 `name="username"` 改为 `name="email"`，`type="email"`，placeholder / label 文案改成「管理员邮箱」。

### 3.7 把 `authorId` 注入文章 / 动态写入

修改 `src/server/repositories/posts.ts`：

- `SavePostDraftInput` 类型加 `authorId: string | null`
- `PostItem` / `PublishedPostSnapshot` / `DraftPostSnapshot` 类型都加 `authorId: string | null`
- `baseData` 中加 `authorId: input.authorId`
- `mapPostRecord` / `mapPublishedPostRecord` / `buildPublishedSnapshot` / `buildDraftSnapshot` 全部传递 `authorId`
- `parsePublishedSnapshot` / `parseDraftSnapshot` 加 `authorId: snapshot.authorId ?? null`

`src/server/repositories/updates.ts` 做同样的字段扩展。

修改 `src/app/(admin)/admin/compose/post/actions.ts`：

```ts
import { getCurrentAdmin } from "@/server/auth";

// 在 savePostDraftAction 内部
const admin = await getCurrentAdmin();
if (!admin) redirect("/?admin-login=1");
const siteSettings = await getSiteSettings();
const authorId = admin.id;
const authorName =
  (admin.user_metadata?.display_name as string | undefined) ??
  siteSettings?.authorName ??
  admin.email ??
  siteConfig.author;

await savePostDraft({
  // ...原参数...
  authorId,
  authorName,
});
```

`src/app/(admin)/admin/compose/update/actions.ts` 做同样修改。

### 3.8 删除遗留文件

```bash
Remove-Item -Force src\server\passwords.ts
Remove-Item -Force src\server\repositories\admin-auth.ts
Remove-Item -Force src\lib\admin-auth.ts
```

> 这三个文件分别承载 scrypt、AdminUser/AdminSession 仓库、cookie 常量，迁移后已无任何引用。

### 3.9 Phase 3 验收

- [ ] `npm run build` 与 `npx tsc --noEmit` 通过
- [ ] `grep -r "AdminUser\|AdminSession\|ADMIN_SESSION_COOKIE\|hashPassword\|scrypt" src` 无任何匹配
- [ ] 全新走 `/install`：填站点信息 + 管理员邮箱 + 密码 → 提交后自动登录 `/admin`
- [ ] 退出后用同一邮箱密码可重新登录；错误密码报「邮箱或密码不正确」；非 admin 用户登录被拒绝
- [ ] Supabase Dashboard → Authentication → Users 看到管理员用户，`app_metadata.role = "admin"`
- [ ] `/admin/compose/post` 创建文章并发布，DB 中 `Post.authorId` 等于该 admin 的 UUID

## Phase 4：原生 Storage 切换

### 4.1 创建 bucket 与 storage policies

Supabase Dashboard → Storage：

1. New bucket → name `content` → Public bucket = ON → Create
2. Policies → 给 `content` 加：
   - `Allow public read`：`SELECT` for `anon, authenticated`，rule `bucket_id = 'content'`
   - 写权限不加 policy，只走 service role

### 4.2 重写 `src/server/object-storage.ts`

整文件替换为：

```ts
import "server-only";

import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export const MAX_IMAGE_UPLOAD_SIZE = 5 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
]);

export async function uploadImageToObjectStorage(file: File) {
  if (!file || file.size === 0) {
    throw new Error("请选择要上传的图片。");
  }
  if (file.size > MAX_IMAGE_UPLOAD_SIZE) {
    throw new Error(`图片不能超过 ${MAX_IMAGE_UPLOAD_SIZE / 1024 / 1024}MB。`);
  }
  if (!IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error("只支持上传 AVIF、GIF、JPEG、PNG、SVG 或 WebP 图片。");
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  const publicBaseUrl = process.env.SUPABASE_STORAGE_PUBLIC_BASE_URL;
  if (!bucket || !publicBaseUrl) {
    throw new Error("Supabase Storage 未正确配置。");
  }

  const storageKey = createStorageKey(file.name, file.type);
  const supabase = createSupabaseAdminClient();
  const body = await file.arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(storageKey, body, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    url: createPublicUrl(publicBaseUrl, storageKey),
    storageKey,
  };
}

function createPublicUrl(publicBaseUrl: string, storageKey: string) {
  return `${publicBaseUrl.replace(/\/+$/, "")}/${storageKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function createStorageKey(filename: string, mimeType: string) {
  const ext = getSafeExtension(filename, mimeType);
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `posts/${year}/${month}/${day}/${randomUUID()}${ext}`;
}

function getSafeExtension(filename: string, mimeType: string) {
  const ext = extname(filename).toLowerCase();
  if (/^\.[a-z0-9]+$/.test(ext)) return ext;
  switch (mimeType) {
    case "image/avif": return ".avif";
    case "image/gif": return ".gif";
    case "image/jpeg": return ".jpg";
    case "image/png": return ".png";
    case "image/svg+xml": return ".svg";
    case "image/webp": return ".webp";
    default: return "";
  }
}
```

### 4.3 删除图床后台页与仓库

```bash
Remove-Item -Force src\server\repositories\object-storage.ts
Remove-Item -Recurse -Force src\app\(admin)\admin\settings\image-hosting
```

修改 `src/app/(admin)/admin/settings/page.tsx`：删掉指向 `/admin/settings/image-hosting` 的整段 `<Link>`。

### 4.4 Phase 4 验收

- [ ] `/admin/compose/post` 上传一张新图，能在编辑器与发布页都看到
- [ ] Supabase Dashboard → Storage → content 能看到新对象
- [ ] `/admin/settings` 页面不存在「图床设置」入口
- [ ] `grep -r "ObjectStorageSettings\|image-hosting" src` 无任何匹配
- [ ] `npm run build` 通过

## Phase 5：收尾

### 5.1 移除 S3 依赖

```bash
npm uninstall @aws-sdk/client-s3
```

确认无遗留引用：

```bash
grep -r "@aws-sdk/client-s3" src
```

应当无输出。

### 5.2 更新 `README.md`

把「本地数据库」整段替换为：

````md
## 本地开发

需要一个 Supabase 项目（Free 即可）。复制 `.env.example` 为 `.env`，填入 Supabase Dashboard 取到的连接串、密钥与 bucket 信息，然后：

```bash
npm install
npx prisma migrate deploy
npm run dev
```

打开 `http://localhost:3000/install` 填站点信息与管理员邮箱、密码，完成首次安装。
````

### 5.3 更新 `docs/architecture.md`

「基础设施选择」一节改为：

- 数据库：Supabase Postgres + Prisma（service role bypass RLS）
- 资源存储：Supabase Storage 原生 SDK
- 鉴权：Supabase Auth，admin 标识用 `app_metadata.role`

### 5.4 最终验收清单

- [ ] `npm run build` 通过，`npx tsc --noEmit` 无错，`npm run lint` 无新增 error
- [ ] 在生产 / preview 环境跑一次完整冒烟：`/install` → 登录 → 撰写 → 上传图片 → 发布 → 公开页可见
- [ ] Supabase Dashboard：7 张业务表 RLS = ON；`auth.users` 有 1 条 admin；`Storage → content` bucket 存在
- [ ] 仓库内执行：

```bash
grep -r "AdminUser\|AdminSession\|ObjectStorageSettings\|@aws-sdk/client-s3\|hashPassword\|scrypt\|ADMIN_SESSION_COOKIE\|adminUsername\|image-hosting" src
```

应只在「无匹配」状态退出。
- [ ] `prisma/migrations/` 仅含一个 `<ts>_init`
- [ ] `.env.example` 与 `README.md` 已更新

## 风险与注意事项

- **prepared statements**：用 session pooler 即可；改 transaction pooler 时记得 `?pgbouncer=true&connection_limit=1`
- **Auth cookie 域**：本地 `localhost` 与生产域名 cookie 不互通，部署时必须在 Supabase Dashboard `Authentication → URL Configuration` 把生产域名加进 Site URL 与 Redirect URLs
- **service role 泄露**：永远不写进 `NEXT_PUBLIC_*`；只在 `src/server/supabase/admin.ts` 这种 `server-only` 文件里 import；CI / 部署平台用 Secret 注入
- **JWT claim 缓存**：变更 `app_metadata.role` 后，用户的 access token 需要刷新一次才生效；用 `supabaseAdmin.auth.admin.updateUserById` 之后请用户重登
- **migration 单线**：本手册产出仅一个 `<ts>_init` migration；所有后续 schema 变更必须通过新增 migration 实现，绝不允许编辑历史 migration

## LLM 执行约定

按本手册执行的 LLM 必须遵守：

1. 严格按 Phase 顺序，每个 Phase 内的小节也按编号顺序
2. 每个文件改动只引用本文档列出的路径，不发明新位置
3. 每个 Phase 的「验收」必须全部 ✅ 才能进入下一个 Phase
4. 出现任何不在手册预期内的报错时，立即停下来汇报，不要尝试性修改
5. 任何环境变量出现在代码里时，必须按本文档「命名约定」一节里的精确大小写引用，不允许重命名
6. 任何 Supabase 控制台手动操作（建项目、建 bucket、加 policy）都需要在汇报里说明已完成，便于审计
7. 不允许引入任何「兜底 / 兼容 / 双写 / 回滚旧值」的代码路径；遇到这种诱因时停下汇报，由用户决定
