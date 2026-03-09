-- API keys: scope и expires_at
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS scope VARCHAR(100) DEFAULT 'read,write';
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
