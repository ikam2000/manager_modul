-- Профили маппинга колонок и логи синхронизаций (домен импорта)
-- Позволяет сохранять настройки маппинга для повторного использования

CREATE TABLE IF NOT EXISTS mapping_profiles (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  profile_type TEXT NOT NULL DEFAULT 'nomenclature',
  config JSON NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  updated_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS idx_mapping_profiles_company_id ON mapping_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_mapping_profiles_profile_type ON mapping_profiles(profile_type);

-- Расширенный лог синхронизаций (дополняет import_jobs для API-синков)
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id INT REFERENCES suppliers(id) ON DELETE SET NULL,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  finished_at TIMESTAMP,
  rows_created INT DEFAULT 0,
  rows_updated INT DEFAULT 0,
  rows_failed INT DEFAULT 0,
  error_message TEXT,
  extra JSON
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_company_id ON sync_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_supplier_id ON sync_logs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);
