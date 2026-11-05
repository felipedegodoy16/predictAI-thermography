# Requisitos atuais — PredictAI Thermography

- **Versão:** 0.3 — revisão baseada no código
- **Data:** 04/11/2026
- **Status:** fotografia do comportamento encontrado no repositório; pendente de validação do Product Owner e da equipe técnica.

## 1. Objetivo e escopo

Este documento substitui o rascunho anterior e descreve o que o sistema faz hoje, separando comportamento confirmado no código de decisões ainda abertas. A aplicação web reúne autenticação e usuários, equipamentos e manuais, ordens de serviço (OS), quadro Kanban, indicadores e um fluxo de análise de arquivos termográficos IS2.

O módulo termográfico está implementado, mas é marcado como **Teste** na navegação e o backend só aceita upload manual nos ambientes `development`, `test` e `testing`. Portanto, a capacidade existe no código, mas não está habilitada para uso em produção. O fluxo não é captura contínua de sensor: um usuário autenticado seleciona um equipamento e envia um arquivo IS2 já existente.

### 1.1 O que a análise termográfica faz

O backend valida e lê o pacote IS2, extrai a matriz radiométrica e as curvas de calibração do arquivo, e exige emissividade, temperatura refletida e transmissão. Converte a matriz para °C usando os dados de calibração e aplica a correção radiométrica implementada. Gera e armazena o arquivo original, matriz CSV, imagem visual JPEG, termograma PNG e metadados JSON.

Calcula estatísticas da matriz (mínima, máxima, média, mediana, percentis e coordenadas dos extremos), marca visualmente o maior ponto na imagem térmica e gera uma camada térmica sobre a imagem visual usando os dados de recorte/alinhamento presentes no IS2. Quando não há recorte válido, usa alinhamento de quadro completo. A camada ajuda a comparar imagens, mas não corrige diferenças de perspectiva entre sensores.

O resultado `NORMAL`, `ALERTA` ou `URGENTE` compara a temperatura máxima calculada com dois limites configurados no cadastro do equipamento. São limites locais do equipamento, não uma classificação normativa. A tela permite selecionar uma região da imagem visual e calcular temperatura mínima, máxima e média a partir dos pixels da matriz que correspondem à área; pixels fora da região térmica registrada são excluídos.

Se a temperatura máxima alcançar o limite amarelo e a integração Groq estiver configurada, o backend pode enviar à IA o termograma gerado, os dados do equipamento, a temperatura/limites e trechos extraídos do manual PDF pesquisável. A IA devolve um rascunho estruturado de OS. O usuário revisa/edita o rascunho na interface antes de criar a OS. A imagem é salva mesmo quando a geração do rascunho falha. O rascunho não é persistido como entidade própria.

**Limitações confirmadas:** o código dá suporte a IS2 e não comprova compatibilidade com outros formatos/câmeras; não extrai horário real de captura para exibição (a data apresentada é de inclusão no sistema); não registra incerteza de medição, distância, umidade, modelo da câmera ou versão do algoritmo; não define limites universais de anomalia ou severidade; e não demonstra validação metrológica independente da conversão/calibração. A visualização colorida, por si só, não é a fonte dos valores: as temperaturas vêm da matriz radiométrica e dos metadados/calibração do IS2.

## 2. Atores

| Ator | Capacidades observadas | Situação |
|---|---|---|
| Usuário autenticado | Acessa as áreas protegidas, consulta/atualiza o próprio perfil e usa as funções disponíveis de equipamentos, termografia e OS. | Implementado; permissões por função não são aplicadas de forma uniforme a todas as áreas. |
| Administrador | Pesquisa, pagina, cria, edita e exclui usuários; pode atribuir papel `user` ou `admin`. | Implementado. |
| Pessoa que gerencia equipamentos e OS | Cadastra equipamentos e manuais, analisa imagens no ambiente habilitado e cria/acompanha OS. | Implementado; não há papel de negócio separado no código. |
| Técnico associado a OS | Pode ser selecionado como responsável e consultar as tarefas do checklist. | Associação existe; não há papel/permissão de técnico distinto. |
| Serviço externo Groq | Recebe contexto do equipamento, trechos de manual e, no fluxo termográfico, uma imagem térmica para gerar rascunhos. | Integração opcional, configurada no backend. |
| Dispositivo/sensor de campo | Nenhum fluxo de captura automática ou comunicação direta foi encontrado. | Fora da funcionalidade comprovada atual. |

