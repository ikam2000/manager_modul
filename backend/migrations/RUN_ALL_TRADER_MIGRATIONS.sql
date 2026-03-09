-- Выполнить на сервере: sudo -u postgres psql -d ikamdocs -f RUN_ALL_TRADER_MIGRATIONS.sql
-- Объединяет все недостающие trader-миграции в один файл

-- 1. ADD_trader_nomenclature_fields
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS purchase_price FLOAT;
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS markup_percent FLOAT;
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS stock FLOAT;
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS supplier_id INT REFERENCES suppliers(id);

-- 2. ADD_trader_supplier_markup
CREATE TABLE IF NOT EXISTS trader_supplier_markup (
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    supplier_id INT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    markup_percent FLOAT NOT NULL,
    PRIMARY KEY (company_id, supplier_id)
);
CREATE INDEX IF NOT EXISTS ix_trader_supplier_markup_company ON trader_supplier_markup(company_id);

-- 3. ADD_trader_category_markup
CREATE TABLE IF NOT EXISTS trader_category_markup (
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    markup_percent FLOAT NOT NULL,
    PRIMARY KEY (company_id, category_id)
);
CREATE INDEX IF NOT EXISTS ix_trader_category_markup_company ON trader_category_markup(company_id);

-- 4. ADD_trader_default_markup_to_companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_markup_percent FLOAT DEFAULT 0;
