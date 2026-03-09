-- Phase 1: trader_supplier_markup table
CREATE TABLE IF NOT EXISTS trader_supplier_markup (
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    supplier_id INT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    markup_percent FLOAT NOT NULL,
    PRIMARY KEY (company_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS ix_trader_supplier_markup_company ON trader_supplier_markup(company_id);
