-- Лимиты тарифов трейдера: Start 30/1000, Business 50/1500, Pro 100/2500 (Trial остаётся 3/50).
-- psql -d ikamdocs -f migrations/UPDATE_trader_plans_limits.sql

UPDATE plans SET max_suppliers = 30, max_nomenclature_per_supplier = 1000 WHERE name = 'Trader Start' AND plan_type = 'trader';
UPDATE plans SET max_suppliers = 50, max_nomenclature_per_supplier = 1500 WHERE name = 'Trader Business' AND plan_type = 'trader';
UPDATE plans SET max_suppliers = 100, max_nomenclature_per_supplier = 2500 WHERE name = 'Trader Pro' AND plan_type = 'trader';
