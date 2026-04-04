-- Add a draft snapshot for Update so published updates can preserve unpublished edits.

ALTER TABLE "Update"
ADD COLUMN IF NOT EXISTS "draftSnapshot" JSONB;
