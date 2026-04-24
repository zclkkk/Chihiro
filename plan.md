# Supabase Full-Platform Migration Plan

This plan rewrites Chihiro from Prisma + custom admin auth + placeholder asset handling to a Supabase-native stack built on Supabase Postgres, Auth, Storage, SSR clients, SQL migrations, and RLS, without preserving existing project data.

## Scope and locked-in decisions

- Migrate to **Supabase Postgres + Supabase Auth + Supabase Storage**.
- Remove **Prisma entirely** from runtime, schema, scripts, and app-facing types.
- **No data preservation**; a clean Supabase bootstrap flow is acceptable.
- **Remote-only Supabase project.** No local Supabase CLI / Docker stack. Migrations live as `supabase/migrations/*.sql` in git and are applied against the hosted project via Studio SQL editor or `psql`. Types are generated via `supabase gen types typescript --project-id <id>` as a CLI-only tool.
- **Revision tables over JSON snapshots.** `publishedSnapshot` / `draftSnapshot` jsonb blobs are replaced by dedicated `post_revisions` / `update_revisions` tables. The live `posts` / `updates` rows only carry the current editable state.
- **UUID primary keys** on all domain tables. All admin routes that hard-assume numeric IDs (`/^\d+$/` validators, `Number(id)` casts, `/admin/compose/post?id=123` URL shapes) must be refactored.
- **Standard Supabase env var names**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Admin auth**: email/password via Supabase Auth with SSR cookies. Legacy `chihiro_admin_session` cookie + `AdminUser` / `AdminSession` tables are removed.
- **Admin capability** is an `admin_profiles` row keyed by `auth.users.id`; no custom JWT claims.
- **Service role** only for bootstrap (first admin + storage bucket init). All normal admin ops use the user session + RLS.
- Target state should feel **native to Supabase**, not Prisma code mechanically rewritten.

## Current architecture findings

- Prisma is the central dependency for:
  - `src/server/db/client.ts`
  - all repository files in `src/server/repositories/*.ts`
  - many UI/action files importing `@prisma/client` enums or JSON types directly
  - install/runtime checks built around `DATABASE_URL` and “schema missing” behavior
- Admin auth is custom and DB-backed:
  - `src/server/auth.ts`
  - `src/server/repositories/admin-auth.ts`
  - `src/lib/admin-auth.ts`
  - `middleware.ts`
- Public-site aggregation depends on the repository layer:
  - `src/server/public-content.ts`
  - `src/server/installation.ts`
  - `src/server/admin-backend.ts`
- Asset handling is only partially real today:
  - `src/server/repositories/assets.ts` stores metadata
  - editor upload currently points at placeholder/demo upload logic in `src/lib/tiptap-utils.ts`
  - there is no real storage integration yet

## Target architecture

### 1. Supabase integration model

- Packages: `@supabase/supabase-js`, `@supabase/ssr`.
- Four client factories, each with a clear role:
  - **Browser client** (`createBrowserClient`) for client components, login forms, and authenticated Storage uploads.
  - **Cookie-aware server client** (`createServerClient` + `next/headers` cookie adapter) for admin routes, server actions, and any session-dependent reads.
  - **Anon server client** (cookieless, anon key, `server-only`) for public reads in `(site)` pages, `rss.xml`, `sitemap.xml`. Keeping this cookieless is what allows ISR to behave sanely.
  - **Service-role client** (`server-only`) used only during first-admin bootstrap and storage bucket init.
- **Middleware** is the `@supabase/ssr` token-refresh middleware with a matcher covering all routes except Next.js static assets (`_next/static`, `_next/image`, `favicon.ico`, image extensions). **It does not enforce admin access** — it only refreshes the session. Admin authorization lives in server components and server actions.

### 2. Data model direction

