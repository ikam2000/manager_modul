-- Добавить колонку avatar_url в таблицу users
-- Выполнить на сервере: psql -d ikamdocs -U ikamdocs -f migrations/ADD_avatar_url_to_users.sql
-- Или: psql $DATABASE_URL -f migrations/ADD_avatar_url_to_users.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512);
