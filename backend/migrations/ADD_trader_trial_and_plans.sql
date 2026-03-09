-- Step 1: trial для трейдера, планы трейдера (30000/50000/70000)
-- psql -d ikamdocs -f migrations/ADD_trader_trial_and_plans.sql

-- 1. trial_start, trial_end на companies (для трейдера)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_start TIMESTAMP;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP;

-- 2. plan_type на plans: 'standard' | 'trader'
ALTER TABLE plans ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'standard';
UPDATE plans SET plan_type = 'standard' WHERE plan_type IS NULL;

-- 3. Планы трейдера (цена в копейках: 30000 руб = 3000000)
-- Trader Trial: 14 дней, 3 поставщика, 50 товаров
INSERT INTO plans (name, price_monthly, price_yearly, plan_type, max_nomenclature, max_suppliers, max_manufacturers, max_customers, max_users, max_storage_mb, is_active, created_at)
SELECT 'Trader Trial', 0, 0, 'trader', 50, 3, 10, 10, 2, 256, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Trader Trial' AND plan_type = 'trader');

-- Trader Start: 30000 руб/мес
INSERT INTO plans (name, price_monthly, price_yearly, plan_type, max_nomenclature, max_suppliers, max_manufacturers, max_customers, max_users, max_storage_mb, is_active, created_at)
SELECT 'Trader Start', 3000000, 30000000, 'trader', 300, 10, 50, 50, 5, 1024, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Trader Start' AND plan_type = 'trader');

-- Trader Business: 50000 руб/мес
INSERT INTO plans (name, price_monthly, price_yearly, plan_type, max_nomenclature, max_suppliers, max_manufacturers, max_customers, max_users, max_storage_mb, is_active, created_at)
SELECT 'Trader Business', 5000000, 50000000, 'trader', 1000, 25, 100, 100, 10, 2048, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Trader Business' AND plan_type = 'trader');

-- Trader Pro: 70000 руб/мес
INSERT INTO plans (name, price_monthly, price_yearly, plan_type, max_nomenclature, max_suppliers, max_manufacturers, max_customers, max_users, max_storage_mb, is_active, created_at)
SELECT 'Trader Pro', 7000000, 70000000, 'trader', 3000, 50, 200, 200, 20, 5120, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Trader Pro' AND plan_type = 'trader');
