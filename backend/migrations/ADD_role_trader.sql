-- Добавить значение 'trader' в enum role (PostgreSQL)
-- psql -U postgres -d ikamdocs -f migrations/ADD_role_trader.sql

ALTER TYPE role ADD VALUE IF NOT EXISTS 'trader';
