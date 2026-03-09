-- Добавить колонку "Номер грузового места" в таблицу nomenclature
-- Выполнить: psql -d your_db -f migrations/ADD_package_number_to_nomenclature.sql
-- Или вручную в клиенте БД:
ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS package_number VARCHAR(100);
