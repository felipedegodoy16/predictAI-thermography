UPDATE equipment
SET criticality = 'ALTA'
WHERE criticality = 'CRITICA';

ALTER TABLE equipment
    DROP CONSTRAINT IF EXISTS equipment_criticality_check;

ALTER TABLE equipment
    ADD CONSTRAINT equipment_criticality_check
    CHECK (criticality IN ('BAIXA', 'MEDIA', 'ALTA'));
