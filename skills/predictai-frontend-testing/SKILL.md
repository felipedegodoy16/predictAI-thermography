---
name: predictai-frontend-testing
description: Validate PredictAI user flows and responsive interface behavior in the existing Next.js frontend.
---

# Testes de Frontend do PredictAI

Use esta skill quando o usuário pedir validação de fluxos, comportamento de interface ou regressões no frontend.

## Contexto observado

- O frontend usa Next.js App Router, React, TypeScript e Tailwind CSS.
- Na criação desta skill, `package.json` oferece `build` e `typecheck`, mas não declara runner de testes unitários/componentes nem script de testes E2E. Confirme o estado atual antes de escolher ferramentas.
- A skill `playwright` instalada no projeto orienta automação interativa de navegador via `playwright-cli`; ela não configura nem cria por si só arquivos de testes automatizados `@playwright/test`.

## Escolha do método

1. Para verificar rapidamente um fluxo já executável, use a skill `playwright`: abra a aplicação local/ambiente aprovado, leia snapshots recentes, interaja com controles reais e reúna evidências úteis. Não use seletores/ref antigos após mudanças de tela.
2. Para criar testes de regressão persistentes, verifique se o repositório já adotou framework, convenções e dependências. Se não adotou, apresente a lacuna e recomende uma opção compatível antes de adicionar dependências ou alterar scripts.
3. Teste a interface pelo comportamento acessível ao usuário: nomes/roles, mensagens, navegação e resultado. Evite acoplamento a classes Tailwind, estrutura interna do componente ou detalhes visuais frágeis.
4. Separe teste de componente/validação do formulário de teste de integração com API e de jornada E2E; use cada nível para o risco que ele cobre, sem duplicar o mesmo cenário em camadas desnecessárias.
5. Não use contas, dados ou imagens térmicas de produção. Prefira contas e registros sintéticos em ambiente local/teste isolado. Não apague nem altere dados reais para preparar um cenário.
6. Em E2E, reporte pré-condições (frontend, API, banco e usuário de teste), passos, resultado esperado/observado e limitações do ambiente. Não declare sucesso se o fluxo foi bloqueado por serviço indisponível.

## Fluxos prioritários

- **Autenticação:** login, erros de credencial, expiração/renovação e redirecionamento, solicitação/redefinição de senha.
- **Perfil e usuários:** carregar e salvar perfil, validação, ações que variam entre administrador e usuário comum, busca/paginação, criação/edição e mensagens de falha.
- **Ordens de serviço:** carregar Kanban, criar OS, abrir detalhes, mudar estado, editar checklist, feedback de erro e bloqueio de conclusão por itens obrigatórios pendentes.
- **Mobile first:** validar viewport estreito e desktop, navegação móvel, formulários, modais/drawers e ausência de rolagem horizontal acidental; verificar foco/teclado e nomes acessíveis nos controles importantes.
- **Termografia futura:** quando os fluxos existirem, verificar estados sem imagem/metadados, diferenciação de imagem radiométrica e colorizada, unidade e apresentação explícita de limitações.

Verifique os controles e telas existentes antes de escrever casos. Não trate links “em breve”, indicadores decorativos ou conteúdo sem ação como funcionalidade testável; reporte-os como não funcionais se afetarem o fluxo coberto.
