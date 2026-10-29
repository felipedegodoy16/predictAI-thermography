# SKILL: Arquiteto UI/UX Mobile-First e Minimalismo Industrial

```yaml
name: mobile-first-ux-architect
description: Skill procedural para modelagem de interfaces web móveis voltadas a técnicos de campo, aplicando as Leis de UX para eliminação de ruído informacional.
version: 1.0.0
author: Software Engineering Agent
category: Frontend Engineering / Mobile UX
```

## 1. Contexto e Propósito
Orientar a criação de componentes de interface Web (Next.js, Tailwind CSS) otimizados para smartphones e tablets em ambientes industriais adversos (alta luminosidade solar, uso de luvas, rede instável).

---

## 2. Aplicação Prática das Leis de UX

### 2.1. Lei de Hick (Tomada de Decisão)
* *Princípio*: O tempo para tomar uma decisão aumenta com o número e complexidade das escolhas.
* *Aplicação*: Esconder barras laterais e menus secundários durante a inspeção. Exibir na tela apenas 3 dados fundamentais:
  1. Viewport Térmico com realce do Ponto Quente ($T_{	ext{max}}$).
  2. Valor do Gradiente Térmico ($\Delta T$).
  3. Badge de Severidade (Normal / Atenção / Crítico).

### 2.2. Lei de Fitts (Ergonomia ao Toque)
* *Princípio*: O tempo para atingir um alvo é função da distância e do tamanho do alvo.
* *Aplicação*:
  * Posicionar botões de ação primária (ex: "Confirmar Ponto", "Gerar Laudo") no terço inferior da tela (*Thumb Zone*).
  * Dimensão mínima de áreas clicáveis: **$48 	imes 48	ext{px}$** com espaçamento generoso para operação com luvas.

### 2.3. Lei de Miller (Capacidade de Memória)
* *Princípio*: A memória de trabalho armazena em média $7 \pm 2$ blocos de informação.
* *Aplicação*: Organizar parâmetros radiométricos em cartões expansíveis (*accordion*) contendo no máximo 4 controles visuais por grupo (Emissividade, Temp. Refletida, Distância, Paleta).

### 2.4. Lei de Jakob (Padrões Familiares)
* *Princípio*: Usuários transferem expectativas de outros apps populares.
* *Aplicação*: Utilizar navegação por abas na parte inferior (*Bottom Navigation Bar*) e gestos de *Swipe* para alternar entre foto visual e imagem térmica.

---

## 3. Requisitos Tecnológicos e Offline

1. **Progressive Web App (PWA)**:
   * Manifest PWA completo e *Service Workers* para permitir instalação como aplicativo nativo.
2. **Persistência Local (IndexedDB)**:
   * Armazenamento offline de imagens térmicas e metadados quando o técnico estiver em subestações sem cobertura de rede.
3. **Renderização de Paletas no Cliente (WebGL / Canvas 2D)**:
   * Troca instantânea de paletas de cores (*Ironbow*, *Rainbow*, *Black-Hot*, *White-Hot*) diretamente no dispositivo sem requisições HTTP adicionais.
