-- Добавить колонку delivery_date в supplies (если отсутствует)
-- Причина: UndefinedColumnError: column supplies.delivery_date does not exist
-- Запуск на сервере:
--   sudo -u postgres psql -d ikamdocs -f /var/ikamdocs/backend/migrations/FIX_supplies_delivery_date.sql
-- либо через psql:
--   psql -U <user> -d ikamdocs -c "ALTER TABLE supplies ADD COLUMN IF NOT EXISTS delivery_date DATE;"

ALTER TABLE supplies ADD COLUMN IF NOT EXISTS delivery_date DATE;