## 3. Requisitos funcionais observados

Todos os requisitos desta seção descrevem funcionalidades encontradas no código. A marcação “ambiente de teste” é uma restrição de disponibilidade atual, não uma recomendação de produto.

| ID | Requisito atual | Critério observável / regra encontrada | Componentes principais |
|---|---|---|---|
| RF-001 | O sistema deve autenticar usuários por e-mail e senha e iniciar sessão com token de acesso e token de renovação. | Login válido emite tokens; credenciais inválidas não autenticam. | `backend/app/presentation/http/auth.py`, `frontend/app/(auth)/login/` |
| RF-002 | O sistema deve renovar a sessão com token de renovação e rejeitar token inválido, expirado ou reutilizado. | Token válido sofre rotação; falhas retornam não autorizado. | Auth e repositório de refresh tokens |
| RF-003 | O sistema deve permitir solicitar redefinição de senha por e-mail e trocar a senha com token válido. | A solicitação não deve revelar se o e-mail existe; token inválido/expirado não troca a senha. Envio depende de configuração operacional. | Auth, `password_reset_tokens.py`, telas de recuperação |
| RF-004 | O administrador deve poder listar, pesquisar, criar, editar e excluir usuários e definir papel `user` ou `admin`. | A listagem pagina/busca; não permite excluir a própria conta nem usuário referenciado por OS. | `users.py`, `frontend/components/dashboard/users/` |
| RF-005 | O usuário deve poder consultar e atualizar o próprio nome e e-mail. | Usuário comum não atualiza outras contas nem o próprio papel. | `/users/me`, `/perfil` |
| RF-006 | O sistema deve cadastrar equipamento com identificação, tipo, fabricante, modelo, série, patrimônio, localização, criticidade, instalação, observações e limites térmicos. | Código patrimonial não pode duplicar; limites amarelo e vermelho devem ser informados e vermelho deve exceder amarelo. Cadastro de fabricante/tipo e limites é validado pelo esquema atual. | `equipment.py`, `postgres_equipment_repository.py`, `equipamentos/` |
| RF-007 | O sistema deve listar equipamentos, filtrar por tipo e paginar resultados. | API limita `limit` a 1–100 e exige `offset` não negativo. | Endpoint `/equipamentos` |
| RF-008 | O sistema deve permitir atualizar os dados editáveis de equipamento. | Atualização parcial valida o conjunto resultante; equipamento inexistente retorna não encontrado. O manual não é substituído por essa atualização. | `PATCH /equipamentos/{id}` |
| RF-009 | O sistema deve aceitar manual PDF opcional no cadastro de equipamento e permitir sua consulta/baixa autenticada. | Máximo 25 MB; extensão, MIME e assinatura `%PDF-` são verificados; nome armazenado é gerado pelo sistema. | `equipment.py`, `equipment-detail-drawer.tsx` |
| RF-010 | O sistema deve criar OS com título, descrição, prioridade, cliente, técnico opcional, equipamento opcional, previsão opcional e checklist inicial. | Referências e payload são validados; OS e checklist inicial são gravados em transação. Estado/código são atribuídos pelo backend/banco. | `service_orders.py`, repositório de OS, `create-os-modal.tsx` |
| RF-011 | O sistema deve listar OS com filtros por estado, técnico e prioridade, paginação, e oferecer quadro Kanban e detalhe da OS. | OS são agrupadas por estado; checklist e dados da OS aparecem no detalhe. | API de OS, `/kanban` |
| RF-012 | O sistema deve permitir editar campos aceitos da OS e alterar seu estado. | Ao concluir, OS com item obrigatório pendente não pode avançar; mudança de estado pode registrar observação. Matriz completa de transições não está definida no código. | `service_orders.py`, drawer de detalhe |
| RF-013 | O sistema deve permitir adicionar, editar, concluir, reabrir e remover itens do checklist. | Conclusão registra data/hora; reabertura remove a data; o progresso é calculado a partir dos itens. | Endpoints `/checklist`, interface da OS |
| RF-014 | O dashboard deve mostrar indicadores de OS e equipamentos com imagens que atingiram limites térmicos. | Indicadores agregam estados/prioridades/atividade de OS; lista térmica conta imagens classificadas pelos limites cadastrados por equipamento. | `dashboard.py`, `postgres_dashboard_repository.py` |
| RF-015 | Em ambiente `development`, `test` ou `testing`, o usuário autenticado deve poder enviar arquivo `.is2` associado a equipamento existente. | Upload manual é recusado com 403 fora desses ambientes; limite 50 MB; equipamento deve ter ambos os limites térmicos configurados. O menu marca a área como “Teste”. | `thermographic_images.py`, `thermographic-images-page.tsx` |
| RF-016 | O sistema deve rejeitar IS2 vazio, maior que 50 MB, inválido, truncado ou sem os dados exigidos pela rotina. | Pacote deve conter matriz IR e calibração, parâmetros finitos de emissividade/refletida/transmissão válidos e uma imagem visual JPEG reconhecida. O processamento também limita expansão do pacote (200 MB total e 100 MB por item). | `termography_analysis.py` |
| RF-017 | O sistema deve converter a matriz radiométrica IS2 em temperaturas, aplicando curvas de calibração e correção por emissividade, temperatura refletida e transmissão. | Nenhum valor padrão é inventado quando os parâmetros obrigatórios faltam; falha se não houver temperatura válida. Resultado e unidade °C são gravados. | `termography_analysis.py` |
| RF-018 | O sistema deve preservar o original e registrar os arquivos derivados e metadados ligados ao equipamento. | Original `.is2`, matriz CSV, imagem normal JPEG, termograma PNG, sobreposição PNG e metadados JSON são armazenados; registro inclui usuário não explicitamente, equipamento e data de inclusão. | Migration 011/012, repositório de imagens |
| RF-019 | O sistema deve calcular e apresentar estatísticas da matriz radiométrica. | Mínima, máxima, média, mediana, percentis 1/5/95/99, resolução e posições dos extremos são calculados; termograma marca a posição da máxima. | `termography_analysis.py`, visualização térmica |
| RF-020 | O sistema deve gerar estado térmico comparando temperatura máxima com limites do equipamento. | `NORMAL` abaixo do limite amarelo; `ALERTA` a partir do amarelo e abaixo do vermelho; `URGENTE` a partir do vermelho. São limites definidos pelo cadastro, não severidade normativa. | Upload de imagem, histórico termográfico |
| RF-021 | O sistema deve gerar uma sobreposição da matriz térmica na imagem visual usando o registro/recorte extraído do IS2. | A camada é redimensionada para a região registrada; sem recorte válido, usa quadro completo. A tela informa que diferenças de perspectiva podem afetar a posição aparente. | `termography_analysis.py`, `/sobreposicao`, histórico por equipamento |
| RF-022 | O sistema deve permitir consultar imagens termográficas por equipamento, ver imagem normal/térmica/sobreposta e filtrar histórico por data de inclusão e estado térmico. | A ordenação é da inclusão mais recente; data exibida é a inclusão no sistema, não a captura. A tela oferece carregamento adicional e filtros. | `GET /imagens-termograficas`, telas de termografia |
| RF-023 | O usuário deve poder selecionar uma área sobre a imagem visual e solicitar estatísticas térmicas da região correspondente. | Retorna mínima, máxima, média, número de pixels válidos e percentual geométrico da seleção coberto pela região térmica registrada; seleção fora da imagem/região sem pixels é rejeitada. | `POST /{id}/medir-regiao`, `thermographic_measurements.py` |
| RF-024 | O sistema deve permitir baixar, com autenticação, original, imagem normal, termograma, sobreposição e matriz CSV. | Arquivos não encontrados retornam 404; acesso é pelo registro da imagem, sem caminho arbitrário enviado pelo usuário. | `GET /imagens-termograficas/{id}/{asset}` |
| RF-025 | Quando a máxima atingir o limite amarelo, o sistema deve tentar obter da Groq um rascunho estruturado de OS usando imagem térmica, temperatura, limites e manual pesquisável disponível. | Modelo configurado no backend; rascunho inclui título, descrição, prioridade e checklist; falha da IA não desfaz o upload e é apresentada separadamente. A execução depende da chave/configuração Groq. | `groq_equipment_advisor.py`, endpoint de upload |
| RF-026 | O usuário deve poder revisar/editar o rascunho de OS termográfico antes de criar a ordem. | A interface abre formulário de OS preenchido; criação só ocorre após ação do usuário. O rascunho em si não é persistido. | `thermographic-images-page.tsx`, `create-os-modal.tsx` |
| RF-027 | O sistema deve permitir pedir orientação de manutenção para equipamento com manual PDF usando o problema relatado. | Extrai trechos de páginas relevantes, consulta Groq e valida resposta estruturada; este fluxo exige manual com texto selecionável. | `equipment.py`, `groq_equipment_advisor.py` |

