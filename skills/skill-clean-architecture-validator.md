# SKILL: Validador de Clean Architecture em Backend FastAPI

```yaml
name: clean-architecture-validator
description: Skill procedural para orientação e validação da arquitetura limpa de 4 camadas (Domain, Application, Infrastructure, Presentation) em projetos FastAPI Python.
version: 1.0.0
author: Software Engineering Agent
category: Software Architecture / FastAPI
```

## 1. Contexto e Propósito
Garantir o cumprimento rigoroso da regra de dependência de Robert C. Martin (Uncle Bob) em microsserviços FastAPI: **todas as dependências de código devem apontar para o centro (Domínio)**. Esta skill orienta a separação em 4 camadas e a eliminação de estados globais mutáveis.

---

## 2. As 4 Camadas Concentricas

```
+-----------------------------------------------------------------------------------+
| PRESENTATION LAYER (FastAPI Routers, Pydantic Schemas, Controllers)               |
|   +---------------------------------------------------------------------------+   |
|   | APPLICATION LAYER (Use Cases, Command/Query Handlers, DTOs)               |   |
|   |   +-------------------------------------------------------------------+   |   |
|   |   | DOMAIN LAYER (Entities, Value Objects, Domain Services)           |   |   |
|   |   |   (Zero dependências externas, regras puras de termografia)       |   |   |
|   |   +-------------------------------------------------------------------+   |   |
|   | INFRASTRUCTURE LAYER (SQLAlchemy, Alembic, Repositories, MCP Client/Server)|   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
```

### 2.1. Camada de Domínio (`src/domain`)
* Contém Entidades de Negócio (`ThermalImage`, `InspectionPoint`) e Objetos de Valor (`Temperature`, `Emissivity`).
* **Regra de Ouro**: **ZERO** dependências de bibliotecas externas (sem FastAPI, sem SQLAlchemy, sem Pydantic).

### 2.2. Camada de Aplicação (`src/application`)
* Implementa os **Casos de Uso** (`ProcessThermalImageUseCase`, `AnalyzeHotspotSeverityUseCase`).
* Define as interfaces de abstração de persistência (`IThermalImageRepository`) e padrão `Unit of Work` (`IUnitOfWork`).
* Define DTOs puros para tráfego interno de dados.

### 2.3. Camada de Infraestrutura (`src/infrastructure`)
* Implementa as interfaces do repositório utilizando ORM (`SQLAlchemy`, `Alembic`).
* Gerencia os clientes do protocolo MCP (`MCPServerStreamableHttp`, `MCPServerStdio`).
* Contém adaptadores para armazenamento em nuvem e leitores radiométricos de arquivos.

### 2.4. Camada de Apresentação (`src/presentation`)
* Roteadores HTTP REST construídos com **FastAPI**.
* Schemas de validação de entrada/saída HTTP com **Pydantic**.
* Injeção de Dependências utilizando contêineres limpos (`Dishka` ou `dependency-injector`).

---

## 3. Checklist de Validação do Agente
Ao analisar ou propor código backend, a skill exige a verificação dos seguintes pontos:

- [ ] A camada de Domínio possui algum import externo? (Se sim, REJEITAR).
- [ ] O repositório concreto na Infraestrutura é injetado via interface abstrata no Use Case? (Inversão de Dependência).
- [ ] Mutações no banco são gerenciadas por um contexto transacional `Unit of Work`?
- [ ] Os testes unitários do Domínio e Aplicação rodam sem dependência de banco de dados real (usando implementações *Fake*)?
- [ ] A API do FastAPI responde em tempo inferior a 500 ms?
