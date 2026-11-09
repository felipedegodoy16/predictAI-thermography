# Diagrama do banco de dados — PredictAI Thermography

Diagrama entidade-relacionamento reconstruído a partir das migrations `backend/migrations/001` a `012`. As entidades abaixo são tabelas PostgreSQL; `PK` indica chave primária, `FK` chave estrangeira e `UQ` unicidade.

```mermaid
erDiagram
    users {
        UUID id PK
        VARCHAR name
        VARCHAR email UK
        TEXT password_hash
        TIMESTAMPTZ created_at
    }

    roles {
        UUID id PK
        VARCHAR code UK
        VARCHAR name
    }

    permissions {
        VARCHAR code PK
        VARCHAR description
    }

    user_roles {
        UUID user_id PK, FK
        UUID role_id PK, FK
    }

    role_permissions {
        UUID role_id PK, FK
        VARCHAR permission_code PK, FK
    }

    refresh_tokens {
        UUID id PK
        UUID user_id FK
        UUID family_id
        CHAR token_hash UK
        TIMESTAMPTZ expires_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ revoked_at
    }

    password_reset_tokens {
        CHAR token_hash PK
        UUID user_id FK
        TIMESTAMPTZ expires_at
        TIMESTAMPTZ created_at
    }

    equipment {
        BIGINT id PK
        VARCHAR code UK
        VARCHAR name
        VARCHAR equipment_type
        VARCHAR manufacturer
        VARCHAR model
        VARCHAR serial_number
        VARCHAR asset_tag UK
        VARCHAR location
        VARCHAR criticality
        DATE installation_date
        VARCHAR notes
        JSONB specifications
        VARCHAR manual_file_name
        DOUBLE yellow_limit_c
        DOUBLE red_limit_c
        TIMESTAMPTZ created_at
    }

    service_orders {
        INTEGER id PK
        VARCHAR code UK
        VARCHAR title
        TEXT description
        VARCHAR status
        VARCHAR priority
        UUID client_id FK
        UUID technician_id FK "nullable"
        BIGINT equipment_id FK "nullable"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ due_at
        TIMESTAMPTZ completed_at
        TEXT status_note
    }

    checklist_items {
        INTEGER id PK
        INTEGER service_order_id FK
        TEXT description
        BOOLEAN required
        BOOLEAN completed
        TEXT technician_note
        TIMESTAMPTZ item_completed_at
        INTEGER sort_order
    }

    thermographic_images {
        BIGINT id PK
        BIGINT equipment_id FK
        VARCHAR original_file_name
        VARCHAR temperature_matrix_file_name
        VARCHAR visible_image_file_name
        VARCHAR thermal_image_file_name
        VARCHAR thermal_overlay_file_name "nullable"
        VARCHAR metadata_file_name
        JSONB analysis_metadata
        TIMESTAMPTZ created_at
    }

    users ||--o{ user_roles : receives
    roles ||--o{ user_roles : assigned
    roles ||--o{ role_permissions : grants
    permissions ||--o{ role_permissions : included
    users ||--o{ refresh_tokens : owns
    users ||--o{ password_reset_tokens : requests
    users ||--o{ service_orders : client
    users o|--o{ service_orders : technician
    equipment o|--o{ service_orders : equipment
    service_orders ||--o{ checklist_items : contains
    equipment ||--o{ thermographic_images : has
```

## Regras e observações

- `user_roles` e `role_permissions` são tabelas de associação com chaves primárias compostas. Isso permite relacionar vários usuários a várias roles e várias roles a várias permissões.
- `service_orders.client_id` é obrigatório e impede a exclusão do usuário associado (`ON DELETE RESTRICT`). `technician_id` é opcional e vira `NULL` se o usuário for removido (`ON DELETE SET NULL`). `equipment_id` também é opcional e vira `NULL` quando o equipamento é removido.
- Remover um usuário exclui suas sessões e tokens de redefinição (`ON DELETE CASCADE`). Remover uma ordem de serviço exclui seus itens de checklist; remover equipamento exclui suas imagens termográficas.
- O banco limita `status` e `priority` das ordens por `CHECK`. Os limites térmicos do equipamento devem estar ambos definidos ou ambos nulos, e o limite vermelho deve ser maior que o amarelo.
- `analysis_metadata` e `specifications` são `JSONB`; seus atributos internos não são colunas relacionais representadas neste ERD.
- As migrations criam as roles `user` e `admin`; não criam uma role `technician`. A tabela de ordens referencia o técnico por `users.id`. No código atual, `list_user_options()` retorna todos os usuários, então o banco não restringe essa atribuição a usuários com perfil técnico.
- A tabela `equipment` não tem `client_id`/proprietário. A relação da ordem com o equipamento é opcional e fica em `service_orders.equipment_id`.

## Origem

`backend/migrations/001_create_users.sql` a `backend/migrations/012_add_thermal_overlay.sql`.
