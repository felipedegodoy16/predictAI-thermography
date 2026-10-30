ALTER TABLE equipment
    ADD COLUMN IF NOT EXISTS yellow_limit_c DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS red_limit_c DOUBLE PRECISION;

ALTER TABLE equipment
    ADD CONSTRAINT equipment_thermal_limits_ordered
    CHECK (
        (yellow_limit_c IS NULL AND red_limit_c IS NULL)
        OR (yellow_limit_c IS NOT NULL AND red_limit_c IS NOT NULL
            AND red_limit_c > yellow_limit_c)
    );
