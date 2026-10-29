---
name: thermography-requirements
description: Elicite e especifique requisitos funcionais e não funcionais para o PredictAI Thermography, da descoberta à validação e rastreabilidade.
---

# Engenharia de Requisitos para Termografia

Use esta skill ao descobrir, escrever, revisar ou priorizar requisitos do sistema, especialmente fluxos de inspeção e análise de imagens termográficas.

## Procedimento

1. Inspecione os artefatos relevantes do projeto (código, documentação, issues ou decisões fornecidas) antes de propor requisitos. Trate os arquivos `skills/*.md` antigos como notas legadas, não como especificação aprovada.
2. Separe fatos confirmados, decisões existentes, hipóteses e perguntas em aberto. Não transforme sugestões em regras de negócio sem evidência ou validação do usuário.
3. Identifique atores, objetivo, gatilho, pré-condições, fluxo principal, exceções, dados envolvidos e resultado esperado para cada capacidade.
4. Escreva requisitos funcionais como comportamentos verificáveis. Escreva requisitos não funcionais como qualidade mensurável ou restrição concreta, vinculando cada métrica a contexto, método de medição e justificativa.
5. Quando faltarem metas ou políticas, registre a lacuna e ofereça uma proposta claramente marcada para decisão; não invente SLA, obrigação regulatória, classificação de severidade ou suporte offline.
6. Defina critérios de aceite observáveis, dependências, prioridade e origem. Mantenha rastreabilidade entre objetivo, requisito, critério de aceite e componente afetado.
7. Revise consistência, viabilidade, testabilidade, segurança, acessibilidade, privacidade, desempenho, compatibilidade e tratamento de falhas conforme aplicável.

## Regras para o domínio termográfico

- Distinga imagem visual RGB, termograma colorizado e matriz/dado radiométrico. Não prometa temperatura absoluta a partir apenas das cores de uma imagem colorizada.
- Para medições quantitativas, explicite os dados de calibração e aquisição disponíveis, como emissividade, temperatura refletida, distância, umidade/transmissão atmosférica e modelo do equipamento, sem pressupor que todos são obrigatórios em todo fluxo.
- Registre unidades, origem, precisão conhecida e incerteza/limitações. Preserve os dados originais e a proveniência quando a transformação puder afetar a interpretação.
- Trate sugestões automáticas de anomalia como apoio à análise até que as regras de negócio, validação e responsabilidade profissional estejam definidas.
- Cite normas apenas quando forem fornecidas ou verificadas para o contexto. Não atribua limites de severidade nem alegue conformidade com ASTM, NFPA, ISO ou outra norma sem fonte aplicável e escopo confirmado.

## Formato recomendado

Entregue uma visão do escopo, atores e fluxos; uma tabela de RF; uma tabela de RNF; critérios de aceite; dependências e riscos; e uma lista curta de decisões pendentes. Use IDs estáveis (`RF-001`, `RNF-001`) e marque claramente requisitos confirmados versus propostas.

Um requisito funcional pode seguir: “O sistema deve [comportamento] para [ator/condição], produzindo [resultado]”. Um RNF pode seguir: “Sob [condição/carga], [componente] deve atingir [limite], medido por [método]”. Evite requisitos vagos como “rápido”, “intuitivo” ou “seguro” sem critério verificável.
