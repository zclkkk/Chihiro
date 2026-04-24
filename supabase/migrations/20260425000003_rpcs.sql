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
