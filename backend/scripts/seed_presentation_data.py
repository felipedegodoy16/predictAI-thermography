"""Replace local application data with fictional presentation data."""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID, uuid4

import asyncpg

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.infrastructure.security.argon2_password_hasher import Argon2PasswordHasher


MASTER_EMAIL = "felipegodoy1@gmail.com"
ACCOUNT_NAMES = [
    "Aurora Energia", "Vale Verde Alimentos", "NorteSul Logística",
    "Horizonte Metais", "Brisa Fria Refrigeração", "Serra Azul Papel e Celulose",
    "Pontal Química", "Campo Forte Agroindústria", "Lume Data Centers",
    "Rota Clara Transportes", "Atlântico Bebidas", "Prisma Têxtil",
    "Cedro Farma", "Nova Safra Grãos", "Ventus Renováveis",
    "Estação Central Shopping", "Minera Sol", "Costa Norte Saneamento",
    "Orbe Automotiva", "Planalto Embalagens",
]
EQUIPMENT_TYPES = ["MOTOR_ELETRICO", "BOMBA", "PAINEL_ELETRICO", "COMPRESSOR"]
EQUIPMENT_NAMES = ["Motor da esteira", "Bomba de processo", "Painel principal", "Compressor de ar"]
MANUFACTURERS = ["WEG", "KSB", "Schneider Electric", "Atlas Copco"]
ORDER_TEMPLATES = [
    ("Inspeção termográfica programada", "Inspecionar conexões e componentes, registrar temperaturas e recomendar ações."),
    ("Verificar vibração e ruído", "Investigar alteração percebida durante a operação e documentar as condições encontradas."),
    ("Revisar sistema de refrigeração", "Verificar limpeza, fluxo de ar e condições de funcionamento do conjunto."),
    ("Ajustar conexões elétricas", "Realizar inspeção visual e reaperto conforme procedimento de segurança."),
]
ORDER_STATES = ["BACKLOG", "EM_ANDAMENTO", "AGUARDANDO_PECA", "EM_REVISAO", "CONCLUIDO", "CANCELADO"]
ORDER_PRIORITIES = ["MEDIA", "ALTA", "BAIXA", "CRITICA"]


