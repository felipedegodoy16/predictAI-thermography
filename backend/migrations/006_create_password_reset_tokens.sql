CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash CHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user_id
    ON password_reset_tokens (user_id);

CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_expires_at
    ON password_reset_tokens (expires_at);
