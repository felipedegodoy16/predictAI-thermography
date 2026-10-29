---
name: thermography-image-analysis
description: Especifique ou implemente fluxos de ingestão e análise de termogramas preservando dados radiométricos, calibração e limitações de medição.
---

# Análise de Imagens Termográficas

Use esta skill em requisitos, desenho de fluxo ou implementação de ingestão, visualização, processamento e interpretação de imagens termográficas.

## Avaliação dos dados de entrada

- Identifique se o arquivo contém somente imagem visual, imagem térmica renderizada ou dados radiométricos. Confirme formatos e capacidades com a documentação do fabricante ou biblioteca aplicável.
- Registre origem, formato, equipamento/modelo quando conhecido, resolução, data/hora e metadados de medição disponíveis. Diferencie metadados ausentes de valores padrão.
- Não interprete paleta de cores como temperatura calibrada. Se só houver imagem colorizada, limite a análise ao que ela sustenta e declare que os valores radiométricos não foram recuperados.
- Preserve o original e associe resultados derivados com versão de algoritmo, parâmetros usados, unidade e proveniência.

## Medição e interpretação

- Verifique quais variáveis de aquisição são necessárias para o cálculo pretendido. Emissividade, temperatura refletida, distância, umidade/transmissão atmosférica, faixa e calibração podem afetar a medição; não assuma valores nem aplique correções sem fonte e justificativa.
- Mantenha unidades consistentes e explicite se o resultado é temperatura medida, estimada, relativa ou apenas indicação visual.
- Apresente limitações e incertezas que possam alterar decisões. Não classifique criticidade automaticamente com limites não aprovados pelo domínio ou sem norma/documentação pertinente.
- Separe detecção de regiões de interesse, medição, classificação e recomendação. Não trate uma hipótese visual/automatizada como diagnóstico confirmado.
- Em comparações entre imagens, verifique condições comparáveis de captura, escala térmica, emissividade, contexto do componente e demais parâmetros relevantes.

## Requisitos de qualidade para fluxos

Considere validação de integridade do arquivo, formatos/tamanhos suportados, metadados ausentes ou inválidos, processamento parcial, rastreabilidade dos parâmetros, reprodução do resultado, segurança do upload e feedback de erro compreensível. Defina limites e critérios com os requisitos reais do produto; não assuma suporte offline, latência ou compatibilidade de equipamento.

Ao documentar um fluxo, informe entradas, pré-condições, transformações, saídas, unidade, limitações, falhas possíveis e evidência usada para validar o resultado. Para normas e limites de severidade, exija fonte aplicável ao setor e confirmação do escopo antes de incorporá-los como regra.
