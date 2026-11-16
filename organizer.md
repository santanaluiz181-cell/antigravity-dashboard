# Auto-Organizer Checkpoint: Antigravity Dashboard + SuperAntigravityTJTO + Gaussian Splat 2.5D

## 1. Meta Geral
Estação unificada (`http://localhost:5175` + Hono API `http://127.0.0.1:4320`) conectando:
- **Context & Token-Bloat Control** (`tokenScanner.ts`, `profileManager.ts`)
- **Knowledge Hub (Reels + YouTube + Meetings)** (`mediaKnowledgeVault.ts`, `watch_video.py --gpu auto --ocr-dml --transcribe`, `gpu_asr.py`, SQLite `backups/knowledge_vault.db` com grafo cruzado e trava `PENDING_HUMAN_APPROVAL`)
- **Gaussian Splat 2.5D Studio** (`splatEngineService.ts`, `engines/gaussian-splat-25d/train.py --backend auto` em ROCm `gfx1032` / `wgpu` Vulkan na RX 6600, hard-abort em `directml`/`cpu`, preview `viewer_25d.html` e Z-Sandwich `remotion_gaussian_splat_25d.tsx`)
- **Zero Binary Patching**: `assertNeverTouchesOfficialBinaries()` em `server/paths.ts` bloqueia qualquer modificação em `agy.exe`, `.dll`, `.asar`.

## 2. Novos Arquivos & Rotas Integradas
- [server/paths.ts](file:///e:/Downloads_C/Antigravity%20Dashboard/server/paths.ts): Registrados `SUPER_TJTO_TOOLS_DIR`, `GAUSSIAN_SPLAT_ENGINE_DIR`, `ROCM_PYTHON`, `WGPU_PYTHON`, `knowledgeVaultDb`, `splatRunsDir`.
- [server/services/mediaKnowledgeVault.ts](file:///e:/Downloads_C/Antigravity%20Dashboard/server/services/mediaKnowledgeVault.ts): `GET /api/media/vault`, `POST /api/media/ingest-video`, `GET /api/media/graph`, `POST /api/media/approve-action`.
- [server/services/splatEngineService.ts](file:///e:/Downloads_C/Antigravity%20Dashboard/server/services/splatEngineService.ts): `GET /api/splat/runs`, `POST /api/splat/encode`, `GET /api/splat/viewer`, `GET /api/splat/runs/:runId/:fileName`.
- [src/components/Module4PostMeetingMvp.tsx](file:///e:/Downloads_C/Antigravity%20Dashboard/src/components/Module4PostMeetingMvp.tsx): Evoluído para Knowledge Hub (Reels + YouTube + Meetings + Grafo + Human Gate).
- [src/components/AntigravityMotionPlayer.tsx](file:///e:/Downloads_C/Antigravity%20Dashboard/src/components/AntigravityMotionPlayer.tsx): Sub-aba `2.5D Gaussian Splat Studio` integrada.

## 3. Verificação
- `npm test`: `8 passed (8)` em `tests/dashboard.test.ts` (incluindo testes negativos de `PENDING_HUMAN_APPROVAL` e `HARD_ABORT_BANNED_BACKEND` para `directml`/`cpu`).
- `npm run build`: TypeScript + Vite production build limpo.
