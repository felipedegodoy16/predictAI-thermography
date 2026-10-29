# SKILL: Elicitação e Definição de Requisitos para Termografia Industrial

```yaml
name: thermography-requirements-elicitor
description: Procedimento estruturado para elicitar, categorizar e validar Requisitos Funcionais (RF) e Não-Funcionais (RNF) de sistemas web de termografia industrial operados por agentes de IA e protocolo MCP.
version: 1.0.0
author: Software Engineering Agent
category: Software Engineering / Industrial Termography
```

## 1. Contexto e Propósito
Esta *Agent Skill* guia o agente de IA no processo de engenharia de requisitos para sistemas de termografia preditiva. O foco é garantir que o software seja enxuto, direto, focado em código limpo (*Clean Architecture*) e ergonomia *Mobile-First*, eliminando elementos e informações desnecessárias.

---

## 2. Condições de Disparo (When to Use)
Use esta skill sempre que for necessário:
* Elicitar ou estruturar novos Requisitos Funcionais (RF) e Não-Funcionais (RNF) para sistemas de manutenção preditiva e termografia.
* Especificar casos de uso (UC) e estórias de usuário (*User Stories*) focadas em inspeção térmica industrial.
* Validar se os requisitos atendem aos critérios de *Clean Architecture* e *Laws of UX*.

---

## 3. Diretrizes de Engenharia e Regras de Negócio

### 3.1. Requisitos Radiométricos e Normativos
* **Parâmetros Físicos Obrigaórios**: Todo requisito de extração/processamento deve considerar Emissividade ($arepsilon$), Temperatura Refletida Ambiente ($W_{	ext{refl}}$) e Transmissividade Atmosférica ($	au$).
* **Classificação de Severidade**: As anomalias térmicas devem ser categorizadas com base nos limites de elevação de temperatura ($\Delta T$) estabelecidos pela norma **ASTM E1934** e **NFPA 70B**.
* **Laudos e Certificações**: A emissão de laudos deve estar em conformidade com as diretrizes da norma **ISO 18436-7** (Categoria I, II e III).

### 3.2. Arquitetura Limpa (Clean Architecture)
* Os requisitos funcionais de regras de negócio devem ser isolados na **Camada de Domínio**, sem dependências de *frameworks* (FastAPI, Next.js, SQLAlchemy).
* O acesso aos dados radiométricos e infraestrutura deve utilizar contratos de **Repository** e **Unit of Work (UoW)**.

### 3.3. Minimalismo e Mobile-First (Laws of UX)
* **Lei de Hick**: Reduzir a carga cognitiva eliminando menus secundários e exibindo apenas os dados térmicos cruciais (Temperatura Máxima, Gradiente $\Delta T$, Nível de Severidade).
* **Lei de Fitts**: Posicionar botões de ação primária (ex: "Capturar Ponto", "Confirmar Anomalia") na zona do polegar (*Thumb Zone*) com área de toque ampliada (mínimo $48 	imes 48 	ext{ dp}$).
* **Lei de Miller**: Agrupar metadados radiométricos e calibrações em pequenos blocos visuais delimitados (mínimo de 5 a 7 itens visíveis simultaneamente).

---

## 4. Fluxo de Trabalho Passo a Passo (Workflow)

1. **Elicitação dos Requisitos Funcionais (RF)**:
   * **RF01 - Recepção de Imagem e Extração de Metadados**: Permitir upload de fotos radiométricas e extrair automaticamente parâmetros Exif/radiométricos ($arepsilon$, $T_{	ext{refl}}$, distância).
   * **RF02 - Detecção e Destaque de Pontos Quentes (Hotspots)**: Processar a matriz térmica, identificar o ponto de maior temperatura ($T_{	ext{max}}$) e renderizar destaque visual sobre a paleta *Ironbow*.
   * **RF03 - Triagem Agêntica via MCP**: Agente de IA consome ferramenta MCP para consultar limites da norma ASTM E1934 e sugerir a severidade da falha.
   * **RF04 - Emissão de Laudo Simplificado**: Gerar PDF enxuto alinhado com a norma ISO 18436-7 contendo imagem visual/térmica, metadados e recomendação técnica.

2. **Elicitação dos Requisitos Não-Funcionais (RNF)**:
   * **RNF01 - Latência de Backend**: Requisições síncronas de processamento no FastAPI devem ter tempo de resposta inferior a **500 ms**.
   * **RNF02 - Design Mobile-First e Responsividade**: Interface desenvolvida em Next.js priorizando dispositivos móveis, sem rolagem horizontal nem poluidores visuais.
   * **RNF03 - Operação Offline e PWA**: Suporte a armazenamento local no **IndexedDB** para capturas em campo sem conectividade e sincronização automática.
   * **RNF04 - Isolamento do Domínio (Testabilidade)**: 100% das regras de cálculo de radiometria devem ser isoladas e testáveis com implementações *fake*.
   * **RNF05 - Eficiência de Tokens MCP**: Chamadas de ferramentas do agente MCP devem utilizar filtro de projeção (`fields_param`) para economizar *context window*.

3. **Validação de Conformidade**:
   * Verificar se nenhum requisito exige formulários extensos ou dados não essenciais ao diagnóstico imediato do técnico de campo.

---

## 5. Formato do Output
Gere o documento final estruturado no seguinte padrão:

```markdown
# ESPECIFICAÇÃO DE REQUISITOS - SISTEMA WEB DE TERMOGRAFIA INDUSTRIAL

## 1. Visão Geral do Sistema
[Descrição sucinta do sistema focando na proposta minimalista e operação móvel]

## 2. Requisitos Funcionais (RF)
* **RF01 - [Nome]**: [Descrição detalhada]
* **RF02 - [Nome]**: [Descrição detalhada]

## 3. Requisitos Não-Funcionais (RNF)
* **RNF01 - [Nome]**: [Métrica/Critério objetivo]
* **RNF02 - [Nome]**: [Métrica/Critério objetivo]

## 4. Matriz de Rastreabilidade (Normas x Arquitetura x UX)
[Tabela correlacionando requisitos, normas industriais e princípios de Clean Arch/UX]
```
