"""Create the first platform-wide PredictAI administrator."""

import asyncio
from getpass import getpass
from uuid import uuid4

import asyncpg

from app.core.config import settings
from app.infrastructure.security.argon2_password_hasher import Argon2PasswordHasher


async def main() -> None:
    name = input("Nome do administrador master: ").strip()
    email = input("Email: ").strip().casefold()
    password = getpass("Senha (mínimo 12 caracteres): ")
    if len(name) < 2 or len(password) < 12:
        raise SystemExit("Nome ou senha fora dos requisitos.")

    connection = await asyncpg.connect(settings.database_dsn)
    try:
        existing = await connection.fetchval(
            """SELECT EXISTS (
                   SELECT 1 FROM user_roles ur
                   JOIN roles r ON r.id = ur.role_id
                   WHERE r.code = 'master_admin'
               )"""
        )
        if existing:
            raise SystemExit("Já existe um administrador master cadastrado.")
        async with connection.transaction():
            user_id = uuid4()
            await connection.execute(
                """INSERT INTO users (id, name, email, password_hash, account_id, created_at)
                   VALUES ($1, $2, $3, $4, NULL, NOW())""",
                user_id, name, email, Argon2PasswordHasher().hash(password),
            )
            await connection.execute(
                """INSERT INTO user_roles (user_id, role_id)
                   SELECT $1, id FROM roles WHERE code = 'master_admin'""",
                user_id,
            )
        print(f"Administrador master criado: {email}")
    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.run(main())
