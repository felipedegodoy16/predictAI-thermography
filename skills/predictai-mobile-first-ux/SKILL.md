---
name: predictai-mobile-first-ux
description: Design and review PredictAI screens for mobile-first usability, visual clarity, and purposeful content.
---

# UX/UI Mobile First do PredictAI

Use esta skill ao desenhar ou revisar telas, fluxos, navegação, hierarquia visual e conteúdo do frontend.

## Princípio de conteúdo útil

Toda informação, controle e elemento visual deve ajudar o usuário a concluir uma tarefa, tomar uma decisão, entender um estado ou navegar. Antes de incluir algo, responda: **quem precisa disso, em que momento e o que consegue fazer ou entender por causa disso?** Se não houver uma resposta concreta, remova ou não adicione o elemento.

## Como orientar o desenho

1. Identifique o objetivo principal da tela e o próximo passo esperado do usuário. Priorize uma ação primária clara e mantenha ações secundárias subordinadas.
2. Comece pelo viewport móvel. Organize conteúdo em ordem de importância, use rótulos diretos e permita concluir as tarefas sem depender de hover, precisão fina ou navegação escondida.
3. Amplie para telas maiores quando houver espaço útil; não preencha espaço vazio com cartões, métricas, ilustrações ou texto decorativo sem função.
4. Remova duplicação de títulos, descrições, estatísticas, badges e chamadas para ação. Mostre somente dados necessários ao fluxo atual; mova detalhes secundários para um lugar contextual quando forem úteis, sem esconder informações essenciais à decisão.
5. Não crie controles sem ação real, notificações sem origem, navegação para páginas inexistentes, estados falsos de atividade ou conteúdo de preenchimento. Se um destino ainda não existe, não o apresente como recurso disponível.
6. Use agrupamento, contraste, espaço e tipografia para criar hierarquia. Prefira superfícies e ornamentos discretos; cartões, bordas, sombras, gradientes e ícones só devem aparecer quando melhorarem leitura ou interação.
7. Mantenha consistência com a identidade visual e os componentes já existentes no projeto. Não introduza um novo padrão visual em uma tela isolada sem necessidade do produto.
8. Apresente feedback próximo da ação: carregamento, salvamento, validação, erro, confirmação ou estado vazio. Um estado vazio deve orientar a próxima ação útil quando ela existir.
9. Preserve acessibilidade: estrutura semântica, teclado, foco visível, contraste legível, texto compreensível e estado que não dependa apenas de cor ou ícone.
10. Em telas de inspeção e dados termográficos, destaque apenas medições que tenham fonte e unidade identificáveis. Não use uma visualização decorativa que sugira precisão ou criticidade que o dado não sustenta.

## Revisão rápida

- Qual tarefa esta tela permite concluir?
- Cada informação tem uma utilidade identificável para essa tarefa?
- Os controles têm ação, destino e feedback reais?
- O fluxo funciona em tela estreita e com interação por toque/teclado?
- Algum elemento pode ser retirado sem prejudicar a tarefa, a decisão ou a compreensão do estado? Se sim, retire-o.

Esta skill trata de decisões de interface. Para detalhes de componentes, tipos, integração e limites do Next.js/React, aplique `predictai-frontend-engineering`.
