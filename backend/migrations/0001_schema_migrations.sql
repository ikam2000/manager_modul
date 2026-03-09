-- Реестр применённых миграций. Запускается первым; migrate.sh записывает сюда версии.
-- psql -d ikamdocs -f migrations/0001_schema_migrations.sql

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);
