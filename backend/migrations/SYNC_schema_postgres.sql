-- Синхронизация схемы PostgreSQL с моделями приложения
-- Запуск: sudo -u postgres psql -d ikamdocs -f migrations/SYNC_schema_postgres.sql

-- users
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512);
ALTER TABLE users ADD COLUMN IF NOT EXISTS impersonated_by INTEGER REFERENCES users(id);

-- companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url VARCHAR(512);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS inn VARCHAR(12);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS kpp VARCHAR(9);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ogrn VARCHAR(15);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_address VARCHAR(512);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_bik VARCHAR(9);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_account VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_corr VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS payment_purpose VARCHAR(1024);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now();
ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES plans(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_type VARCHAR(32);

-- nomenclature
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS package_number VARCHAR(100);
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS question_sheet_no VARCHAR(100);
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS price FLOAT;
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS extra_fields JSONB;
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS extra_fields JSONB;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- manufacturers
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS extra_fields JSONB;
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- supplies
ALTER TABLE supplies ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE supplies ADD COLUMN IF NOT EXISTS extra_fields JSONB;
ALTER TABLE supplies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();
ALTER TABLE supplies ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS extra_fields JSONB;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- contract_appendices
ALTER TABLE contract_appendices ADD COLUMN IF NOT EXISTS extra_fields JSONB;
ALTER TABLE contract_appendices ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
