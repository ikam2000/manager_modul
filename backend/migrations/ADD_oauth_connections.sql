-- OAuth-подключения (Shopify, Wildberries, Ozon)
-- psql -U ikamdocs -d ikamdocs -f migrations/ADD_oauth_connections.sql

CREATE TABLE IF NOT EXISTS oauth_connections (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  provider VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  store_url VARCHAR(512),
  store_id VARCHAR(255),
  metadata_json TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_connections_company_provider ON oauth_connections(company_id, provider);
