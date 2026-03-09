-- Демо-план и лимиты по сущностям для тарифов
-- psql -U ikamdocs -d ikamdocs -f migrations/ADD_demo_and_limits.sql

-- Добавляем лимиты в plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_nomenclature INT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_suppliers INT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_manufacturers INT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_customers INT;

-- Вставляем план "Демо" если его нет
INSERT INTO plans (name, price_monthly, price_yearly, created_at, max_nomenclature, max_suppliers, max_manufacturers, max_customers, max_users, max_storage_mb, is_active)
SELECT 'Демо', 0, 0, NOW(), 50, 10, 10, 10, 5, 256, true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Демо');
