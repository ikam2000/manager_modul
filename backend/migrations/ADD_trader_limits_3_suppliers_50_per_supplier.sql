-- Лимиты для трейдера: не более 3 поставщиков, не более 50 товаров по каждому поставщику.
-- psql -d ikamdocs -f migrations/ADD_trader_limits_3_suppliers_50_per_supplier.sql

ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_nomenclature_per_supplier INT;

-- Трейдер: 3 поставщика, 50 товаров по поставщику (остальной функционал без ограничений)
UPDATE plans SET max_suppliers = 3, max_nomenclature_per_supplier = 50 WHERE plan_type = 'trader';
