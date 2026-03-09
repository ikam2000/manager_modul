-- Вложения к тикетам и предложениям (до 10 МБ)
-- psql -U ikamdocs -d ikamdocs -f migrations/ADD_ticket_suggestion_attachments.sql

CREATE TABLE IF NOT EXISTS ticket_attachments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    reply_id INTEGER REFERENCES ticket_replies(id) ON DELETE CASCADE,
    storage_path VARCHAR(512) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    size_bytes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suggestion_attachments (
    id SERIAL PRIMARY KEY,
    suggestion_id INTEGER NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
    update_id INTEGER REFERENCES suggestion_updates(id) ON DELETE CASCADE,
    storage_path VARCHAR(512) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    size_bytes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
