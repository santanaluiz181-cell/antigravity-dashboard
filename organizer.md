# Auto-Organizer Checkpoint — Antigravity Dashboard

## 1. Meta Geral
Construir o **Antigravity Dashboard** local standalone (inspirado em Claude Code Dashboards + Claude Dashboards + Post-Meeting Executor MVP) com estética oficial **Google Antigravity Nov-2026 Onyx (`#0B0D10` / `#13161B` / `#232832`)**, sem jamais modificar ou aplicar patch em binários oficiais (`agy.exe` / `.asar`), respeitando integralmente o ToS Section 6.

## 2. Arquivos Criados / Modificados
- [package.json](file:///e:/Downloads_C/Antigravity%20Dashboard/package.json), [tsconfig.json](file:///e:/Downloads_C/Antigravity%20Dashboard/tsconfig.json), [vite.config.ts](file:///e:/Downloads_C/Antigravity%20Dashboard/vite.config.ts), [vitest.config.ts](file:///e:/Downloads_C/Antigravity%20Dashboard/vitest.config.ts), [index.html](file:///e:/Downloads_C/Antigravity%20Dashboard/index.html)
- [server/paths.ts](file:///e:/Downloads_C/Antigravity%20Dashboard/server/paths.ts) — Guardas de segurança contra modificação de binários (`assertNeverTouchesOfficialBinaries`) e resolução de caminhos Windows.
- [server/services/tokenScanner.ts](file:///e:/Downloads_C/Antigravity%20Dashboard/server/services/tokenScanner.ts) — Varredura de skills globais, plugins (`SuperAntigravityTJTO`, `science`), builtin, regras (`GEMINI.md`, `AGENTS.md`) e `mcp_config.json`, detectando prompts `>250 linhas` e colisões duplicadas.
- [server/services/profileManager.ts](file:///e:/Downloads_C/Antigravity%20Dashboard/server/services/profileManager.ts) — Presets de 1 clique (`coding-lean`, `frontend-craft`, `journalism-tjto`, `video-broll`, `full-restore`) com backup atômico SHA-256 e quarentena reversível.
- [server/services/transcriptReader.ts](file:///e:/Downloads_C/Antigravity%20Dashboard/server/services/transcriptReader.ts) — Leitor de `brain/<id>/.system_generated/logs/transcript.jsonl`, artefatos HTML (`/generative_ui`) e ponte Kitsune Router (`:4319`) + MJ Notch (`:49211`).
- [server/services/sqliteInspector.ts](file:///e:/Downloads_C/Antigravity%20Dashboard/server/services/sqliteInspector.ts) — Motor nativo `node:sqlite` (`DatabaseSync`) para ingestão de CSV/JSON/SQLite e inspeção de linhagem SQL Read-Only (`SELECT`/`WITH`).
- [server/services/meetingPipeline.ts](file:///e:/Downloads_C/Antigravity%20Dashboard/server/services/meetingPipeline.ts) — Pipeline pós-reunião roteado para `tools/gpu_asr.py` (`ggml_vulkan` GPU) com extração de decisões e portão obrigatório de clique humano (`PENDING_HUMAN_APPROVAL`).
- [server/index.ts](file:///e:/Downloads_C/Antigravity%20Dashboard/server/index.ts) — API Hono na porta `4320`.
- [src/App.tsx](file:///e:/Downloads_C/Antigravity%20Dashboard/src/App.tsx), [src/styles/onyx.css](file:///e:/Downloads_C/Antigravity%20Dashboard/src/styles/onyx.css) e componentes modulares em `src/components/*`.
- [tests/dashboard.test.ts](file:///e:/Downloads_C/Antigravity%20Dashboard/tests/dashboard.test.ts) — Suíte `vitest` com asserções positivas, negativas e de mutação.

## 3. Decisões Arquiteturais Fixadas
1. **Zero Binary Patching (ToS Section 6 Safe):** Proibido tocar em `agy.exe` ou binários do IDE; controle de bloat opera exclusivamente via configurações documentadas e quarentena reversível com verificação SHA-256.
2. **SQLite Nativo Node v26 (`node:sqlite`):** Uso de `DatabaseSync` nativo sem dependência de compilação C++ (`node-gyp`), com bloqueio estrito contra queries mutáveis no painel Sources.
3. **Mídia GPU First & Human Gate:** Transcrição conectada a `tools/gpu_asr.py` (`ggml_vulkan`) e ações MCP bloqueadas até aprovação explícita por clique humano.

## 4. Estado Atual
- Suíte de testes (`vitest run`) validada com 100% de aprovação (6/6 testes, incluindo asserções negativas de segurança e SQL injection).
- Build TypeScript + Vite (`npm run build`) validado.

## 5. Próximo Passo Imediato
Iniciar o servidor local (`npm run dev`) em `http://localhost:5175` (API em `http://127.0.0.1:4320`) e utilizar o preset **Coding Lean** para quarentenar skills duplicadas quando desejado.
