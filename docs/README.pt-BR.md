# Antigravity Control & Data Studio

[English](../README.md) | [简体中文](./README.zh-CN.md) | [Português](./README.pt-BR.md)

Estação local independente para auditar o orçamento de tokens do Google Antigravity, eliminar colisão de skills e servidores MCP, inspecionar sessões `transcript.jsonl`, validar linhagem de dados em SQLite Read-Only e aprovar ações pós-reunião transcritas via GPU Vulkan.

Opera como aplicação web local externa (`Hono` na porta `:4320` + `Vite / React 19` na porta `:5175`). **Jamais modifica ou aplica patch** em `~/.gemini/bin/agy.exe` ou pacotes `.asar` (100% compatível com a Seção 6 dos Termos de Serviço do Google Antigravity).

---

## O Problema que Resolve

Quando `~/.gemini/config/skills` e pastas de plugins (`SuperAntigravityTJTO`, `science`) acumulam skills repetidas ou arquivos de regras acima de 250 linhas, o índice do prompt de sistema estoura o teto de contexto. Quando isso ocorre, o Antigravity remove silenciosamente subagentes críticos (`browser`, `research`) e skills (`super-render`, `ultimate-research`) da sessão.

Este painel mede a pegada exata no disco e permite estacionar skills duplicadas em quarentena verificada por SHA-256 com 1 clique.

---

## Módulos Principais

1. **Context & Token-Bloat Control**: Varre skills globais, plugins, builtin, `GEMINI.md`, `AGENTS.md` e `mcp_config.json`. Marca arquivos acima de `250 linhas`, aponta colisões duplicadas e aplica presets (`Coding Lean`, `Frontend Craft`, `Journalism & TJTO`, `Video / B-Roll`, `Full Restore`) com backup atômico.
2. **Live Sessions, Kitsune & Context Engines**: Lê `~/.gemini/antigravity/brain/<id>/.system_generated/logs/transcript.jsonl`, monitora **Kitsune Router** (`:4319`), **claude-mem** (`:37777`), **MJ Notch Companion** (`:49211`), `.graphify.json` (`Graphify AST`) e `PROJECT_MAP.md` (`Cartographer`, `-98.3%` tokens).
3. **Data Workbench & Read-Only SQL Sources**: Recebe arquivos `.csv` e `.json` via drag-and-drop no motor nativo `node:sqlite` (`DatabaseSync`), exibindo gráfico e tabela à esquerda e a query SQL Read-Only (`SELECT`/`WITH`) e linhagem de colunas à direita.
4. **Post-Meeting Executor**: Envia áudio de reunião para `tools/gpu_asr.py` (`ggml_vulkan` GPU), extrai resumo, decisões e tarefas, e bloqueia disparos MCP até aprovação explícita por clique humano (`PENDING_HUMAN_APPROVAL`).

---

## Execução Rápida

```powershell
npm install
npm test
npm run dev
```

Acesse `http://localhost:5175`.