- Replace Prisma schema with **SQL migrations under `supabase/migrations`**.
- Generate TypeScript DB types from Supabase schema and keep them in the repo.
- Prefer **UUID primary keys** for new domain tables because data reset is acceptable and UUIDs align better with Supabase/Auth/Storage.
- Use `timestamptz` for timestamps and `jsonb` for rich text payloads/snapshots.
- Core tables:
  - `site_settings` (singleton row pinned by `id = 'default'`)
  - `admin_profiles` (`id uuid references auth.users(id) on delete cascade`)
  - `categories` (no `kind` column — the current `CategoryKind.UPDATE` is vestigial and dropped)
  - `tags`
  - `posts` (live editable state only; `status text check (status in ('draft','published','archived'))`)
  - `post_tags` (composite PK)
  - `post_revisions` (`post_id`, `kind in ('draft','published')`, full snapshot columns + `tags_snapshot jsonb`, `saved_at`)
  - `updates` (live state; no category/tags/cover)
  - `update_revisions` (same pattern as `post_revisions`, scoped to `update_id`)
  - `assets` (`storage_path text unique`, `bucket text`, `kind text check (kind in ('image','video','file'))`, plus metadata; `AssetProvider` enum dropped)
- Preserve unique constraints: `posts.slug`, `tags.slug`, `categories.slug`.
- Use `auth.users` as the identity source; admin capability is gated by `admin_profiles` membership, not JWT claims.
- Replace Prisma enums in the app surface with **local TS unions** in `src/types/domain.ts` (`ContentStatus`, `AssetKind`). `CategoryKind` and `AssetProvider` are removed entirely.

### 3. Auth model

- Remove all legacy auth: `src/server/auth.ts`, `src/server/passwords.ts`, `src/server/repositories/admin-auth.ts`, `src/lib/admin-auth.ts`, `AdminUser`, `AdminSession`, `chihiro_admin_session` cookie logic.
- **Login** uses `supabase.auth.signInWithPassword` from a server action; `@supabase/ssr` handles cookie writes.
- **First-admin bootstrap** (install flow):
  1. Server action gate: only runs while no admin exists yet.
  2. Service-role client calls `supabase.auth.admin.createUser({ email, password, email_confirm: true })`.
  3. Insert `admin_profiles` row with the returned id.
  4. Upsert `site_settings`.
  5. Call `supabase.auth.signInWithPassword` in the same action so the SSR cookie is written on the same response.
  6. Redirect to `/admin`.
- **Email confirmation** must be disabled in the project auth settings, or every `admin.createUser` call passes `email_confirm: true` (as above). For a single-admin CMS, inline confirm is simplest.
- **Admin authorization in app code**: every admin server component/action calls `supabase.auth.getUser()` first and verifies `admin_profiles.id = user.id`; on failure, redirect. RLS is a second line of defense, not the only gate — never treat an empty RLS read as an auth signal.
- **Middleware** no longer decides whether to redirect to the login dialog. It only refreshes the Supabase session. The existing site-level admin-login dialog flow stays, but it now calls `signInWithPassword` with email/password fields.

### 4. Storage model

- Bucket: `site-assets`, **public SELECT**; admin-only `INSERT / UPDATE / DELETE` via RLS of the form `exists (select 1 from admin_profiles where id = auth.uid())`.
- Bucket creation + policies live in a bootstrap SQL migration.
- **Upload flow**:
  1. Admin editor uses the **browser** Supabase client to upload directly to `site-assets` at `${userId}/${timestamp}-${safeName}`.
  2. On success, the client calls a server action `createAssetAction({ storage_path, mime_type, size, width, height, duration, alt })`.
  3. The server action verifies admin, inserts the `assets` row, and returns the asset id + public URL.
  4. `src/lib/tiptap-utils.ts:handleImageUpload` is rewritten to drive this pipeline instead of returning a placeholder URL.
- Public rendering uses `supabase.storage.from('site-assets').getPublicUrl(storage_path)` as the single source of truth. No signed URLs in v1.
- `AssetProvider` enum and its `S3 | R2 | LOCAL` branching are removed everywhere.

## Migration workstreams

## Workstream 1: Foundation and dependencies

- Remove Prisma packages/scripts from `package.json`.
- Add Supabase packages (`@supabase/supabase-js`, `@supabase/ssr`) and env variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Introduce four Supabase client factories, each with a single responsibility:
  - `src/lib/supabase/browser.ts` — `createBrowserClient` for client components and authenticated Storage uploads.
  - `src/lib/supabase/server.ts` — cookie-aware `createServerClient` for admin routes and server actions.
  - `src/lib/supabase/anon.ts` — cookieless anon server client for public reads (`(site)` pages, `rss.xml`, `sitemap.xml`) so ISR stays sane.
  - `src/lib/supabase/admin.ts` — service-role client, `server-only`, used only for bootstrap and bucket setup.
