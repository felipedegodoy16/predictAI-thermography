CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(160) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO accounts (name, slug)
VALUES ('Conta TESTE', 'teste')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT;

UPDATE users AS u
SET account_id = accounts.id
FROM accounts
WHERE accounts.slug = 'teste'
  AND u.account_id IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM user_roles AS ur
      JOIN roles AS r ON r.id = ur.role_id
      WHERE ur.user_id = u.id AND r.code = 'master_admin'
  );

ALTER TABLE equipment
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT;

UPDATE equipment AS e
SET account_id = accounts.id
FROM accounts
WHERE accounts.slug = 'teste' AND e.account_id IS NULL;

ALTER TABLE equipment ALTER COLUMN account_id SET NOT NULL;

ALTER TABLE service_orders
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT;

UPDATE service_orders AS so
SET account_id = accounts.id
FROM accounts
WHERE accounts.slug = 'teste' AND so.account_id IS NULL;

ALTER TABLE service_orders ALTER COLUMN account_id SET NOT NULL;

ALTER TABLE thermographic_images
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT;

UPDATE thermographic_images AS images
SET account_id = equipment.account_id
FROM equipment
WHERE equipment.id = images.equipment_id AND images.account_id IS NULL;

ALTER TABLE thermographic_images ALTER COLUMN account_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_account_id_id
    ON users (account_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_equipment_account_id_id
    ON equipment (account_id, id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_service_orders_client_account'
    ) THEN
        ALTER TABLE service_orders
            ADD CONSTRAINT fk_service_orders_client_account
            FOREIGN KEY (account_id, client_id) REFERENCES users (account_id, id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_service_orders_technician_account'
    ) THEN
        ALTER TABLE service_orders
            ADD CONSTRAINT fk_service_orders_technician_account
            FOREIGN KEY (account_id, technician_id) REFERENCES users (account_id, id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_service_orders_equipment_account'
    ) THEN
        ALTER TABLE service_orders
            ADD CONSTRAINT fk_service_orders_equipment_account
            FOREIGN KEY (account_id, equipment_id) REFERENCES equipment (account_id, id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_thermographic_images_equipment_account'
    ) THEN
        ALTER TABLE thermographic_images
            ADD CONSTRAINT fk_thermographic_images_equipment_account
            FOREIGN KEY (account_id, equipment_id) REFERENCES equipment (account_id, id)
            ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_users_account_created
    ON users (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_equipment_account_created
    ON equipment (account_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS ix_service_orders_account_created
    ON service_orders (account_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS ix_thermographic_images_account_created
    ON thermographic_images (account_id, created_at DESC, id DESC);

INSERT INTO roles (code, name)
VALUES ('master_admin', 'Master Administrator')
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (code, description)
VALUES
    ('accounts:read', 'View all customer accounts'),
    ('accounts:write', 'Create and manage customer accounts')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_code)
SELECT roles.id, permissions.code
FROM roles CROSS JOIN permissions
WHERE roles.code = 'master_admin'
ON CONFLICT DO NOTHING;
