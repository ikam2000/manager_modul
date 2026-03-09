-- Сущность заказчиков (Customer) и связи поставщик-заказчик, поставщик-производитель
-- psql -U ikamdocs -d ikamdocs -f migrations/ADD_customers_and_links.sql

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    inn VARCHAR(12),
    kpp VARCHAR(9),
    address VARCHAR(512),
    phone VARCHAR(50),
    email VARCHAR(255),
    legal_address VARCHAR(512),
    delivery_address VARCHAR(512),
    supply_address VARCHAR(512),
    bank_name VARCHAR(255),
    bank_bik VARCHAR(9),
    bank_account VARCHAR(20),
    bank_corr VARCHAR(20),
    contact_person VARCHAR(255),
    extra_fields JSONB,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);

-- Поставщик <-> Заказчики (many-to-many)
CREATE TABLE IF NOT EXISTS supplier_customers (
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    PRIMARY KEY (supplier_id, customer_id)
);

-- Поставщик <-> Производители (many-to-many)
CREATE TABLE IF NOT EXISTS supplier_manufacturers (
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    manufacturer_id INTEGER NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
    PRIMARY KEY (supplier_id, manufacturer_id)
);

-- Заказчик <-> Поставщики
CREATE TABLE IF NOT EXISTS customer_suppliers (
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    PRIMARY KEY (customer_id, supplier_id)
);

-- Заказчик <-> Производители
CREATE TABLE IF NOT EXISTS customer_manufacturers (
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    manufacturer_id INTEGER NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
    PRIMARY KEY (customer_id, manufacturer_id)
);
