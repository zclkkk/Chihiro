-- Rebuild Post primary keys as sequential integers while preserving existing rows.

CREATE TEMP TABLE "_PostIdMap" (
  "oldId" text PRIMARY KEY,
  "newId" integer NOT NULL UNIQUE
);

INSERT INTO "_PostIdMap" ("oldId", "newId")
SELECT
  p."id",
  row_number() OVER (ORDER BY p."createdAt", p."id")::integer
FROM "Post" p;

ALTER TABLE "PostTag" DROP CONSTRAINT IF EXISTS "PostTag_postId_fkey";

ALTER TABLE "Post"
  ADD COLUMN "postNumber" integer;

UPDATE "Post" p
SET "postNumber" = m."newId"
FROM "_PostIdMap" m
WHERE p."id" = m."oldId";

CREATE SEQUENCE IF NOT EXISTS "Post_id_seq";

SELECT setval(
  '"Post_id_seq"',
  COALESCE((SELECT MAX("postNumber") FROM "Post"), 0),
  true
);

ALTER SEQUENCE "Post_id_seq" OWNED BY "Post"."postNumber";

ALTER TABLE "Post"
  ALTER COLUMN "postNumber"
  SET DEFAULT nextval('"Post_id_seq"'::regclass);

UPDATE "PostTag" pt
SET "postId" = m."newId"::text
FROM "_PostIdMap" m
WHERE pt."postId" = m."oldId";

ALTER TABLE "PostTag"
  ALTER COLUMN "postId"
  TYPE integer
  USING "postId"::integer;

ALTER TABLE "Post" DROP CONSTRAINT "Post_pkey";

ALTER TABLE "Post"
  DROP COLUMN "id";

ALTER TABLE "Post"
  RENAME COLUMN "postNumber" TO "id";

ALTER TABLE "Post"
  ADD PRIMARY KEY ("id");

ALTER TABLE "Post"
  ALTER COLUMN "id"
  SET DEFAULT nextval('"Post_id_seq"'::regclass);

ALTER SEQUENCE "Post_id_seq" OWNED BY "Post"."id";

ALTER TABLE "PostTag"
  ADD CONSTRAINT "PostTag_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "_PostIdMap";
