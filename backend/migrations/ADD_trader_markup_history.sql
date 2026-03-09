-- История изменений наценок (для трейдера)
CREATE TABLE IF NOT EXISTS trader_markup_history (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL,  -- create, update, delete
    entity_type VARCHAR(20) NOT NULL,  -- supplier, category
    entity_id INT NOT NULL,
    entity_name VARCHAR(255),
    old_markup_percent FLOAT,
    new_markup_percent FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_trader_markup_history_company ON trader_markup_history(company_id);
CREATE INDEX IF NOT EXISTS ix_trader_markup_history_created ON trader_markup_history(created_at DESC);