- Remove legacy packages/scripts: `@prisma/client`, `@prisma/adapter-pg`, `prisma`, `pg`, `@types/pg`, plus `db:generate`, `db:push`, `db:migrate`, `db:studio`, `db:seed`.
- Add `db:types` script: `supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types/database.ts`.
- Delete `prisma/`, `prisma.config.ts`, `scripts/seed.mjs`.
- Add an env guard that fails fast if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing.

## Workstream 2: Schema, RLS, and bootstrap SQL

- Author `supabase/migrations/*.sql` for all core tables, indexes, and unique constraints.
- RLS policies:
  - `posts`, `updates`: public `SELECT` where `status = 'published'`; admin `ALL` via `admin_profiles` membership.
  - `categories`, `tags`: public `SELECT`; admin `ALL`.
  - `assets`: public `SELECT`; admin `INSERT / UPDATE / DELETE`.
  - `site_settings`: public `SELECT` of the singleton row; admin `UPDATE`; admin `INSERT` gated to “no existing row”.
  - `admin_profiles`: `SELECT` by self; `INSERT` only via service role (bootstrap) or existing admin.
  - `post_revisions`, `update_revisions`: admin-only.
- Define storage bucket `site-assets` with **public SELECT** and admin-only `INSERT / UPDATE / DELETE` policies keyed on `exists (select 1 from admin_profiles where id = auth.uid())`. Bucket creation goes into a migration (`insert into storage.buckets ... on conflict do nothing`).
- Define SQL RPCs for operations that must be atomic but cannot be batched from the JS client — in particular the category/tag deletion flows that currently rely on Prisma `$transaction` (see `src/server/repositories/categories.ts` and `src/server/repositories/tags.ts`).
- Apply migrations to the remote project via Studio SQL editor or `psql`. **Remote-only caveat**: migrations cannot be tested locally, so author each one idempotently where possible and run them against a dev Supabase project before promoting.

## Workstream 3: Remove Prisma types from app-facing code

- Eliminate every `import { ... } from "@prisma/client"` in app-facing code, notably:
  - `src/app/(admin)/admin/utils.ts`
  - `src/app/(admin)/admin/ui.tsx`
  - `src/app/(admin)/admin/workbench/page.tsx`
  - `src/app/(admin)/admin/categories/actions.ts`
  - `src/app/(admin)/admin/tags/actions.ts`
  - `src/app/(admin)/admin/compose/post/actions.ts`
  - `src/app/(admin)/admin/compose/post/post-editor-form.tsx`
  - `src/app/(admin)/admin/compose/update/actions.ts`
  - `src/app/(admin)/admin/compose/update/update-editor-form.tsx`
  - `src/server/repositories/*`
- Introduce `src/types/domain.ts` with local unions/constants:
  - `type ContentStatus = 'draft' | 'published' | 'archived'`
  - `type AssetKind = 'image' | 'video' | 'file'`
  - domain shapes (`PostItem`, `UpdateItem`, `AssetItem`, `CategoryOption`, `TagOption`, `PostRevision`, `UpdateRevision`, `SiteSettingsRecord`) decoupled from generated DB row types.
- Replace all `ContentStatus.PUBLISHED` / `ContentStatus.DRAFT` usages with the new string literals.
- Replace `Prisma.JsonValue` with `unknown` + runtime validation at boundaries, or a local `Json` alias where convenient.
- Do this step early so the new data layer does not inherit old persistence coupling.

## Workstream 4: Rewrite the data layer

- Replace repositories with Supabase-native query modules in `src/server/supabase/*.ts`:
  - `posts.ts`, `updates.ts`, `categories.ts`, `tags.ts`, `assets.ts`, `site.ts`, `revisions.ts`.
