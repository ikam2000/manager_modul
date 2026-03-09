-- Таблица логов импорта/синхронизаций (домен импорта)
-- psql -U ikamdocs -d ikamdocs -f migrations/ADD_import_jobs.sql

CREATE TABLE IF NOT EXISTS import_jobs (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  finished_at TIMESTAMP,
  triggered_by_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  stats JSONB,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_company_id ON import_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_job_type ON import_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_import_jobs_started_at ON import_jobs(started_at DESC);
