# 站点配置说明

这份文档用于说明 Chihiro 当前项目里两套“站点配置”来源的职责边界：

- `src/lib/site.ts` 里的 `siteConfig`
- 数据库 `SiteSettings` 表

它们不是重复关系，而是：

- `siteConfig` 负责默认值和兜底值
- `SiteSettings` 负责后台可编辑、运行时生效的正式站点配置

## 一句话原则

如果某个配置是“管理员希望在后台修改后立刻影响站点”的，那么它应该以 `SiteSettings` 为主。

如果某个配置是“项目还没初始化、数据库还没准备好时也必须存在”的，那么它应该保留在 `siteConfig` 里作为默认值或 fallback。

## `siteConfig` 的职责

文件位置：

- `src/lib/site.ts`

当前用途：

- 提供安装前的默认站点信息
- 在数据库没有 `SiteSettings` 记录时作为 fallback
- 给安装页提供初始默认值
- 给部分构建期或早期初始化逻辑提供基础配置

适合放在 `siteConfig` 里的内容：

- 默认站点名
- 默认作者名
- 默认站点地址
- 默认摘要、格言、邮箱、GitHub
- 纯代码级工具函数，例如 `absoluteUrl()`

不应该把 `siteConfig` 当成：

- 后台设置页的唯一数据源
- 运行时站点配置的最终真相

## `SiteSettings` 的职责

代码入口：

- 表结构：`supabase/migrations/20260425000000_initial_schema.sql`
- 读取：`src/server/supabase/site.ts`
- 后台保存：`src/app/(admin)/admin/settings/actions.ts`

`SiteSettings` 是当前项目里的单站点运行时配置表。后台设置页修改的内容，应该最终写入这里。

适合放在 `SiteSettings` 里的内容：

- `siteName`
- `siteDescription`
- `siteUrl`
- `locale`
- `authorName`
- `authorAvatarUrl`
- `summary`
- `motto`
- `email`
- `githubUrl`

这些字段的特点是：

- 会被公开站点展示
- 可能在后台被频繁调整
- 修改后应该立即影响 header、footer、metadata、RSS 等输出

## 推荐读取顺序

对于公开站点和后台运行时页面，推荐统一采用：

```ts
const siteSettings = await getSiteSettings();

const siteName = siteSettings?.siteName ?? siteConfig.name;
```

也就是：

1. 优先读 `SiteSettings`
2. 读不到时 fallback 到 `siteConfig`

这样可以同时满足：

- 站点正式运行时优先使用后台配置
- 本地开发、数据库缺失、安装前状态也不会崩

## 推荐写入规则

后台设置页不应该直接修改 `siteConfig`。

后台设置页只负责：

1. 读取当前 `SiteSettings`
2. 提交表单
3. 调用 `upsertSiteSettings`
4. `revalidatePath` 让公开页与后台刷新

`siteConfig` 仍然保留在代码里，但只作为默认值来源，不参与后台写入。

## 常见误区

### 误区 1：后台已经保存成功，但前台没变化

通常原因是：

- 设置页写入了 `SiteSettings`
- 但前台组件仍然直接读取 `siteConfig`

例如：

- header 还在读 `siteConfig.name`
- footer 还在读 `siteConfig.author`
- metadata 还在读静态 `siteConfig.name`

这种情况下，保存虽然成功，但不会真正反映到站点 UI。

### 误区 2：把所有配置都迁出 `siteConfig`

这也不合适。

如果没有 `siteConfig`：

- 安装前页面缺少默认值
- 数据库不可用时无法 fallback
- 一些构建期逻辑缺少安全默认值

所以正确做法不是“删除 `siteConfig`”，而是“明确它只负责默认值和兜底值”。

## 当前项目约定

在 Chihiro 里，以下内容应优先读取 `SiteSettings`：

- 公开站点 header 中的站点名
- 公开站点 footer 中的作者、格言、邮箱、GitHub、站点名
- 页面 metadata 中的站点名、站点地址、站点描述
- RSS / sitemap 等对外输出中使用的站点信息
- 后台编辑器默认作者名

以下内容可以继续留在 `siteConfig`：

- 安装页的默认初始值
- 数据库缺失时的 fallback
- 静态工具函数和项目级默认常量

## 新功能开发时的判断标准

如果以后新增一个配置字段，可以按下面的标准判断放哪：

- 需要后台可编辑，并且修改后要立刻影响站点：放进 `SiteSettings`
- 只是项目默认值，或用于未初始化状态兜底：放进 `siteConfig`
- 同时需要默认值和后台可编辑：两边都保留，但运行时优先读 `SiteSettings`

## 建议实践

后续开发里，推荐统一形成下面的习惯：

- 页面渲染时用 `getSiteSettings()` 读取正式配置
- 取值时始终写成 `siteSettings?.field ?? siteConfig.fallback`
- 后台设置页只写数据库，不碰 `siteConfig`
- 文档、代码评审和新功能开发都按这个约定执行

这样可以避免再次出现“设置页已经保存，但站点 UI 还在读旧配置”的问题。
