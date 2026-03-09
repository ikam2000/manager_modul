-- Trader extended fields: supplier_sku, brand, unit, pack_size, moq, price_currency, days_to_expiry

ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS supplier_sku VARCHAR(100);
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS brand VARCHAR(255);
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS pack_size VARCHAR(100);
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS moq FLOAT;
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS price_currency VARCHAR(10);
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS days_to_expiry FLOAT;
COMMENT ON COLUMN nomenclature.supplier_sku IS 'Supplier SKU / артикул поставщика';
COMMENT ON COLUMN nomenclature.brand IS 'Brand / бренд';
COMMENT ON COLUMN nomenclature.unit IS 'Unit: шт/короб/кг/литр';
COMMENT ON COLUMN nomenclature.pack_size IS 'Pack size: 12 шт в коробке';
COMMENT ON COLUMN nomenclature.moq IS 'Minimum order quantity';
COMMENT ON COLUMN nomenclature.price_currency IS 'Price currency: RUB, USD, EUR';
COMMENT ON COLUMN nomenclature.days_to_expiry IS 'Days to expiry (alternative to expiry_date)';
