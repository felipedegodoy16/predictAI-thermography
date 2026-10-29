---
name: predictai-frontend-engineering
description: Implement or revise PredictAI frontend features using its existing Next.js, React, TypeScript, and Tailwind stack.
---

# Engenharia de Frontend do PredictAI

Use esta skill ao implementar, corrigir ou revisar comportamento e componentes do frontend deste projeto.

## Stack observado

- `frontend/` usa Next.js App Router, React, TypeScript, Tailwind CSS v4, Zod, React Hook Form e `lucide-react`.
- A integração com a API e os tipos de domínio do frontend ficam em `frontend/lib/api.ts`; a sessão fica em `frontend/lib/auth-session.ts`.
- A identidade visual e os tokens globais ficam em `frontend/app/globals.css`.

Confirme os arquivos e dependências atuais antes de propor mudanças. Esses pontos descrevem o repositório, não exigem reescrita dos padrões existentes.

## Diretrizes de implementação

1. Antes de editar, leia a rota/tela afetada, seus componentes e as funções de API relacionadas. Preserve contratos e convenções existentes que atendem ao fluxo.
2. Use TypeScript para refletir os dados reais; reutilize tipos e funções de `lib/api.ts`. Evite `any`, tipos duplicados, acessos `fetch` paralelos e regras de sessão repetidas nos componentes.
3. Mantenha componentes focados. Extraia componentes quando houver reutilização ou complexidade que prejudique leitura; não crie camadas, hooks ou abstrações apenas para reduzir linhas.
4. No Next.js, mantenha limites de Server/Client Components coerentes com a necessidade de interação e APIs do navegador. Não marque uma árvore inteira como client quando só uma parte interativa precisa disso.
5. Use os componentes, tokens de cor, espaçamento e convenções Tailwind existentes antes de adicionar variantes globais. Evite novas dependências quando o stack atual resolve a necessidade.
6. Para chamadas assíncronas, apresente estados reais de carregamento, sucesso, vazio e erro quando forem relevantes ao fluxo. Não esconda erro como lista vazia nem invente dados, métricas ou notificações.
7. Use HTML semântico, rótulos associados aos campos, nomes acessíveis para controles iconográficos e foco visível. A cor não deve ser o único meio de comunicar estado.
8. Implemente com abordagem mobile first: comece pelo layout estreito e acrescente adaptações para telas maiores. Preserve leitura, ações e conteúdo sem rolagem horizontal acidental.
9. Não altere fluxos não relacionados. Atualize os tipos e mensagens de interface quando o contrato da API mudar e explique as consequências observáveis.
10. Execute verificações automatizadas somente quando forem solicitadas pelo usuário ou exigidas por instruções aplicáveis.

Ao concluir, resuma o que mudou e aponte arquivos ou limitações relevantes. Para critérios de hierarquia visual e conteúdo, aplique também `predictai-mobile-first-ux`.
