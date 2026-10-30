ALTER TABLE thermographic_images
    ADD COLUMN IF NOT EXISTS thermal_overlay_file_name VARCHAR(255);