async def seed(*, apply: bool) -> None:
    master_password = os.environ.get("PRESENTATION_MASTER_PASSWORD")
    if apply and not master_password:
        raise SystemExit("Defina PRESENTATION_MASTER_PASSWORD antes de aplicar a carga.")

    connection = await asyncpg.connect(settings.database_dsn, timeout=5)
    try:
        async with connection.transaction():
            counts = {}
            for table in ("users", "accounts", "equipment", "service_orders", "checklist_items", "thermographic_images"):
                if await connection.fetchval("SELECT to_regclass($1) IS NOT NULL", f"public.{table}"):
                    counts[table] = await connection.fetchval(f"SELECT COUNT(*) FROM {table}")
            master = await connection.fetchrow(
                "SELECT id FROM users WHERE lower(email)=lower($1)", MASTER_EMAIL
            )
            master_id: UUID = master["id"] if master else uuid4()
            if not apply:
                print(f"Prévia: serão substituídos os dados destas tabelas: {counts}")
                print(f"Usuário master {MASTER_EMAIL}: {'preservado' if master else 'será criado'}")
                return

            roles = await connection.fetch("SELECT id, code FROM roles WHERE code = ANY($1::varchar[])", ["master_admin", "admin", "user"])
            role_ids = {row["code"]: row["id"] for row in roles}
            missing_roles = {"master_admin", "admin", "user"} - role_ids.keys()
            if missing_roles:
                raise RuntimeError(f"Papéis obrigatórios não encontrados: {sorted(missing_roles)}")

            password_hasher = Argon2PasswordHasher()
            master_hash = password_hasher.hash(master_password)
            demo_hash = password_hasher.hash(os.environ.get("PRESENTATION_DEMO_PASSWORD", "Demo@PredictAI2026!"))

            await connection.execute("DELETE FROM thermographic_images")
            await connection.execute("DELETE FROM checklist_items")
            await connection.execute("DELETE FROM service_orders")
            await connection.execute("DELETE FROM equipment")
            await connection.execute("DELETE FROM refresh_tokens")
            await connection.execute("DELETE FROM password_reset_tokens")
            await connection.execute("UPDATE users SET account_id = NULL WHERE id = $1", master_id)
            await connection.execute("DELETE FROM user_roles")
            await connection.execute("DELETE FROM users WHERE id <> $1", master_id)
            await connection.execute("DELETE FROM accounts")
            await connection.execute(
                """INSERT INTO users(id, name, email, password_hash, account_id, created_at)
                   VALUES ($1, 'Felipe Godoy', $2, $3, NULL, NOW())
                   ON CONFLICT (email) DO UPDATE SET
                     name=EXCLUDED.name, password_hash=EXCLUDED.password_hash, account_id=NULL""",
                master_id, MASTER_EMAIL, master_hash,
            )
            await connection.execute(
                "INSERT INTO user_roles(user_id, role_id) VALUES ($1, $2)",
                master_id, role_ids["master_admin"],
            )

            now = datetime.now(timezone.utc)
            for account_index, account_name in enumerate(ACCOUNT_NAMES, start=1):
                account_id = uuid4()
                slug = f"demo-{account_index:02d}-" + account_name.casefold().replace(" ", "-")
                await connection.execute(
                    "INSERT INTO accounts(id, name, slug, is_active) VALUES ($1, $2, $3, TRUE)",
                    account_id, account_name, slug,
                )

                people = [
                    ("admin", "Gestor", role_ids["admin"]),
                    ("tecnico", "Técnico de manutenção", role_ids["user"]),
                    ("solicitante", "Solicitante", role_ids["user"]),
                ]
                user_ids: dict[str, UUID] = {}
                for person_index, (local_part, display_name, role_id) in enumerate(people, start=1):
                    user_id = uuid4()
                    user_ids[local_part] = user_id
                    await connection.execute(
                        """INSERT INTO users(id, name, email, password_hash, account_id, created_at)
                           VALUES ($1, $2, $3, $4, $5, $6)""",
                        user_id, f"{display_name} {account_index:02d}",
                        f"{local_part}{account_index:02d}@demo.predictai.invalid", demo_hash,
                        account_id, now - timedelta(days=person_index),
                    )
                    await connection.execute(
                        "INSERT INTO user_roles(user_id, role_id) VALUES ($1, $2)",
                        user_id, role_id,
                    )

                equipment_ids: list[int] = []
                for equipment_index in range(3):
                    equipment_id = await connection.fetchval(
                        "SELECT nextval(pg_get_serial_sequence('equipment', 'id'))"
                    )
                    code = f"EQ-{now.year}-{equipment_id:06d}"
                    await connection.execute(
                        """INSERT INTO equipment
                           (id, code, name, equipment_type, manufacturer, yellow_limit_c,
                            red_limit_c, capture_interval_seconds, model, serial_number,
                            asset_tag, location, criticality, installation_date, notes,
                            specifications, manual_file_name, account_id)
                           VALUES ($1,$2,$3,$4,$5,$6,$7,3600,$8,$9,$10,$11,$12,$13,$14,'{}'::jsonb,NULL,$15)""",
                        equipment_id, code, f"{EQUIPMENT_NAMES[equipment_index]} {account_index:02d}",
                        EQUIPMENT_TYPES[equipment_index], MANUFACTURERS[equipment_index],
                        70.0 + equipment_index * 5, 90.0 + equipment_index * 5,
                        f"Série {account_index:02d}-{equipment_index + 1:02d}",
                        f"SN-{account_index:02d}-{equipment_index + 1:03d}",
                        f"PAT-{account_index:02d}-{equipment_index + 1:03d}",
                        ["Produção · Linha 1", "Utilidades · Casa de bombas", "Subestação · QGBT"][equipment_index],
                        ["ALTA", "MEDIA", "MEDIA"][equipment_index],
                        date.today() - timedelta(days=180 + account_index * 4 + equipment_index),
                        "Equipamento fictício para demonstração do sistema.", account_id,
                    )
                    equipment_ids.append(equipment_id)

                order_total = 2 + account_index % 3
                for order_index in range(order_total):
                    order_id = await connection.fetchval(
                        "SELECT nextval(pg_get_serial_sequence('service_orders', 'id'))"
                    )
                    code = f"OS-{now.year}-{order_id:04d}"
                    title, description = ORDER_TEMPLATES[(account_index + order_index) % len(ORDER_TEMPLATES)]
                    state = ORDER_STATES[(account_index + order_index) % len(ORDER_STATES)]
                    created_at = now - timedelta(days=order_index * 3 + account_index % 10)
                    completed_at = created_at + timedelta(hours=5) if state == "CONCLUIDO" else None
                    await connection.execute(
                        """INSERT INTO service_orders
                           (id, code, title, description, status, priority, client_id,
                            technician_id, created_at, due_at, completed_at, status_note,
                            equipment_id, account_id)
                           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)""",
                        order_id, code, title, description, state,
                        ORDER_PRIORITIES[(account_index + order_index) % len(ORDER_PRIORITIES)],
                        user_ids["solicitante"], user_ids["tecnico"], created_at,
                        created_at + timedelta(days=7), completed_at,
                        "Dados de demonstração.", equipment_ids[order_index % len(equipment_ids)], account_id,
                    )
                    await connection.execute(
                        """INSERT INTO checklist_items(service_order_id, description, required, completed, sort_order)
                           VALUES ($1, 'Inspecionar o equipamento e registrar as condições encontradas', TRUE, $2, 1),
                                  ($1, 'Anexar recomendações e informar o responsável', TRUE, $2, 2)""",
                        order_id, state == "CONCLUIDO",
                    )

        print("Carga concluída: 20 empresas, 60 usuários de demonstração, 60 equipamentos, ordens de serviço e 1 usuário master.")
    finally:
        await connection.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="apaga os dados atuais e grava a carga fictícia")
    arguments = parser.parse_args()
    asyncio.run(seed(apply=arguments.apply))


if __name__ == "__main__":
    main()
