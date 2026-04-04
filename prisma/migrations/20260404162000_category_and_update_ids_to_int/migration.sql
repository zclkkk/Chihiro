-- Rebuild Category and Update primary keys as sequential integers while preserving existing rows.

CREATE TEMP TABLE "_CategoryIdMap" (
  "oldId" text PRIMARY KEY,
  "newId" integer NOT NULL UNIQUE
);

INSERT INTO "_CategoryIdMap" ("oldId", "newId")
SELECT
  c."id",
  row_number() OVER (ORDER BY c."createdAt", c."id")::integer
FROM "Category" c;

CREATE TEMP TABLE "_UpdateIdMap" (
  "oldId" text PRIMARY KEY,
  "newId" integer NOT NULL UNIQUE
);

INSERT INTO "_UpdateIdMap" ("oldId", "newId")
SELECT
  u."id",
  row_number() OVER (ORDER BY u."createdAt", u."id")::integer
FROM "Update" u;

ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_categoryId_fkey";
ALTER TABLE "Update" DROP CONSTRAINT IF EXISTS "Update_categoryId_fkey";
ALTER TABLE "UpdateTag" DROP CONSTRAINT IF EXISTS "UpdateTag_updateId_fkey";

UPDATE "Post" p
SET "categoryId" = m."newId"::text
FROM "_CategoryIdMap" m
WHERE p."categoryId" = m."oldId";

UPDATE "Update" u
SET "categoryId" = m."newId"::text
FROM "_CategoryIdMap" m
WHERE u."categoryId" = m."oldId";

UPDATE "UpdateTag" ut
SET "updateId" = m."newId"::text
FROM "_UpdateIdMap" m
WHERE ut."updateId" = m."oldId";

UPDATE "Post" p
SET "publishedSnapshot" = jsonb_set(
  p."publishedSnapshot"::jsonb,
  '{category,id}',
  to_jsonb(m."newId"),
  true
)
FROM "_CategoryIdMap" m
WHERE (p."publishedSnapshot"::jsonb -> 'category' ->> 'id') = m."oldId";

UPDATE "Post" p
SET "draftSnapshot" = jsonb_set(
  p."draftSnapshot"::jsonb,
  '{category,id}',
  to_jsonb(m."newId"),
  true
)
FROM "_CategoryIdMap" m
WHERE (p."draftSnapshot"::jsonb -> 'category' ->> 'id') = m."oldId";

ALTER TABLE "Post"
  ALTER COLUMN "categoryId"
  TYPE integer
  USING "categoryId"::integer;

ALTER TABLE "Update"
  ALTER COLUMN "categoryId"
  TYPE integer
  USING "categoryId"::integer;

ALTER TABLE "UpdateTag"
  ALTER COLUMN "updateId"
  TYPE integer
  USING "updateId"::integer;

ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_pkey";

ALTER TABLE "Category"
  ADD COLUMN "categoryNumber" integer;

UPDATE "Category" c
SET "categoryNumber" = m."newId"
FROM "_CategoryIdMap" m
WHERE c."id" = m."oldId";

CREATE SEQUENCE IF NOT EXISTS "Category_id_seq";

SELECT setval(
  '"Category_id_seq"',
  COALESCE((SELECT MAX("categoryNumber") FROM "Category"), 0),
  true
);

ALTER SEQUENCE "Category_id_seq" OWNED BY "Category"."categoryNumber";

ALTER TABLE "Category"
  ALTER COLUMN "categoryNumber"
  SET DEFAULT nextval('"Category_id_seq"'::regclass);

ALTER TABLE "Category" DROP COLUMN "id";

ALTER TABLE "Category"
  RENAME COLUMN "categoryNumber" TO "id";

ALTER TABLE "Category"
  ADD PRIMARY KEY ("id");

ALTER TABLE "Category"
  ALTER COLUMN "id"
  SET DEFAULT nextval('"Category_id_seq"'::regclass);

ALTER SEQUENCE "Category_id_seq" OWNED BY "Category"."id";

ALTER TABLE "Update" DROP CONSTRAINT IF EXISTS "Update_pkey";

ALTER TABLE "Update"
  ADD COLUMN "updateNumber" integer;

UPDATE "Update" u
SET "updateNumber" = m."newId"
FROM "_UpdateIdMap" m
WHERE u."id" = m."oldId";

CREATE SEQUENCE IF NOT EXISTS "Update_id_seq";

SELECT setval(
  '"Update_id_seq"',
  COALESCE((SELECT MAX("updateNumber") FROM "Update"), 0),
  true
);

ALTER SEQUENCE "Update_id_seq" OWNED BY "Update"."updateNumber";

ALTER TABLE "Update"
  ALTER COLUMN "updateNumber"
  SET DEFAULT nextval('"Update_id_seq"'::regclass);

ALTER TABLE "Update" DROP COLUMN "id";

ALTER TABLE "Update"
  RENAME COLUMN "updateNumber" TO "id";

ALTER TABLE "Update"
  ADD PRIMARY KEY ("id");

ALTER TABLE "Update"
  ALTER COLUMN "id"
  SET DEFAULT nextval('"Update_id_seq"'::regclass);

ALTER SEQUENCE "Update_id_seq" OWNED BY "Update"."id";

ALTER TABLE "Post"
  ADD CONSTRAINT "Post_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Update"
  ADD CONSTRAINT "Update_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UpdateTag"
  ADD CONSTRAINT "UpdateTag_updateId_fkey"
  FOREIGN KEY ("updateId") REFERENCES "Update"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "_CategoryIdMap";
DROP TABLE "_UpdateIdMap";