## 4. Requisitos não funcionais e restrições atuais

Os limites numéricos abaixo só são declarados quando encontrados no código. Onde não há meta aprovada ou métrica instrumentada, o item é uma lacuna, não um requisito de desempenho inventado.

| ID | Requisito/restrição | Estado / critério atual |
|---|---|---|
| RNF-001 | Áreas protegidas e arquivos devem exigir autenticação; autorização administrativa deve ser verificada no backend. | JWT Bearer e controles de permissão estão implementados para usuários. Outros módulos geralmente exigem usuário autenticado, sem matriz de permissão granular completa. |
| RNF-002 | Senhas devem ser armazenadas com hash e validação de tamanho. | Argon2; políticas de 12 a 128 caracteres nos fluxos de criação/troca. |
| RNF-003 | Entradas e respostas de API devem ser validadas por esquemas. | Pydantic no backend e validação de formulário no frontend em fluxos selecionados. |
| RNF-004 | Listagens devem limitar parâmetros e evitar retorno irrestrito. | Usuários, equipamentos e OS têm limite máximo 100. Histórico termográfico aceita até 10.000 e, sem `limit`, pode não paginar; rever antes de grande volume. |
| RNF-005 | Upload IS2 deve limitar tamanho e expansão do arquivo compactado. | 50 MB enviados; 200 MB total descompactado e 100 MB por membro. Disponível apenas em ambientes de desenvolvimento/teste. |
| RNF-006 | Resultados de análise devem manter vínculo com a origem e registrar parâmetros usados. | O original é preservado; parâmetros presentes, número de curvas, unidade e estatísticas são guardados. Identidade de quem enviou, hora de captura, incerteza e versão explícita do algoritmo não são registradas no modelo atual. |
| RNF-007 | O sistema não deve inferir temperatura absoluta pelas cores RGB de uma imagem visual. | A rotina atual usa matriz radiométrica e curvas/parâmetros do IS2; arquivo sem os dados requeridos é rejeitado. Outras fontes de imagem não são suportadas. |
| RNF-008 | A interpretação automática deve ser apresentada como suporte à avaliação humana. | Limites térmicos são cadastrados por equipamento; rascunho de IA é revisável antes de gerar OS. Não há validação profissional formal ou classificação por norma implementada. |
| RNF-009 | O sistema deve tratar erros de processamento sem descartar silenciosamente arquivos aceitos. | Exceções de formato são reportadas; gravação falha limpa os arquivos recém-gerados. Se processamento falhar antes de persistir o original, o upload não é conservado como registro recuperável. |
| RNF-010 | Arquivos e referências locais devem estar disponíveis no ambiente operacional. | Imagens e manuais são gravados em diretórios locais de backend, enquanto o banco guarda nomes. Persistência em volume, compartilhamento entre instâncias, backup e restauração dependem da implantação e não estão especificados. |
| RNF-011 | A integração com IA deve manter credenciais no backend e validar saída estruturada. | Chave Groq vem de configuração do backend; resposta JSON é validada. Trechos do manual, relato e/ou termograma são transmitidos à Groq; política de privacidade/retenção precisa ser aprovada. |
| RNF-012 | A interface deve funcionar em telas responsivas usadas no projeto. | Há layout adaptável e navegação móvel. Matriz de dispositivos, acessibilidade formal e condições de uso em campo não foram definidos. |
| RNF-013 | O sistema deve atender metas de latência, disponibilidade, volume, recuperação e retenção adequadas ao contexto de operação. | Sem metas numéricas, carga de referência, SLA, RPO/RTO ou política aprovada nos artefatos atuais. Não há requisito verificável a registrar até essas metas serem definidas. |

