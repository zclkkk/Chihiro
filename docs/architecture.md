# 架构设计

这份文档用于统一 Chihiro 当前阶段的系统设计、内容模型方向和页面渲染策略。

## 当前定位

Chihiro 第一阶段按：

**单租户、单站点 CMS**

来设计，而不是纯静态博客模板，也不是多租户博客平台。

当前目标是：

- 有一个公开前台
- 有一个后台管理台
- 支持文章与动态发布
- 支持 SEO、RSS、sitemap
- 支持后续的富文本编辑与资源上传

## 基础设施选择

当前已经确认：

- 数据库：`Supabase Postgres`
- 认证：`Supabase Auth`（email/password + SSR cookie）
- 资源存储：`Supabase Storage`（`site-assets` 存储桶）
- ORM / 数据访问：`@supabase/supabase-js` + `@supabase/ssr`，无 ORM 中间层
- 数据库迁移：`supabase/migrations/20260425000000_init.sql`（单文件初始化），远程 Supabase 项目执行
- 公开内容页：静态优先，采用 `ISR`
- admin、编辑、上传、发布：动态处理

这意味着项目不再按"本地文件博客"设计，而是按"内容系统"设计。

### Supabase 客户端工厂

项目使用四个 Supabase 客户端，各有明确职责：

- **Browser 客户端**（`src/lib/supabase/browser.ts`）— 客户端组件、登录表单、认证上传
- **Cookie-aware Server 客户端**（`src/lib/supabase/server.ts`）— admin 路由、server actions、session 依赖读取
- **Anon Server 客户端**（`src/lib/supabase/anon.ts`）— 公开页面、RSS、sitemap 的无 cookie 读取，保证 ISR 行为正常
- **Service-role 客户端**（`src/lib/supabase/admin.ts`）— 仅用于首次管理员引导和存储桶初始化

### 认证模型

- 管理员认证使用 Supabase Auth 的 email/password 登录，通过 `@supabase/ssr` 处理 cookie
- 管理员身份由 `admin_profiles` 表（关联 `auth.users.id`）确认，不使用自定义 JWT claims
- Middleware 仅负责刷新 Supabase session，不执行 admin 访问控制
- Admin 授权在 server components 和 server actions 中通过 `supabase.auth.getUser()` + `admin_profiles` 查询实现

## 内容模型方向

核心实体：

- `Post` — 文章（UUID 主键）
- `Update` — 动态（UUID 主键）
- `PostRevision` / `UpdateRevision` — 修订表，替代旧的 JSON snapshot
- `Asset` — 资源（存储在 Supabase Storage，数据库仅保存元数据）
- `Tag` — 标签
- `Category` — 分类
- `SiteSettings` — 站点配置（单例行，`id = 'default'`）
- `AdminProfile` — 管理员档案（关联 `auth.users`）

### 主键策略

所有领域表使用 UUID 主键，与 Supabase Auth / Storage 生态一致。

### 状态模型

文章和动态的状态使用本地 TS 类型联合：

```ts
type ContentStatus = "draft" | "published" | "archived";
```

不再使用数据库枚举或 Prisma 枚举。

## 正文内容怎么存

正文内容分成两层：

- `content`：编辑器原始 JSON（Tiptap JSON）
- `contentHtml`：用于公开页面展示的 HTML

这样做的原因：

- JSON 更适合作为编辑器源格式
- HTML 更适合作为公开页渲染结果
- 更适合草稿、预览、版本历史和节点扩展

### 修订表替代 JSON snapshot

旧的 `publishedSnapshot` / `draftSnapshot` jsonb 字段已被专用修订表替代：

- `post_revisions` — 文章修订记录（`kind` 为 `draft` 或 `published`）
- `update_revisions` — 动态修订记录

live 表（`posts` / `updates`）仅保存当前可编辑状态，修订历史独立存储。

一个简化后的文章模型可以理解成：

```ts
type Post = {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  status: "draft" | "published" | "archived";
  content: unknown;
  contentHtml: string | null;
  publishedAt: string | null;
  updatedAt: string;
};
```

## 页面策略

当前项目建议采用"公开页静态优先，后台动态渲染"的策略。

推荐如下：

- `/`：ISR
- `/archives`：ISR
- `/posts`：ISR
- `/posts/[slug]`：静态生成 + ISR
- `/updates`：ISR
- `/updates/[slug]`：静态生成 + ISR
- `/rss.xml`：动态生成或按需刷新
- `/sitemap.xml`：动态生成或按需刷新
- `/admin/*`：动态渲染

