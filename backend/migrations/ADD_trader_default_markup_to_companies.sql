-- Phase 1: Add default_markup_percent to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_markup_percent FLOAT DEFAULT 0;