- Reads use explicit `.select('column, joined_table(columns)')` projections instead of Prisma `include`.
- Complex relational reads (e.g. `listPublishedPostCategoriesForNavigation`) move to **SQL views or RPC functions** in `supabase/migrations` and are called via `supabase.rpc(...)`.
- Replace Prisma unique-violation handling (`P2002` / `Prisma.PrismaClientKnownRequestError`) with PostgrestError `code === '23505'` checks.
- Replace Prisma `$transaction` flows in the current `categories` / `tags` deletion paths with the RPCs defined in Workstream 2.
- **Revision tables replace all snapshot helpers** — `parsePublishedSnapshot`, `parseDraftSnapshot`, `snapshotReferencesCategory`, `stripCategoryFromSnapshot`, `stripTagFromSnapshot`, `buildDraftSnapshot`, etc., in `src/server/repositories/posts.ts`, `src/server/repositories/updates.ts`, `src/server/repositories/categories.ts`, `src/server/repositories/tags.ts` must be reimplemented as queries/updates against the new `post_revisions` / `update_revisions` tables. Audit these files before considering the workstream complete.
- **Integer→UUID ID refactor**: grep for `/^\d+$/` and `Number(id)` across admin actions and routes; update every validator/URL shape (`src/app/(admin)/admin/actions.ts`, `src/app/(admin)/admin/compose/post/actions.ts`, etc.).

## Workstream 5: Rewrite auth, installation, and middleware

- Replace `src/server/auth.ts` with small helpers:
  - `getAuthContext()` — returns `{ user, isAdmin }` based on the SSR client + `admin_profiles` lookup.
  - `requireAdmin()` — redirects on failure.
- Rewrite `middleware.ts` using `@supabase/ssr` token-refresh pattern; matcher covers all non-static routes; **no admin enforcement in middleware**.
- Rewrite login/logout in `src/app/(admin)/admin/login/actions.ts` to use Supabase Auth.
- Rewrite `src/components/admin-login-dialog.tsx` copy/fields from `username/password` to `email/password`.
- Rewrite `src/app/install/actions.ts` per the bootstrap flow defined in §3 Auth model.
- Collapse `src/server/installation.ts` to a two-state check (`needs_installation | ready`); drop the Prisma-era `missing_database | schema_missing | database_unavailable` states (env-missing becomes a build-time failure, not a runtime state).
- Delete `src/server/admin-backend.ts` (or reduce to a trivial pass-through using the two-state enum).
- Delete `src/server/database-errors.ts` entirely; any surviving error-shape assumptions move to PostgrestError handling at call sites.
- Remove user-facing instructions tied to `DATABASE_URL`, `db:push`, and Prisma schema generation from `src/app/install/page.tsx` and any related copy.

## Workstream 6: Storage and editor upload

- Add `src/lib/supabase/upload.ts` that performs the browser-side upload to `site-assets`.
- Rewrite `src/lib/tiptap-utils.ts:handleImageUpload` to:
  1. Upload via the browser Supabase client to `site-assets` under `${userId}/${timestamp}-${safeName}`.
  2. Call a new server action `createAssetAction` (e.g. under `src/app/(admin)/admin/assets/actions.ts`) to persist the `assets` row.
  3. Return the public URL from `getPublicUrl` to the Tiptap extension.
- Any server-rendered consumer of `Asset.url` should resolve URLs through `getPublicUrl(storage_path)` rather than storing the URL in the DB, so bucket renames are a one-line change.
- Never expose the service-role key to the client; all admin-authenticated writes go through RLS-protected paths.

## Workstream 7: Remove legacy stack and update docs

- Delete:
  - `prisma/`
  - `prisma.config.ts`
  - `src/server/db/`
  - `src/server/passwords.ts`
  - `src/server/database-errors.ts`
  - `src/server/admin-backend.ts` (or reduce to a stub per Workstream 5)
  - `src/server/repositories/*` (replaced by `src/server/supabase/*`)
  - `src/lib/admin-auth.ts`
  - `scripts/seed.mjs`
- Finalize `package.json` dependency pruning and script cleanup per Workstream 1.
- Docs:
  - `README.md`: replace the “Postgres + Prisma + S3/R2” stack section with Supabase setup instructions (project creation, env vars, running `supabase/migrations/*.sql`, `db:types`).
  - `docs/architecture.md`: update the “基础设施选择” section and the closing conclusions to reflect Supabase.
  - `docs/roadmap.md`: drop Prisma-era bullets.
  - `docs/rss-seo-plan.md`: minor wording updates if any data-source references remain.
- Optional: add `supabase/seed.sql` for demo content; not required.

## Workstream 8: Validation

- Verify on a clean Supabase project:
  - first admin bootstrap
  - admin login/logout
  - category/tag CRUD
  - post create/edit/publish/unpublish/delete
  - update create/edit/publish/unpublish/delete
  - site settings save
  - asset upload and public render
  - RSS and sitemap generation
  - public pages and admin guards
