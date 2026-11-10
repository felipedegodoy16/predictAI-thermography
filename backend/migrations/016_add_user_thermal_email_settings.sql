ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_on_thermal_alert BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS email_on_thermal_alarm BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users AS u
SET email_on_thermal_alarm = TRUE
WHERE EXISTS (
    SELECT 1
    FROM user_roles AS ur
    JOIN roles AS r ON r.id = ur.role_id
    WHERE ur.user_id = u.id AND r.code = 'admin'
);
