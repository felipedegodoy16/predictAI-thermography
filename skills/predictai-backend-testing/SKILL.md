---
name: predictai-backend-testing
description: Design and run focused tests for PredictAI domain rules, FastAPI contracts, authentication, and persistence behavior.
---

# Testes de Backend do PredictAI

Use esta skill quando o usuário pedir para planejar, escrever ou executar testes das regras de negócio ou da API do backend.

## Contexto observado

- O backend usa FastAPI, Pydantic, PostgreSQL via `asyncpg`, `pytest` e `pytest-asyncio`.
- A aplicação está organizada em `domain`, `application`, `infrastructure` e `presentation`; a API tem prefixo `/api/v1`.
- Na criação desta skill não foram encontrados arquivos de teste ou configuração de teste no backend. Confirme o estado atual antes de introduzir convenções.

## Estratégia

1. Identifique o comportamento público que mudou e teste resultados e efeitos observáveis, não detalhes internos sem valor contratual.
2. Para regras de domínio e casos de uso, prefira testes rápidos com dependências falsas/in-memory. Para rotas, valide esquemas, códigos HTTP, autenticação, autorização e corpo da resposta usando o mecanismo de cliente já adotado pelo projeto; não crie um segundo padrão de fixtures sem necessidade.
3. Reserve testes de integração com PostgreSQL para consultas, restrições e transações que dependem do banco real. Use banco/schema descartável de teste com migrações conhecidas; nunca aponte testes destrutivos para produção ou banco compartilhado sem isolamento.
4. Substitua envio de e-mail, relógio, tokens e outros efeitos externos por dependências controláveis. Não use segredos de `backend/.env` em testes nem registre senhas/tokens em logs.
5. Cubra caminhos válidos, entradas inválidas, limites e permissões negadas. Mantenha os cenários determinísticos e os dados sintéticos.
6. Execute apenas o escopo de testes pedido e informe comandos, resultado e qualquer dependência externa necessária. Não interprete falha de ambiente como falha funcional.

## Áreas de risco do produto

- **Autenticação:** login válido/inválido, renovação e rotação de refresh token, expiração, rejeição/reutilização de token, redefinição com token válido/expirado/usado e resposta de solicitação que não revela se o e-mail existe.
- **Usuários e permissões:** criação, busca/paginação, edição própria versus edição administrativa, alteração de papel só por administrador, bloqueio de autoexclusão e conflito de exclusão por vínculo com OS.
- **Ordens de serviço:** validação de campos e referências, filtros, estados, datas, prioridade e comportamento de estado inexistente.
- **Checklist:** ordenação, atualização de observação/conclusão, timestamp ao concluir e remoção do timestamp ao reabrir; impedir conclusão da OS enquanto houver item obrigatório pendente e permitir concluir quando todos estiverem completos.
- **Integridade:** criação/update transacional e respostas previsíveis para referências inexistentes ou conflitos de unicidade.
- **Funcionalidade termográfica futura:** use amostras sintéticas; teste unidades, metadados ausentes, calibração, proveniência e incerteza. Não espere temperatura absoluta de pixels RGB/colorizados sem dado radiométrico válido.

Não invente regras de transição de estado, criticidade térmica ou conformidade normativa que ainda não estejam especificadas. Se um comportamento depender de decisão de produto, registre a lacuna em vez de codificar um teste como se a decisão estivesse aprovada.
