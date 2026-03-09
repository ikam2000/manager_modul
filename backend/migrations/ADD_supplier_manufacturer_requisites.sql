-- Расширение реквизитов поставщиков и производителей
-- psql -U ikamdocs -d ikamdocs -f migrations/ADD_supplier_manufacturer_requisites.sql

-- suppliers: полноценные реквизиты компании + адреса отгрузки/поставки
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS kpp VARCHAR(9);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS ogrn VARCHAR(15);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS legal_address VARCHAR(512);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_bik VARCHAR(9);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_account VARCHAR(20);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_corr VARCHAR(20);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS delivery_address VARCHAR(512);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supply_address VARCHAR(512);

-- manufacturers: полноценные реквизиты
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS inn VARCHAR(12);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS kpp VARCHAR(9);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS ogrn VARCHAR(15);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS legal_address VARCHAR(512);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS bank_bik VARCHAR(9);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS bank_account VARCHAR(20);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS bank_corr VARCHAR(20);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS delivery_address VARCHAR(512);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS supply_address VARCHAR(512);