这样既能保住 SEO 和性能，也适合后台发布后的按需刷新。

### ISR 注意事项

公开页面的数据读取使用 anon server 客户端（无 cookie），确保 Next.js 不会将页面标记为动态渲染。如果误用 cookie-aware 客户端读取公开页面，ISR 会静默降级为每次请求重新渲染。

## 列表页 URL 规则

对于公开列表页，推荐把"可分享、可恢复的列表状态"放进 URL query。

适合放进 query 的状态包括：

- 分页
- 排序
- 分类筛选
- 标签筛选
- 搜索词

当前约定：

### `/posts`

支持：

- `page`
- `sort`
- `category`
- `tag`
- `q`

示例：

```text
/posts?page=2
/posts?sort=latest
/posts?category=engineering
/posts?tag=react&tag=nextjs
/posts?q=editor
```

### `/updates`

与 `/posts` 保持一致，也支持：

- `page`
- `sort`
- `category`
- `tag`
- `q`

示例：

```text
/updates?page=2
/updates?sort=latest
/updates?category=build-logs
/updates?tag=ui&tag=progress
/updates?q=release
```

## 路由参数与状态边界

建议统一按下面的规则处理：

- 资源身份放路径参数
- 列表状态放 query
- 临时 UI 状态放客户端本地 state

示例：

- `/posts/[slug]`：文章身份
- `/updates/[slug]`：动态身份
- `/posts?page=2&tag=react`：列表状态
- 搜索弹窗开关：本地 state，不进 URL

## 发布与缓存刷新

当前采用 ISR 后，公开页面不需要在每次发文时重新 build 全站。

发布文章后建议按需刷新：

- `/`
- `/archives`
- `/posts`
- `/posts/[slug]`
- `/rss.xml`
- `/sitemap.xml`

发布动态后建议按需刷新：

- `/`
- `/archives`
- `/updates`
- `/updates/[slug]`
- `/rss.xml`
- `/sitemap.xml`

如果只是保存草稿，不需要刷新公开页面。

## 编辑器路线

第一版不要自己从零做编辑器，建议直接基于成熟编辑器库做最小可用版本。

当前已接入 Tiptap 编辑器，第一版支持：

- 段落
- 标题
- 粗体 / 斜体
- 列表
- 引用
- 代码块
- 链接
- 图片

第一版先不做：

- GitHub 卡片
- 视频卡片
- 自动链接解析
- 协同编辑
- 版本历史

先把"普通内容可写、可存、可发布、可展示"跑通。

## 资源方案

资源文件通过 Supabase Storage 管理，数据库只保存元数据与引用关系。

当前做法：

- 文件上传到 `site-assets` 存储桶（路径：`${userId}/${timestamp}-${safeName}`）
- 数据库保存 `assets` 记录（`storage_path`、`mime_type`、`size`、`width`、`height` 等）
- 公开渲染通过 `supabase.storage.from('site-assets').getPublicUrl(storage_path)` 获取 URL
- 编辑器上传流程：浏览器客户端上传 → server action 记录元数据 → 返回公开 URL

建议 `Asset` 至少包含：

- `id`（UUID）
- `kind`（`image` | `video` | `file`）
- `storagePath`
- `bucket`
- `alt`
- `mimeType`
- `size`
- `width`
- `height`
- `duration`

不再使用 `AssetProvider` 枚举和 `S3 | R2 | LOCAL` 分支。

## 数据访问层

数据访问层位于 `src/server/supabase/`，按领域模块组织：

- `posts.ts` — 文章 CRUD、列表查询、修订管理
- `updates.ts` — 动态 CRUD、列表查询、修订管理
- `categories.ts` — 分类 CRUD
- `tags.ts` — 标签 CRUD
- `assets.ts` — 资源元数据管理
- `site.ts` — 站点配置读写

复杂查询（如导航分类聚合）使用 SQL RPC 函数，通过 `supabase.rpc()` 调用。

## 第二阶段能力

下面这些能力建议放到普通内容链路稳定之后：

- GitHub Discussion / Repo 卡片
- 通用链接卡片
- 第三方视频嵌入
- 自动解析链接
- 版本历史
- 协同编辑

## 当前结论

Chihiro 当前的正确方向可以概括成一句话：

**使用 `Supabase（Postgres + Auth + Storage）` 作为内容基础设施，公开页采用 ISR，后台走动态渲染，先完成普通内容的发布链路，再扩展编辑器和嵌入能力。**
