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

- 数据库：Supabase Postgres + Prisma（service role bypass RLS）
- 资源存储：Supabase Storage 原生 SDK
- 鉴权：Supabase Auth，admin 标识用 `app_metadata.role`
- 公开内容页：静态优先，采用 `ISR`
- admin、编辑、上传、发布：动态处理

这意味着项目不再按“本地文件博客”设计，而是按“内容系统”设计。

## 内容模型方向

第一版建议优先围绕这些核心实体展开：

- `Post`
- `Update`
- `Asset`
- `Tag`
- `Category`
- `SiteSettings`

如果想先控制复杂度，也可以先从下面三张表起步：

- `Post`
- `Update`
- `Asset`

## 正文内容怎么存

如果后续要做富文本编辑器，正文内容建议分成两层：

- `content`：编辑器原始 JSON
- `contentHtml`：用于公开页面展示的 HTML

这样做的原因：

- JSON 更适合作为编辑器源格式
- HTML 更适合作为公开页渲染结果
- 更适合草稿、预览、版本历史和节点扩展

一个简化后的文章模型可以理解成：

```ts
type Post = {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  status: "draft" | "published";
  content: unknown;
  contentHtml: string | null;
  publishedAt: string | null;
  updatedAt: string;
};
```

## 页面策略

当前项目建议采用“公开页静态优先，后台动态渲染”的策略。

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

## 列表页 URL 规则

对于公开列表页，推荐把“可分享、可恢复的列表状态”放进 URL query。

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

第一版只需要支持：

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

先把“普通内容可写、可存、可发布、可展示”跑通。

## 资源方案

资源文件本身不放数据库，数据库只保存元数据与引用关系。

推荐做法：

- 文件上传到 Supabase Storage
- 数据库保存 `Asset` 记录
- 正文中的图片或视频节点引用 `assetId` 或资源 URL

建议 `Asset` 至少包含：

- `id`
- `provider`
- `key`
- `url`
- `mimeType`
- `size`
- `width`
- `height`
- `duration`
- `alt`

本地文件只建议作为开发环境 fallback，不建议作为正式生产存储。

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

**使用 `Supabase Postgres + Prisma + Supabase Storage + Supabase Auth` 作为内容基础设施，公开页采用 ISR，后台走动态渲染，先完成普通内容的发布链路，再扩展编辑器和嵌入能力。**