## 5. Critérios de aceite centrais do fluxo termográfico

1. Em ambiente habilitado, um usuário autenticado seleciona equipamento com limite amarelo/vermelho e envia IS2 de até 50 MB; equipamento inexistente, sem limites, extensão incorreta, pacote inválido ou metadados radiométricos obrigatórios ausentes geram erro compreensível e não criam histórico parcial.
2. Para IS2 válido, o sistema preserva o original, gera matriz, imagem visual, termograma, sobreposição e metadados, e registra o resultado ligado ao equipamento.
3. A temperatura máxima calculada abaixo do limite amarelo resulta em `NORMAL`; a partir do amarelo resulta em `ALERTA`; a partir do vermelho resulta em `URGENTE`. Os limites apresentados correspondem ao equipamento selecionado.
4. O histórico abre imagens/derivados e mostra estatísticas e parâmetros de aquisição disponíveis. A data é identificada como data de inclusão no sistema.
5. Medição de região usa os pixels térmicos que intersectam a área selecionada e apresenta cobertura da seleção; uma região sem dados térmicos não retorna uma temperatura fictícia.
6. Atingido o limite amarelo, a geração de rascunho pode ter sucesso ou falhar sem invalidar a imagem salva. Se houver rascunho, campos são editáveis e OS só é criada após confirmação do usuário.
7. Tentativa de upload em ambiente não habilitado é recusada no backend, mesmo que a tela seja acessada diretamente.

