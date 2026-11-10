ALTER TABLE equipment
    ADD COLUMN IF NOT EXISTS capture_interval_seconds BIGINT NOT NULL DEFAULT 3600
    CHECK (capture_interval_seconds >= 60 AND capture_interval_seconds % 60 = 0);
