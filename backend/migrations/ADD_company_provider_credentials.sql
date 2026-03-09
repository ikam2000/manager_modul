-- Company-provider OAuth credentials (per-company Shopify, etc.)
-- psql -U ikamdocs -d ikamdocs -f migrations/ADD_company_provider_credentials.sql

CREATE TABLE IF NOT EXISTS company_provider_credentials (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  provider VARCHAR(50) NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE (company_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_company_provider_credentials_company ON company_provider_credentials(company_id);

-- Права для пользователя приложения
GRANT ALL ON company_provider_credentials TO ikamdocs;
GRANT USAGE, SELECT ON SEQUENCE company_provider_credentials_id_seq TO ikamdocs;
