-- Реестр организаций по ИНН (кэш DaData и ручной ввод)
-- psql -U ikamdocs -d ikamdocs -f migrations/ADD_entity_registry.sql

CREATE TABLE IF NOT EXISTS entity_registry (
  inn VARCHAR(12) PRIMARY KEY,
  name VARCHAR(512),
  kpp VARCHAR(9),
  ogrn VARCHAR(15),
  legal_address VARCHAR(512),
  address VARCHAR(512),
  phone VARCHAR(50),
  email VARCHAR(255),
  bank_name VARCHAR(255),
  bank_bik VARCHAR(9),
  bank_account VARCHAR(20),
  bank_corr VARCHAR(20),
  contact_person VARCHAR(255),
  source VARCHAR(20) DEFAULT 'dadata',
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entity_registry_updated ON entity_registry(updated_at);