## 6. Itens não confirmados / decisões pendentes

1. **Disponibilização:** quando e sob quais controles o upload manual sairá do modo de teste? O produto prevê importação de IS2 em operação real, captura por câmera ou integração automática?
2. **Termometria:** fabricante/modelos e formatos IS2 suportados; validação independente da fórmula e curvas; unidades, precisão, incerteza e parâmetros de aquisição adicionais a coletar (por exemplo distância e umidade).
3. **Limites e responsabilidade:** quem define/autoriza limites amarelo/vermelho por equipamento? Eles indicam triagem operacional e não equivalem a severidade normativa. Definir procedimento de revisão e eventual auditoria.
4. **Proveniência:** necessidade de guardar usuário que enviou, data/hora real da captura, modelo/serial da câmera, versão do processador e histórico das alterações de limites.
5. **Medição regional:** esclarecer aos usuários que área geométrica de cobertura não representa percentual de pixels válidos; definir se é preciso mostrar unidades/escala na sobreposição e diferenças de resolução/alinhamento aceitáveis.
6. **IA e privacidade:** autorizar envio do termograma, dados do equipamento e trechos de manual à Groq; definir retenção, tratamento de falhas, possibilidade de reprocessar rascunho e registro do aceite/edições.
7. **Acesso:** definir papéis de cliente, técnico e responsável, permissões para upload/visualização/OS e isolamento de dados por empresa, se necessário.
8. **Operação:** metas de tamanho e volume, latência, disponibilidade, backup/retensão, implantação multi-instância, controles de acesso a arquivos e requisitos de uso móvel/offline.
9. **Normas e laudos:** o código não gera laudo certificado nem implementa regra ASTM/NFPA/ISO. Adicionar conformidade ou severidade normativa exige fonte aplicável, escopo e aprovação técnica explícitos.

## 7. Rastreabilidade das fontes no repositório

- **Termografia:** `backend/app/infrastructure/thermography/termography_analysis.py`; `backend/app/presentation/http/thermographic_images.py`; esquemas `thermographic_images.py` e `thermographic_measurements.py`; `backend/app/infrastructure/persistence/postgres_thermographic_image_repository.py`; migrations 010–012; telas `frontend/components/dashboard/thermography/` e `frontend/app/(dashboard)/equipamentos/[equipmentId]/imagens/page.tsx`.
- **Equipamentos e manuais:** `backend/app/presentation/http/equipment.py`, esquemas/equipamento, repositório de equipamento e `frontend/components/dashboard/equipment/`.
- **OS, usuários e dashboard:** `backend/app/presentation/http/`, `backend/app/domain/entity/service_order.py`, repositórios PostgreSQL e componentes `frontend/components/dashboard/service-orders/`, `users/` e dashboard.
- **IA:** `backend/app/infrastructure/ai/groq_equipment_advisor.py` e configuração em `backend/app/core/config.py`.
- **Requisitos anteriores e contexto do produto:** `docs/REQUISITOS_FUNCIONAIS_E_NAO_FUNCIONAIS.md` (esta revisão substitui o conteúdo anterior), `TAP_PredictAI_Thermography.docx` e `frontend/README.md`. Artefatos de skills legadas não foram tratados como requisitos aprovados.

## 8. Aprovação da baseline

| Responsável | Decisão | Data | Observações |
|---|---|---|---|
| Product Owner / representante do negócio | Pendente | — | Validar escopo, atores, limites operacionais e prioridades. |
| Responsável técnico de termografia | Pendente | — | Validar conversão radiométrica, proveniência, interpretação e limites. |
| Equipe técnica | Pendente | — | Validar arquitetura, segurança operacional e metas de qualidade. |
