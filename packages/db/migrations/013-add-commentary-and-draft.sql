-- Migration: add-commentary-and-draft
-- Adds specialized fields for AI analysis and reply suggestions

ALTER TABLE collected_posts ADD COLUMN commentary TEXT;
ALTER TABLE collected_posts ADD COLUMN reply_draft TEXT;
