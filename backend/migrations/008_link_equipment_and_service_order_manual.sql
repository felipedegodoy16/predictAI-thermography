ALTER TABLE equipment
    ADD COLUMN IF NOT EXISTS manual_file_name VARCHAR(255);

ALTER TABLE service_orders
    ADD COLUMN IF NOT EXISTS equipment_id BIGINT REFERENCES equipment(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_service_orders_equipment_id
    ON service_orders (equipment_id);
