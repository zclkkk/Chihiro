# 开发路线

这份文档用于记录 Chihiro 当前已经完成的工作，以及接下来推荐的开发顺序。

## 当前状态

目前项目已经完成或确认了这些事情：

- 公开站点已经有首页、文章列表、文章详情、动态列表、动态详情、归档页基础
- `posts` 页已经具备 query 驱动的分页、排序、分类和标签筛选
- `updates` 页已经基本对齐 `posts` 的分页与筛选逻辑
- 已完成从 Prisma + 自定义认证 + 占位资源到 Supabase 原生技术栈的迁移：
  - 数据库：Prisma → Supabase Postgres（SQL 迁移 + RLS）
  - 认证：自定义 cookie + AdminUser/AdminSession → Supabase Auth（email/password + SSR cookie）
  - 存储：占位上传 → Supabase Storage（`site-assets` 存储桶）
  - 数据访问：`src/server/repositories/*` → `src/server/supabase/*`
  - 主键策略：Integer → UUID
  - 修订系统：JSON snapshot → 专用修订表（`post_revisions` / `update_revisions`）
  - 类型系统：Prisma 枚举 → 本地 TS 类型联合（`src/types/domain.ts`）
- 四个 Supabase 客户端工厂已建立（browser / server / anon / admin）
- 公开页已切到 Supabase 数据层：
  - 首页读取站点配置
  - `/posts`、`/posts/[slug]`
  - `/updates`、`/updates/[slug]`
  - `/archives`
  - `rss.xml`
  - `sitemap.xml`
- 后台登录已迁移到 Supabase Auth（email/password），session cookie 由 `@supabase/ssr` 管理
- 后台编辑台已经合并成 `/admin/workbench`，上方是撰写入口，下方是文章 / 动态 / 分类 / 标签管理区
- 后台文章管理已经支持：
  - 编辑文章
  - 保存草稿
  - 发布文章 / 更新并发布
  - 删除文章
  - 删除已保存修订
- 修订表已替代旧的 JSON snapshot，草稿和发布修订独立存储
- `保存草稿` 会保留在当前编辑页，不会跳回编辑台
- `发布文章` / `更新并发布` 成功后会跳回编辑台
- 发布后的 `revalidatePath` 已经接入首页、列表页、详情页、归档、RSS、sitemap 刷新
- 架构方向已经确认：
  - 单租户、单站点 CMS
  - `Supabase（Postgres + Auth + Storage）`
  - 公开页采用 ISR
  - 列表页状态放入 URL query
  - 正文内容分为 `content` 与 `contentHtml`
  - UUID 主键、修订表、本地 TS 类型

当前最重要的变化是：

项目已完成 Supabase 迁移，公开展示链路、后台编辑闭环、草稿修订链路与基础发布链路都已跑通。

现在真正缺的是：

- 稳定的 `content -> contentHtml` 渲染链路
- 上传与资源引用能力的完善

## 当前还没做的关键部分

下面这些是现在最重要、但还没有真正完成的部分：

- `content -> contentHtml` 的正式渲染链路
- 富文本编辑器体验打磨

## 接下来推荐顺序

### 1. 先完成后台内容创建与编辑闭环

这部分已经基本完成了，当前重点不再是"能不能写"，而是把写作体验再磨顺。

目前后台已经有：

- 登录保护（Supabase Auth）
- 内容概览
- 编辑台
- 修订表回填
- 发布 / 转回草稿

当前编辑页已经支持：

- 创建文章
- 编辑已有内容
- 保存草稿
- 发布文章
- 保存已发布文章的修订稿
- 删除修订后恢复到上一次已发布版本

这一阶段的重点已经从"把功能做出来"转成"把工作流做顺"。

### 2. 补 `content -> contentHtml` 的最小可用渲染链路

当前公开详情页已经支持优先读取 `contentHtml`，没有时再回退到 `content` 的文本段落。

所以下一步需要把内容保存链路和渲染链路统一起来，至少明确：

- 后台保存时如何生成 `contentHtml`
- 公开页渲染时优先读什么
- 草稿预览是否复用同一套转换

第一版可以很克制，不需要一步到位：

- 如果先用 `textarea`，可以先接一版 markdown -> html
- 如果先用结构化 JSON，也可以先做最小节点集转换

重点是先建立稳定的单一来源，而不是先追求编辑器能力。

### 3. 再补编辑动作与发布流整合

创建 / 编辑能力落地之后，继续把发布流补完整：

- 保存草稿后留在当前编辑页
- 发布成功后回到编辑台
- 已发布文章编辑时继续回填修订稿
- 发布前校验必填字段
- 发布后继续复用现有 `revalidatePath`
- 必要时补"预览"或"最近修改内容"

这一阶段做完，后台才算从"管理已有数据"变成"真正的内容工作台"。

### 4. 打磨资源上传与引用

当前资源上传已接入 Supabase Storage，后续需要：

- 打磨编辑器内的图片上传体验
- 完善资源管理界面
- 让文章和动态内容可以更方便地引用图片

### 5. 最后再打磨富文本编辑器

编辑器建议放在上面这些地基之后。

当前已接入 Tiptap，第一版支持：

- 段落
- 标题
- 粗体 / 斜体
- 列表
- 引用
- 代码块
- 链接
- 图片

先让普通文章可写、可存、可发布、可展示。

### 6. 第二阶段再做高级内容块

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

**`后台创建 / 编辑 -> content 渲染链路 -> 编辑动作补全 -> 上传打磨 -> 编辑器打磨`**

这条路径更符合当前真实进度，也最不容易返工。
