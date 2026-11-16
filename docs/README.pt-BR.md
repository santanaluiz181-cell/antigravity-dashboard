<div align="center">

<img src="./assets/logo.svg" alt="Antigravity Dashboards & Motion Studio Logo" width="108" height="108" />

# Google Antigravity: Dashboards, Context & Motion Studio

**[English](../README.md) | [简体中文](./README.zh-CN.md) | [Português](./README.pt-BR.md)**

**[Página Interativa no GitHub Pages → https://santanaluiz181-cell.github.io/antigravity-dashboard/](https://santanaluiz181-cell.github.io/antigravity-dashboard/)**

Construa dashboards locais vivos, isole o bloat de contexto, inspecione fontes SQLite Read-Only, cruze conhecimentos de vídeos/reuniões via GPU e renderize Gaussian Splats 2.5D dentro do sistema visual oficial do `antigravity.google`.

<br />

<img src="./assets/antigravity-hero.svg" alt="Antigravity Dashboards & Motion Showcase" width="100%" />

</div>

---

## Construído em Código, Ancorado em Fontes Reais

Inspirado pelo fluxo do **Claude Dashboards & Motion** (`claude.com/resources/articles/dashboards-and-motion`) e do **Claude Code Dashboards**, reconstruído nativamente com a tipografia, paleta de superfícies e física de partículas reativas ao mouse extraídas via `/REA` do **`https://antigravity.google/`**.

Cada métrica, gráfico e ação MCP expõe o caminho exato no Windows e a query SQLite Read-Only que originou os números.

* **Zero Modificação de Binários (Seguro sob ToS Seção 6)**: Opera como estação web local externa (`Hono` em `:4320` + `Vite / React 19` em `:5175`). Jamais modifica `~/.gemini/bin/agy.exe` ou pacotes `.asar` (`assertNeverTouchesOfficialBinaries()` em [server/paths.ts](../server/paths.ts)).

---

## 5 Estágios Interativos de Produção

### Estágio 01: Controle de Bloat de Contexto e Tokens
* Monitora `~/.gemini/config/skills` e pastas de plugins (`SuperAntigravityTJTO`, `science`) para detectar skills duplicadas e prompts maiores que 250 linhas.
* **Presets Atômicos em 1 Clique** (`Coding Lean`, `Frontend Craft`, `Jornalismo TJTO`, `Vídeo / B-Roll`, `Restauração Total`) com verificação SHA-256 e quarentena segura.

### Estágio 02: Sessões em Tempo Real, Kitsune & Billion-Context
* Acompanha a trajetória viva da IA em `transcript.jsonl`.
* Sonda daemons locais: **Kitsune Router** (`127.0.0.1:4319`), **claude-mem** (`127.0.0.1:37777`) e **MJ Notch Companion** (`127.0.0.1:49211`).
* Carrega o grafo de AST `.graphify.json` e o mapa de símbolos `PROJECT_MAP.md` (-98.5% de consumo de tokens).

### Estágio 03: Dashboards Vivos & Inspetor SQL Read-Only
* Monte tabelas instantâneas arrastando `.csv` ou `.json` com o `node:sqlite` nativo.
* Editor SQL protegido por `assertReadOnlySelectSql()` (apenas comandos `SELECT` e `WITH`).

### Estágio 04: Cofre de Mídia & Conhecimento GPU (Reels, YouTube & Reuniões)
* Ingestão de URLs de **Instagram Reels**, **YouTube** ou áudio/vídeo local.
* Processamento local via `watch_video.py --gpu auto --ocr-dml --transcribe` + `gpu_asr.py` (`ggml_vulkan` em AMD RX 6600, NVIDIA ou Intel Arc).
* Transcrição palavra por palavra, OCR de frames de vídeo e grafo semântico cruzando conhecimentos de reuniões e vídeos.
* **Portão de Aprovação Humana Obrigatório**: Ações MCP sugeridas ficam bloqueadas em `PENDING_HUMAN_APPROVAL` até o clique físico do usuário.

### Estágio 05: Estúdio 2.5D Gaussian Splat & Antigravity Motion
* Renderizador e estimador de profundidade 2.5D Gaussian Splat via `engines/gaussian-splat-25d/train.py`.
* Aceleração 100% em GPU via **ROCm gfx1032** ou **Vulkan wgpu** (CPU e DirectML bloqueados para evitar travamentos).
* Visualizador WebGL2 orbital e exportação direta para código **Remotion** (`remotion_gaussian_splat_25d.tsx`).

---

## Turbinando com o Kitsune Router (Multi-LLM & Anti-429)

Este dashboard integra perfeitamente com o **[Kitsune Router](https://github.com/santanaluiz181-cell/kitsune-router)**, um despachante de prompts e ponte MCP local de altíssima performance:

* **Agrupamento de Contas Gratuitas**: Alterna entre múltiplas chaves do Google AI Studio, contas Google OAuth, NVIDIA Nemotron e modelos locais do Ollama.
* **Tolerância a Falhas 429**: Troca de conta ou provedor automaticamente assim que uma cota atinge o limite, sem interromper o trabalho.
* **PrivacyGuard**: Mantém códigos judiciais, segredos ou dados confidenciais estritamente em modelos locais offline (`ollama/qwen2.5-coder:14b`), liberando apenas tarefas públicas para os modelos de nuvem.
* **Compact Pill HUD**: Badge flutuante em tempo real (`http://127.0.0.1:4319/?mode=pill`) com animações da mascote, status de roteamento e economia de tokens.

👉 **Baixe o Kitsune Router**: Clone e execute o projeto oficial em **[https://github.com/santanaluiz181-cell/kitsune-router](https://github.com/santanaluiz181-cell/kitsune-router)**.

---

## Execução Rápida

```powershell
# 1. Instalar dependências
npm install

# 2. Rodar testes de validação e segurança
npm test

# 3. Iniciar API Backend (:4320) + Studio Frontend (:5175)
npm run dev
```

Abra `http://localhost:5175` no navegador.
