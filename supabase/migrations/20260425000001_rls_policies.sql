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

CREATE POLICY "admin_profiles_update_self"
  ON admin_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "admin_profiles_delete_self"
  ON admin_profiles FOR DELETE
  TO authenticated
  USING (id = auth.uid());

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
