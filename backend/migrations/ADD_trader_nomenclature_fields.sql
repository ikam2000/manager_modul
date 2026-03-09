-- Phase 1: Add trader fields to nomenclature
-- barcode, purchase_price, markup_percent, stock, expiry_date, supplier_id - all nullable

ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS purchase_price FLOAT;
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS markup_percent FLOAT;
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS stock FLOAT;
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS supplier_id INT REFERENCES suppliers(id);
