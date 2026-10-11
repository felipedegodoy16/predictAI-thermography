DO $$
BEGIN
    IF to_regclass('public.ordens_servico') IS NOT NULL
       AND to_regclass('public.service_orders') IS NULL THEN
        ALTER TABLE ordens_servico RENAME TO service_orders;
    END IF;
    IF to_regclass('public.checklist_itens_os') IS NOT NULL
       AND to_regclass('public.checklist_items') IS NULL THEN
        ALTER TABLE checklist_itens_os RENAME TO checklist_items;
    END IF;
END $$;

DO $$
DECLARE
    column_pair TEXT[];
BEGIN
    FOREACH column_pair SLICE 1 IN ARRAY ARRAY[
        ['codigo_os', 'code'],
        ['titulo', 'title'],
        ['descricao', 'description'],
        ['prioridade', 'priority'],
        ['cliente_id', 'client_id'],
        ['tecnico_id', 'technician_id'],
        ['data_criacao', 'created_at'],
        ['data_previsao', 'due_at'],
        ['data_conclusao', 'completed_at'],
        ['observacao_status', 'status_note']
    ] LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'service_orders'
              AND column_name = column_pair[1]
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'service_orders'
              AND column_name = column_pair[2]
        ) THEN
            EXECUTE format('ALTER TABLE service_orders RENAME COLUMN %I TO %I', column_pair[1], column_pair[2]);
        END IF;
    END LOOP;

    FOREACH column_pair SLICE 1 IN ARRAY ARRAY[
        ['ordem_servico_id', 'service_order_id'],
        ['descricao', 'description'],
        ['obrigatorio', 'required'],
        ['concluido', 'completed'],
        ['observacao_tecnico', 'technician_note'],
        ['data_conclusao_item', 'item_completed_at'],
        ['ordem', 'sort_order']
    ] LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'checklist_items'
              AND column_name = column_pair[1]
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'checklist_items'
              AND column_name = column_pair[2]
        ) THEN
            EXECUTE format('ALTER TABLE checklist_items RENAME COLUMN %I TO %I', column_pair[1], column_pair[2]);
        END IF;
    END LOOP;
END $$;
