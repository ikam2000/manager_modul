-- Права для пользователя приложения на таблицы трейдера
-- Выполнить: sudo -u postgres psql -d ikamdocs -f migrations/ADD_trader_tables_grants.sql

GRANT ALL ON trader_supplier_markup TO ikamdocs;
GRANT ALL ON trader_category_markup TO ikamdocs;
GRANT ALL ON trader_markup_history TO ikamdocs;
GRANT USAGE, SELECT ON SEQUENCE trader_markup_history_id_seq TO ikamdocs;
