# RSS 与 SEO 实现规划

这份文档用于约定 Chihiro 的 RSS、SEO 和公开页缓存方案，确保博客在后台发布模式下仍然具备良好的可发现性。

## SEO 目标

第一阶段的 SEO 不追求极致复杂，而是确保基础完整：

- 每个页面都有清晰标题和描述
- 每篇文章都有独立 metadata
- 搜索引擎能找到 `sitemap.xml`
- 爬虫能读取 `robots.txt`
- 社交平台分享时有正确预览信息

## 站点级 SEO

建议在 `src/app/layout.tsx` 中设置全站默认 metadata。

应包含：

- `metadataBase`
- `title`
- `description`
- `applicationName`
- `authors`
- `keywords`
- `openGraph`
- `twitter`

推荐把站点信息统一抽到 `src/lib/site.ts`，避免在多个文件里重复维护。

## 文章级 SEO

建议在 `src/app/posts/[slug]/page.tsx` 中使用 `generateMetadata`。

每篇文章至少生成：

- `title`
- `description`
- `alternates.canonical`
- `openGraph.type = "article"`
- `openGraph.publishedTime`
- `openGraph.modifiedTime`
- `openGraph.tags`
- `twitter.card`

如果后续补齐封面图，还应增加：

- `openGraph.images`
- `twitter.images`

## sitemap

建议使用 App Router 原生的 `src/app/sitemap.ts`。

至少输出以下 URL：

- 首页
- 文章列表页
- 所有文章详情页

如果文章有更新时间，`lastModified` 应优先取文章的更新时间，没有则取发布时间。

如果后续加入动态内容，也应把 `/updates/[slug]` 一并输出进去。

## robots

建议使用 `src/app/robots.ts`。

建议至少包含：

```ts
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://your-domain.com/sitemap.xml",
  };
}
```

后续若存在草稿路由或内部页面，再单独加禁止抓取规则。

## RSS

建议通过 `src/app/rss.xml/route.ts` 动态输出 RSS。

实现方式建议：

1. 从文章数据源获取所有已发布文章
2. 按发布时间倒序排列
3. 手动拼接 XML 字符串
4. 返回 `Content-Type: application/rss+xml; charset=utf-8`

RSS channel 建议包含：

- `title`
- `description`
- `link`
- `language`
- `lastBuildDate`

每个 item 建议包含：

- `title`
- `description`
- `link`
- `guid`
- `pubDate`

如果项目同时维护文章与动态，需要尽早决定：

- RSS 只输出文章
- 或分别提供文章 RSS 与动态 RSS

## Canonical URL 约定

建议统一由工具函数生成 canonical URL，例如：

```ts
export function absoluteUrl(path = "") {
  return new URL(path, site.url).toString();
}
```

这样可以减少：

- 域名拼接错误
- 多处维护站点地址
- RSS、SEO、sitemap 不一致

对于列表页，还需要补一层 query 约定。

### 列表页 query 与 canonical 建议

`/posts` 和 `/updates` 这类页面允许使用 query 表达：

- 分页
- 排序
- 标签筛选
- 分类筛选
- 搜索词

这是推荐做法，因为这些状态：

- 适合被分享
- 适合在刷新后保留
- 适合服务端根据 URL 直接渲染结果

建议把这类页面分两种看待：

1. 主列表页
   canonical 指向自身主路径，例如 `/posts`
2. 分页与筛选页
   是否保留 query 到 canonical，后续可以按 SEO 策略再细分

当前阶段为了控制复杂度，建议先采用更保守的策略：

- `/posts` 的 canonical 指向 `/posts`
- `/updates` 的 canonical 指向 `/updates`

也就是说，分页、筛选、搜索 query 先不作为重点索引目标。

这样做的好处是：

- 避免重复内容被搜索引擎反复抓取
- 避免在早期就陷入复杂的列表页 SEO 细分
- 对博客站点更稳妥

## ISR 与按需刷新

当前项目采用数据库作为内容源，因此公开页面不建议依赖“每次发文都重新 build 全站”。

推荐策略：

- 首页：ISR
- `/archives`：ISR
- `/posts`：ISR
- `/posts/[slug]`：静态生成 + ISR
- `/updates`：ISR
- `/updates/[slug]`：静态生成 + ISR

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

## Open Graph 图片建议

如果你后面想把博客做得更完整，下一步很值得补的是 OG Image。

推荐路线：

1. 先提供一个全站默认 OG 图
2. 后续为文章生成动态 OG 图

在 Next.js 里可以后续考虑使用 `opengraph-image.tsx` 来生成。

## 实现顺序建议

建议按这个顺序落地：

1. `src/lib/site.ts`
2. `src/lib/posts.ts`
3. `src/app/layout.tsx` 默认 metadata
4. `src/app/posts/[slug]/page.tsx` 的 `generateMetadata`
5. `src/app/sitemap.ts`
6. `src/app/robots.ts`
7. `src/app/rss.xml/route.ts`

## 验收清单

完成后可以按下面方式自查：

- 首页源码里能看到默认 metadata
- 文章详情页源码里能看到文章专属 title 和 description
- 打开 `/sitemap.xml` 能看到页面列表
- 打开 `/robots.txt` 能看到 sitemap 地址
- 打开 `/rss.xml` 能看到合法 XML

## 当前结论

对这个项目来说，最稳妥的路线不是一开始就引入很多第三方包，而是先用 Next.js 原生能力完成：

- Metadata API
- `sitemap.ts`
- `robots.ts`
- Route Handler 生成 RSS

这样依赖少，结构清晰，也更方便后续接上数据库内容源和按需 revalidate。
