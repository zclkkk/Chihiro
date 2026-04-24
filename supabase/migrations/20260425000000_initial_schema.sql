CREATE TABLE IF NOT EXISTS site_settings (
  id text PRIMARY KEY DEFAULT 'default',
  site_name text NOT NULL,
  site_description text NOT NULL,
  site_url text NOT NULL,
  locale text NOT NULL DEFAULT 'zh-CN',
  author_name text NOT NULL,
  author_avatar_url text,
  hero_intro text,
  summary text,
  motto text,
  email text,
  github_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  summary text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  content jsonb,
  content_html text,
  author_name text,
  published_at timestamptz,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  cover_asset_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS post_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('draft', 'published')),
  title text NOT NULL,
  slug text NOT NULL,
  summary text,
  content jsonb,
  content_html text,
  author_name text,
  published_at timestamptz,
  category_id uuid,
  cover_asset_id uuid,
  tags_snapshot jsonb DEFAULT '[]',
  saved_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '未命名动态',
  author_name text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  content jsonb,
  content_html text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS update_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('draft', 'published')),
  title text NOT NULL,
  author_name text,
  content jsonb,
  content_html text,
  published_at timestamptz,
  saved_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('image', 'video', 'file')),
  storage_path text NOT NULL UNIQUE,
  bucket text NOT NULL DEFAULT 'site-assets',
  alt text,
  mime_type text,
  size integer,
  width integer,
  height integer,
  duration integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_status_published_at ON posts(status, published_at);
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_post_revisions_post_id ON post_revisions(post_id);
CREATE INDEX IF NOT EXISTS idx_update_revisions_update_id ON update_revisions(update_id);
CREATE INDEX IF NOT EXISTS idx_updates_status_published_at ON updates(status, published_at);

ALTER TABLE posts
  ADD CONSTRAINT fk_posts_cover_asset
  FOREIGN KEY (cover_asset_id) REFERENCES assets(id) ON DELETE SET NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updates_updated_at
  BEFORE UPDATE ON updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
