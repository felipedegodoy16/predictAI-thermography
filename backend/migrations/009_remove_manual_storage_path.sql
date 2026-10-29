ALTER TABLE equipment
    DROP COLUMN IF EXISTS manual_storage_path,
    DROP COLUMN IF EXISTS manual_uploaded_at;
