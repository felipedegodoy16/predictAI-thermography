---
name: thermography-software-engineering
description: Evolua o PredictAI Thermography com mudanças de software coerentes com a arquitetura e as tecnologias presentes no repositório.
---

# Engenharia de Software do PredictAI Thermography

Use esta skill para analisar, implementar ou revisar mudanças no código deste projeto de análise termográfica.

## Contexto observado

- O repositório contém `backend/` em Python com FastAPI e organização em `domain`, `application`, `infrastructure` e `api`.
- O `frontend/` usa Next.js, React, TypeScript e Zod.
- Esses fatos descrevem o estado observado; confirme os arquivos e dependências atuais antes de decidir uma implementação.

## Orientação de trabalho

1. Inspecione a estrutura e os padrões usados no fluxo afetado antes de alterar código. Siga convenções existentes quando adequadas e sinalize inconsistências relevantes em vez de impor uma arquitetura nova.
2. Mantenha regras de negócio independentes de frameworks quando a separação já existente permitir. Faça dependências de infraestrutura entrarem por abstrações apropriadas; evite criar camadas, padrões ou abstrações sem necessidade concreta.
3. Em FastAPI, mantenha validação de transporte e roteamento na API, orquestração nos casos de uso e regras de negócio no domínio. Em Next.js, preserve os limites existentes entre UI, estado e acesso a serviços.
4. Para fluxos termográficos, mantenha separadas a imagem original, visualização colorizada, dados radiométricos, parâmetros de aquisição e resultados derivados. Não derive temperatura absoluta de pixels RGB sem fonte radiométrica/calibração válida.
5. Trate erros de entrada, formatos não suportados, dados radiométricos ausentes e falhas de processamento com respostas explícitas. Não descarte silenciosamente metadados ou incertezas que alterem a interpretação.
6. Considere autenticação, autorização, validação de uploads, limites de tamanho/formato, privacidade e proteção de dados ao tocar em imagens, laudos ou informações de inspeção.
7. Faça mudanças focadas e compatíveis com contratos existentes. Atualize documentação ou tipos quando os contratos mudarem. Evite mudanças destrutivas ou migrações implícitas.
8. Ao relatar a implementação, resuma o comportamento alterado, arquivos principais e limitações. Execute validações somente quando solicitadas pelo usuário ou pelas instruções aplicáveis.

## Decisões técnicas

Antes de escolher bibliotecas, armazenamento, filas, processamento no cliente/servidor, formatos de imagem ou estratégia offline, procure o que o projeto já usa e identifique requisitos que sustentam a decisão. Apresente alternativas quando uma decisão depender de escala, custo, equipamento térmico ou conectividade ainda não especificados.
