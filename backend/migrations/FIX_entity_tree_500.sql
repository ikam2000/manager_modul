-- Fix for entity-tree 500: add missing columns
-- psql -U ikamdocs -d ikamdocs -f migrations/FIX_entity_tree_500.sql

-- companies: company_type (supplier|customer) for registration
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_type VARCHAR(32);

-- manufacturers: updated_at (required by SQLAlchemy model)
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();

-- customers: ensure all columns exist (table may have been created with partial schema)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS inn VARCHAR(12);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS kpp VARCHAR(9);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address VARCHAR(512);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS legal_address VARCHAR(512);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS delivery_address VARCHAR(512);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS supply_address VARCHAR(512);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_bik VARCHAR(9);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_account VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_corr VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS extra_fields JSONB;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now();
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
