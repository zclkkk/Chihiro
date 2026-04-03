# 开发路线

这份文档用于记录 Chihiro 当前已经完成的工作，以及接下来推荐的开发顺序。

## 当前状态

目前项目已经完成或确认了这些事情：

- 公开站点已经有首页、文章列表、文章详情、动态列表、动态详情、归档页基础
- `posts` 页已经具备 query 驱动的分页、排序、分类和标签筛选
- `updates` 页已经开始对齐 `posts` 的分页与筛选逻辑
- 第一版 `prisma/schema.prisma` 已经起草完成
- `.env.example` 已经补上 `DATABASE_URL` 约定
- `Prisma` 依赖已经安装完成
- `prisma.config.ts` 已经按 Prisma 7 方式接入
- Prisma Client 已经生成成功
- `src/server/db/client.ts` 和 `posts / updates / assets` repository 骨架已经建立
- Prisma schema 已经成功推送到远程数据库
- 当前站点的文章、动态、标签、分类、站点配置、资源占位数据已经 seed 到数据库
- admin 路由已经存在，但仍然是占位状态
- 架构方向已经确认：
  - 单租户、单站点 CMS
  - `Postgres + Prisma + S3/R2`
  - 公开页采用 ISR
  - 列表页状态放入 URL query
  - 正文内容分为 `content` 与 `contentHtml`

当前最重要的变化是：

项目的“页面方向”已经比较清楚了，但“内容系统地基”还没有正式落地。

## 当前还没做的关键部分

下面这些是现在最重要、但还没有真正开始的部分：

- 对象存储上传
- 富文本编辑器
- `content -> contentHtml` 渲染链路
- 发布后的 revalidate 实现
- 正式后台发布流程

## 接下来推荐顺序

### 1. 建数据库 schema

这一部分已经开始，当前已完成：

- 建立 `prisma/schema.prisma`
- 定义 `Post`
- 定义 `Update`
- 定义 `Asset`
- 补充 `Tag`、`Category`、`SiteSettings`
- 建立 `.env.example`

接下来需要做的是：

- 跑第一版迁移或 `db push`

第一版不要追求一次把所有模型建满，先把主干模型跑通。

建议第一版优先包含这些字段：

- `id`
- `title`
- `slug`
- `summary`
- `status`
- `content`
- `contentHtml`
- `publishedAt`
- `updatedAt`
- `createdAt`

### 2. 接 Prisma 与数据库访问层

这一部分也已经开始，当前已完成：

- `src/server/db/client.ts`
- `src/server/repositories/posts.ts`
- `src/server/repositories/updates.ts`
- `src/server/repositories/assets.ts`

当前目标已经从“建立接口骨架”变成“把公开页面切到 repository”。

### 3. 把公开页面切到 repository

这一步现在已经成为最优先的下一步，只换数据来源，不大改页面表现：

- 首页改成读 repository
- `/posts` 改成读 repository
- `/posts/[slug]` 改成读 repository
- `/updates` 改成读 repository
- `/updates/[slug]` 改成读 repository
- `/archives` 改成读 repository

这样做完后，公开页就会从“本地演示数据”进入“真实内容系统雏形”。

### 4. 补发布与缓存刷新

公开页面改成读数据库之后，再补：

- 发布动作
- 草稿状态
- `revalidatePath` / `revalidateTag`
- 首页、列表页、详情页、归档页刷新

这一步会把 ISR 真正接入内容发布流。

### 5. 接对象存储上传

然后做资源能力：

- 接对象存储上传
- 建 `Asset` 元数据记录
- 让内容可以引用图片与视频

本地文件如果要支持，也只建议作为开发环境 fallback。

### 6. 最后再做编辑器

编辑器建议放在上面这些地基之后。

推荐第一版只做：

- 段落
- 标题
- 粗体 / 斜体
- 列表
- 引用
- 代码块
- 链接
- 图片

先让普通文章可写、可存、可发布、可展示。

### 7. 第二阶段再做高级内容块

下面这些不要现在就做：

- GitHub Discussion 卡片
- 通用链接卡片
- 视频嵌入
- 自动解析链接
- 版本历史
- 协同编辑

这些都应该放到普通内容链路跑通之后。

## 当前结论

下一步最应该开始做的是：

**`Prisma schema -> repository -> 公开页切库 -> 发布与 revalidate -> 上传 -> 编辑器`**

这条路径是当前最稳、最不容易返工的路线。
