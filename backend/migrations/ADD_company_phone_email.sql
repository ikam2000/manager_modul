-- Добавить phone, email, address, contact_person в companies
-- psql -U ikamdocs -d ikamdocs -f migrations/ADD_company_phone_email.sql

ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address VARCHAR(512);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
