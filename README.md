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
- Postgres
- Prisma
- S3 / R2 类对象存储

## 本地启动

```bash
pnpm install
pnpm dev
```

默认访问地址：

```text
http://localhost:3000
```

## 本地数据库

项目已经接入 `Prisma`，本地开发可以先用 `docker compose` 启一个 Postgres：

```bash
docker compose up -d
cp .env.example .env
pnpm db:push
pnpm db:generate
```

默认本地连接串已经写在 `.env.example` 里，对应 `docker-compose.yml` 里的数据库配置。

## 文档索引

- [架构设计](./docs/architecture.md)
- [开发路线](./docs/roadmap.md)
- [RSS 与 SEO 实现规划](./docs/rss-seo-plan.md)
