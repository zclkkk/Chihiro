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

-- RLS: site_settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_settings_public_select"
  ON site_settings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "site_settings_admin_update"
  ON site_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

CREATE POLICY "site_settings_admin_insert"
  ON site_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

-- RLS: admin_profiles
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_profiles_select_self"
  ON admin_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "admin_profiles_insert_existing_admin"
  ON admin_profiles FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- RLS: categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public_select"
  ON categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "categories_admin_all"
  ON categories FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- RLS: tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_public_select"
  ON tags FOR SELECT
  TO public
  USING (true);

CREATE POLICY "tags_admin_all"
  ON tags FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- RLS: posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_public_select_published"
  ON posts FOR SELECT
  TO public
  USING (status = 'published');

CREATE POLICY "posts_admin_all"
  ON posts FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- RLS: post_tags
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_tags_public_select"
  ON post_tags FOR SELECT
  TO public
  USING (EXISTS (SELECT 1 FROM posts WHERE posts.id = post_tags.post_id AND posts.status = 'published'));

CREATE POLICY "post_tags_admin_all"
  ON post_tags FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- RLS: post_revisions
ALTER TABLE post_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_revisions_admin_all"
  ON post_revisions FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- RLS: updates
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "updates_public_select_published"
  ON updates FOR SELECT
  TO public
  USING (status = 'published');

CREATE POLICY "updates_admin_all"
  ON updates FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- RLS: update_revisions
ALTER TABLE update_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "update_revisions_admin_all"
  ON update_revisions FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- RLS: assets
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assets_public_select"
  ON assets FOR SELECT
  TO public
  USING (true);

CREATE POLICY "assets_admin_insert"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

CREATE POLICY "assets_admin_update"
  ON assets FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

CREATE POLICY "assets_admin_delete"
  ON assets FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- Storage bucket: site-assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public SELECT
CREATE POLICY "site_assets_public_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'site-assets');

-- Storage policies: admin INSERT/UPDATE/DELETE
CREATE POLICY "site_assets_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'site-assets'
    AND EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY "site_assets_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY "site_assets_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

-- RPC: delete_category (replaces Prisma $transaction for category deletion)
CREATE OR REPLACE FUNCTION delete_category(p_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE posts SET category_id = NULL WHERE category_id = p_id;

  UPDATE post_revisions
  SET category_id = NULL
  WHERE category_id = p_id;

  DELETE FROM categories WHERE id = p_id;
END;
$$;

-- RPC: delete_tag (replaces Prisma $transaction for tag deletion)
CREATE OR REPLACE FUNCTION delete_tag(p_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM post_tags WHERE tag_id = p_id;

  UPDATE post_revisions pr
  SET tags_snapshot = COALESCE(
    (SELECT jsonb_agg(elem)
     FROM jsonb_array_elements(pr.tags_snapshot) elem
     WHERE elem->>'id' != p_id::text),
    '[]'::jsonb
  )
  WHERE pr.id IN (
    SELECT pr2.id FROM post_revisions pr2
    WHERE pr2.tags_snapshot @> jsonb_build_array(jsonb_build_object('id', p_id::text))
  );

  DELETE FROM tags WHERE id = p_id;
END;
$$;

-- RPC: sync_post_tags (atomic replace of post's tags, replaces Prisma $transaction)
CREATE OR REPLACE FUNCTION sync_post_tags(p_post_id uuid, p_tag_ids uuid[])
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM post_tags WHERE post_id = p_post_id;

  INSERT INTO post_tags (post_id, tag_id)
  SELECT p_post_id, unnest(p_tag_ids)
  ON CONFLICT DO NOTHING;
END;
$$;

-- RPC: list_published_post_categories_for_navigation
CREATE OR REPLACE FUNCTION list_published_post_categories_for_navigation(p_limit integer DEFAULT 5)
RETURNS TABLE(
  slug text,
  label text,
  content_count bigint,
  posts jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.slug,
    c.name AS label,
    COUNT(p.id)::bigint AS content_count,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'title', p.title,
          'slug', p.slug
        )
        ORDER BY p.published_at DESC
      ) FILTER (WHERE p.id IS NOT NULL),
      '[]'::jsonb
    ) AS posts
  FROM categories c
  LEFT JOIN posts p ON p.category_id = c.id AND p.status = 'published'
  GROUP BY c.id, c.slug, c.name
  HAVING COUNT(p.id) > 0
  ORDER BY c.name ASC;

  RETURN QUERY
  SELECT
    'uncategorized'::text AS slug,
    'Uncategorized'::text AS label,
    COUNT(p.id)::bigint AS content_count,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'title', p.title,
          'slug', p.slug
        )
        ORDER BY p.published_at DESC
      ) FILTER (WHERE p.id IS NOT NULL),
      '[]'::jsonb
    ) AS posts
  FROM posts p
  WHERE p.category_id IS NULL AND p.status = 'published'
  HAVING COUNT(p.id) > 0;
END;
$$;
