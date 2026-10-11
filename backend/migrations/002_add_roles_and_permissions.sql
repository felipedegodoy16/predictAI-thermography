CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
    code VARCHAR(120) PRIMARY KEY,
    description VARCHAR(240) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_code VARCHAR(120) NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_code)
);

INSERT INTO roles (code, name)
VALUES ('user', 'User'), ('admin', 'Administrator')
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (code, description)
VALUES
    ('users:read', 'View user information'),
    ('users:write', 'Create or modify users'),
    ('thermal_data:read', 'View thermal monitoring data'),
    ('thermal_data:write', 'Create or modify thermal monitoring data')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_code)
SELECT roles.id, permissions.code
FROM roles CROSS JOIN permissions
WHERE roles.code = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM users CROSS JOIN roles
WHERE roles.code = 'user'
ON CONFLICT DO NOTHING;
