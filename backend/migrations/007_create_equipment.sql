CREATE TABLE IF NOT EXISTS equipment (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    equipment_type VARCHAR(32) NOT NULL
        CHECK (equipment_type IN (
            'MOTOR_ELETRICO', 'BOMBA', 'PAINEL_ELETRICO', 'COMPRESSOR', 'OUTRO'
        )),
    manufacturer VARCHAR(120),
    model VARCHAR(120),
    serial_number VARCHAR(120),
    asset_tag VARCHAR(80) UNIQUE,
    location VARCHAR(200),
    criticality VARCHAR(16) NOT NULL DEFAULT 'MEDIA'
        CHECK (criticality IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
    installation_date DATE,
    notes VARCHAR(2000),
    specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_equipment_type ON equipment (equipment_type);
CREATE INDEX IF NOT EXISTS ix_equipment_created_at ON equipment (created_at DESC);