- Run:
  - `npm run build`
  - `npm run lint`

## Likely file groups affected

- **Delete outright**:
  - `prisma/`
  - `prisma.config.ts`
  - `scripts/seed.mjs`
  - `src/server/db/client.ts`
  - `src/server/passwords.ts`
  - `src/server/database-errors.ts`
  - `src/server/repositories/*` (replaced by `src/server/supabase/*`)
  - `src/server/admin-backend.ts` (or reduce to a stub)
  - `src/lib/admin-auth.ts`
- **Rewrite**:
  - `middleware.ts`
  - `src/server/auth.ts`, `src/server/installation.ts`, `src/server/public-content.ts`
  - `src/app/install/actions.ts`, `src/app/install/page.tsx`, `src/app/install/install-form.tsx`
  - `src/app/(admin)/admin/login/actions.ts`
  - `src/app/(admin)/admin/actions.ts`
  - `src/app/(admin)/admin/compose/post/actions.ts`, `src/app/(admin)/admin/compose/update/actions.ts`
  - `src/app/(admin)/admin/categories/actions.ts`, `src/app/(admin)/admin/tags/actions.ts`
  - `src/app/(admin)/admin/settings/actions.ts`
  - `src/app/(admin)/admin/utils.ts`, `src/app/(admin)/admin/ui.tsx`, `src/app/(admin)/admin/workbench/page.tsx`
  - `src/app/rss.xml/route.ts`, `src/app/sitemap.xml/route.ts` (repoint to the new Supabase read layer)
  - `src/app/(site)/layout.tsx` and other site pages consuming `server/public-content.ts`
  - `src/components/admin-login-dialog.tsx`
  - `src/lib/tiptap-utils.ts:handleImageUpload`
  - `README.md`, `docs/architecture.md`, `docs/roadmap.md`, `docs/rss-seo-plan.md`
- **Add**:
  - `supabase/migrations/*.sql`
  - `supabase/seed.sql` (optional)
  - `src/lib/supabase/{browser,server,anon,admin,upload}.ts`
  - `src/types/database.ts` (generated)
  - `src/types/domain.ts`
  - `src/server/supabase/*.ts` (data access modules)

## Recommended implementation order

1. Add Supabase foundation, env handling, SQL migrations, and generated DB types.
2. Replace auth/bootstrap/middleware before touching most admin actions.
3. Replace repository layer and remove Prisma types from app code.
4. Implement Storage upload and asset metadata flow.
5. Delete Prisma artifacts and rewrite docs/scripts.
6. Run full validation against a fresh Supabase project.

## High-risk notes

- This is a **large, cross-cutting rewrite**; intermediate commits will be partially broken. Prefer feature branches or stepwise migration commits over one mega-commit.
- **Integer→UUID refactor** touches every admin route that validates `/^\d+$/` or casts `Number(id)`. Grep before declaring Workstream 4 done.
- **Revision-table migration** replaces every snapshot helper (`parsePublishedSnapshot`, `parseDraftSnapshot`, `snapshotReferencesCategory`, `stripCategoryFromSnapshot`, `stripTagFromSnapshot`, `buildDraftSnapshot`, ...). Audit `posts.ts`, `updates.ts`, `categories.ts`, `tags.ts` before closing the workstream.
- **Remote-only workflow** means migrations cannot be tested locally. Make each migration idempotent where possible; apply against a dev Supabase project before promoting.
- **ISR behavior depends on the server client shape**: if the public-read server client accidentally carries user cookies, Next.js flags the page as dynamic and ISR silently degrades. Keep the anon server client distinct from the cookie-aware one.
- **Email confirmation** must be disabled at the project level, or every `admin.createUser` call sets `email_confirm: true`. Forgetting this breaks the install flow.
- **RLS must be enabled on every domain table at creation time**; disabled RLS + service role on the server is a common accidental footgun.
- The current asset upload path is a stub; Supabase Storage becomes the first real production implementation.

## Expected deliverables

- A Supabase-native codebase with no Prisma runtime/schema usage
- Official-style SSR auth integration and middleware
- SQL migrations plus generated database types
- Real Storage-backed asset upload
- Updated docs/scripts/env guidance with no Prisma-era instructions
