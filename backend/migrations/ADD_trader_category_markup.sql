-- Phase 1: trader_category_markup table
CREATE TABLE IF NOT EXISTS trader_category_markup (
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    markup_percent FLOAT NOT NULL,
    PRIMARY KEY (company_id, category_id)
);

CREATE INDEX IF NOT EXISTS ix_trader_category_markup_company ON trader_category_markup(company_id);
