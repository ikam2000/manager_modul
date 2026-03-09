-- Сессии: IP, User-Agent, регион для отображения супер-админу.
-- psql -d ikamdocs -f migrations/ADD_sessions_ip_user_agent_region.sql

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent VARCHAR(512);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS region VARCHAR(255);
