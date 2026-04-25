# Chihiro

一个基于 Next.js App Router 的单站点内容发布系统，目标是支持：

- 博客文章与动态发布
- 后台管理与发布工作流
- 富文本内容编辑
- SEO 基础优化
- RSS 订阅输出
- 对象存储资源管理

当前项目还处在第一阶段，重点是先把公开站点、内容模型和后台发布链路搭稳。

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- App Router
- Supabase（Postgres + Auth + Storage）
- Tiptap 富文本编辑器

## 本地启动

```bash
npm install
npm run dev
```

默认访问地址：

```text
http://localhost:3000
```

## Supabase 配置

项目使用 Supabase 作为数据库、认证和存储后端。本地开发需要先准备一个 Supabase 项目。

### 1. 创建 Supabase 项目

在 [Supabase Dashboard](https://supabase.com/dashboard) 中创建一个新项目。

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入 Supabase 项目的凭据：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

这些值可以在 Supabase Dashboard → Project Settings → API 中找到。

### 3. 执行数据库迁移

将 `supabase/migrations/` 下的 SQL 文件按顺序在 Supabase Dashboard 的 SQL Editor 中执行：

1. `20260425000000_initial_schema.sql` — 核心表结构与索引
2. `20260425000001_rls_policies.sql` — RLS 策略
3. `20260425000002_storage_bucket.sql` — 存储桶与策略
4. `20260425000003_rpcs.sql` — RPC 函数
5. `20260425000004_revoke_admin_profiles_self_mutate.sql` — 收紧 admin_profiles 自修改策略

### 4. 生成数据库类型（可选）

如果需要重新生成 TypeScript 数据库类型：

```bash
SUPABASE_PROJECT_ID=your-project-id npm run db:types
```

### 5. 首次安装

启动开发服务器后访问 `http://localhost:3000/install`，按引导创建管理员账号并初始化站点配置。

## 文档索引

- [架构设计](./docs/architecture.md)
- [站点配置说明](./docs/site-settings.md)
- [开发路线](./docs/roadmap.md)
- [RSS 与 SEO 实现规划](./docs/rss-seo-plan.md)
