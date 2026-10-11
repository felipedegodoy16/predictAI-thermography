CREATE TABLE IF NOT EXISTS ordens_servico (
    id SERIAL PRIMARY KEY,
    codigo_os VARCHAR(32) NOT NULL UNIQUE,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'BACKLOG'
        CHECK (status IN ('BACKLOG', 'EM_ANDAMENTO', 'AGUARDANDO_PECA', 'EM_REVISAO', 'CONCLUIDO', 'CANCELADO')),
    prioridade VARCHAR(16) NOT NULL
        CHECK (prioridade IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
    cliente_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    tecnico_id UUID REFERENCES users(id) ON DELETE SET NULL,
    data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_previsao TIMESTAMPTZ,
    data_conclusao TIMESTAMPTZ,
    observacao_status TEXT
);

CREATE INDEX IF NOT EXISTS ix_ordens_servico_status ON ordens_servico (status);
CREATE INDEX IF NOT EXISTS ix_ordens_servico_tecnico_id ON ordens_servico (tecnico_id);
CREATE INDEX IF NOT EXISTS ix_ordens_servico_prioridade ON ordens_servico (prioridade);
CREATE INDEX IF NOT EXISTS ix_ordens_servico_data_criacao ON ordens_servico (data_criacao DESC);

CREATE TABLE IF NOT EXISTS checklist_itens_os (
    id SERIAL PRIMARY KEY,
    ordem_servico_id INTEGER NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    obrigatorio BOOLEAN NOT NULL DEFAULT TRUE,
    concluido BOOLEAN NOT NULL DEFAULT FALSE,
    observacao_tecnico TEXT,
    data_conclusao_item TIMESTAMPTZ,
    ordem INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ix_checklist_itens_os_ordem
    ON checklist_itens_os (ordem_servico_id, ordem, id);
