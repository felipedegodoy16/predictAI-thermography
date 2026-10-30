CREATE TABLE IF NOT EXISTS thermographic_images (
    id BIGSERIAL PRIMARY KEY,
    equipment_id BIGINT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    original_file_name VARCHAR(255) NOT NULL,
    temperature_matrix_file_name VARCHAR(255) NOT NULL,
    visible_image_file_name VARCHAR(255) NOT NULL,
    thermal_image_file_name VARCHAR(255) NOT NULL,
    metadata_file_name VARCHAR(255) NOT NULL,
    analysis_metadata JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_thermographic_images_equipment_created
    ON thermographic_images (equipment_id, created_at DESC, id DESC);
