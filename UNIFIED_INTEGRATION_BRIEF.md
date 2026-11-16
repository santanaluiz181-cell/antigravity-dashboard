# UNIFIED INTEGRATION BRIEF — Antigravity Dashboard + SuperAntigravityTJTO + Gaussian Splat 2.5D

> **Regra de Arquitetura Única:** `E:\Downloads_C\Antigravity Dashboard` é a **estação visual e orquestradora unificada** (`http://localhost:5175` + Hono API `http://127.0.0.1:4320`). `E:\Downloads_C\SuperAntigravityTJTO` é a **camada de motores Python/GPU, skills e regras**. Ambos trabalham juntos sem duplicar painéis e **sem nunca tocar em binários oficiais** (`agy.exe`, `.dll`, `.asar`).

---

## 1. Motores Staged em `E:\Downloads_C\Antigravity Dashboard\engines\gaussian-splat-25d\`

Todos os artefatos validados nos Gates 1 e 2 (6/6 testes passando em **Option A `wgpu` Vulkan** e **Option C `ROCm gfx1032`** na **AMD Radeon RX 6600**, com `0` fallbacks de CPU) foram migrados para dentro deste repositório:

- [engines/gaussian-splat-25d/train.py](file:///e:/Downloads_C/Antigravity%20Dashboard/engines/gaussian-splat-25d/train.py) — Codificador universal `any_image` Dual-Backend (`--backend auto | rocm | wgpu`, `--aspect auto|16:9|9:16|1:1|4:5|W:H`, `--image-b` para morphing A->B, `--nmax 800..3000` para modo compacto ou até `100000`). Emite `snapshots.bin`, `meta.json`, `blobs.json`, `blobs.svg`, `morph_ab.json` e `final-render.png`. Bloqueia `directml` (`exit 4`) e qualquer op em CPU (`exit != 0`).
- [engines/gaussian-splat-25d/depth.py](file:///e:/Downloads_C/Antigravity%20Dashboard/engines/gaussian-splat-25d/depth.py) — Extrator universal `Depth Anything V2 Small` + máscara limpa de sujeito (`depth-mask.png`, `depth-tex.f32`, `depth.bin`), sem heurísticas faciais nem skull-shell.
- [engines/gaussian-splat-25d/viewer_25d.html](file:///e:/Downloads_C/Antigravity%20Dashboard/engines/gaussian-splat-25d/viewer_25d.html) — Visualizador WebGL2 standalone limpo (suporte a `uAspect` dinâmico, métricas `sobel_edge` e `laplacian_detail`, sem `uBlink`/`uSmile`/`uBack`).
- [engines/gaussian-splat-25d/remotion_gaussian_splat_25d.tsx](file:///e:/Downloads_C/Antigravity%20Dashboard/engines/gaussian-splat-25d/remotion_gaussian_splat_25d.tsx) — Componente React/WebGL2 + Remotion (`GaussianSplat25DScene`) a 60fps com Z-Sandwich (`Z=5` background splats, `Z=15` tipografia atrás do sujeito, `Z=25` foreground subject splats com paralaxe 2.5D e morphing `A -> B`).
- [engines/gaussian-splat-25d/test_gaussian_splat_dual_backend.py](file:///e:/Downloads_C/Antigravity%20Dashboard/engines/gaussian-splat-25d/test_gaussian_splat_dual_backend.py) — Suíte de regressão + mutação negativa (`Ran 6 tests — OK`).
- [engines/gaussian-splat-25d/bench_option_a_wgpu.py](file:///e:/Downloads_C/Antigravity%20Dashboard/engines/gaussian-splat-25d/bench_option_a_wgpu.py) & [bench_option_c_rocm_gfx1032.py](file:///e:/Downloads_C/Antigravity%20Dashboard/engines/gaussian-splat-25d/bench_option_c_rocm_gfx1032.py) — Micro-benchmarks RX 6600 (`10.804 ms/step` em `wgpu` Vulkan / `8.448 ms/step` em `ROCm gfx1032`).

### Intérpretes Python Verificados na Máquina (RX 6600)
- **Option C (`ROCm 10.0 gfx1032` nativo — `cuda:0` RX 6600):**
  `E:\Downloads_C\VoiceStudio\.venv\Scripts\python.exe` (`torch 2.13.0+rocm10.0.0`, `amd-torch-device-gfx1032`)
- **Option A (`wgpu 0.33.0` Vulkan `1.4.315`):**
  `C:\Users\tharcio\.gemini\antigravity\brain\d8727669-711a-46d0-bc14-e68d40774a68\scratch\venv_py311\Scripts\python.exe` (ou instalar `wgpu numpy pillow scipy` no Python 3.12 padrão `C:\Users\tharcio\AppData\Local\Programs\Python\Python312\python.exe`).

---

## 2. Motores de Mídia, GPU e Grafo de Conhecimento (`SuperAntigravityTJTO\tools\`)

Todos os scripts locais já existem e foram validados em disco:
- `E:\Downloads_C\SuperAntigravityTJTO\tools\watch_video.py` (`--gpu auto --ocr-dml --transcribe` — download yt-dlp de Instagram Reels / YouTube + decodificação `d3d11va` + OCR DirectML + ASR GPU).
- `E:\Downloads_C\SuperAntigravityTJTO\tools\gpu_asr.py` (`ggml_vulkan` na GPU, `max_len=1` timestamps por palavra).
- `E:\Downloads_C\SuperAntigravityTJTO\tools\semantic_lookup.py` (busca semântica e léxica offline para cruzar tópicos entre transcrições de Reels, YouTube e reuniões).
- `E:\Downloads_C\SuperAntigravityTJTO\tools\skills_pruner.py` (auditoria de bloat e quarentena reversível de skills).

---

## 3. Pontos de Integração neste Workspace (`E:\Downloads_C\Antigravity Dashboard`)

1. **`server/paths.ts`**:
   - Adicionar `SUPER_TJTO_TOOLS_DIR` apontando para `E:\Downloads_C\SuperAntigravityTJTO\tools` (ou fallback via `DATA_PATHS.tjtoPluginDir/tools`), plus `watchVideoScript`, `semanticLookupScript`, `gaussianSplatEngineDir` (`engines/gaussian-splat-25d`), e os caminhos dos interpretadores Python (`ROCM_PYTHON` e `SYSTEM_PYTHON`).
   - Manter `assertNeverTouchesOfficialBinaries()` intacto.

2. **`server/index.ts` & `server/services/`**:
   - **Vault de Conhecimento Reels / YouTube / Reuniões:**
     - Criar `server/services/mediaKnowledgeVault.ts` + rotas `GET /api/media/vault`, `POST /api/media/ingest-video`, `GET /api/media/graph`.
     - Ao receber URL do Instagram Reels / YouTube ou arquivo local, executar `watch_video.py --gpu auto --ocr-dml --transcribe` -> extrair transcrição, OCR de tela, hooks, entidades -> indexar em SQLite (`backups/knowledge_vault.db` com FTS5 + arestas semânticas `edges` entre vídeos/reuniões via `semantic_lookup.py` ou similaridade TF-IDF/tokens) -> gerar ações MCP em estado `PENDING_HUMAN_APPROVAL` (reaproveitando o gate de aprovação humana do `meetingPipeline.ts`).
   - **Gaussian Splat 2.5D Studio:**
     - Criar rota `POST /api/splat/encode` executando `engines/gaussian-splat-25d/train.py --backend auto` (com suporte a `--image`, `--image-b`, `--aspect`, `--nmax`) e servir os artefatos gerados em `/api/splat/runs/:runId/*` (`blobs.json`, `blobs.svg`, `snapshots.bin`, `depth-tex.f32`, `meta.json`).

3. **Frontend (`src/components/` & `src/App.tsx`)**:
   - **Expandir `Module4PostMeetingMvp.tsx` -> Knowledge Hub (Reels + YouTube + Reuniões):**
     - Campo para colar URL de **Instagram Reels / YouTube** + drop de vídeo/áudio local.
     - Visão de **Grafo / Conexões de Conhecimento** mostrando quais Reels, vídeos do YouTube e reuniões compartilham os mesmos temas/hooks/entidades, com citações de OCR e timestamp.
     - Manter trava **Human-in-the-Loop** (`PENDING_HUMAN_APPROVAL` -> clique explícito para disparar MCP `@claude-mem` / `sqlite`).
   - **Conectar `AntigravityMotionPlayer.tsx` (ou nova sub-aba 2.5D Studio):**
     - Permitir enviar qualquer imagem ou frame de Reel/YouTube direto para `POST /api/splat/encode` e pré-visualizar o reveal 2.5D e o componente `GaussianSplat25DScene` (`engines/gaussian-splat-25d/remotion_gaussian_splat_25d.tsx`) dentro da estética **Antigravity Onyx** (`#0B0D10` / `#13161B` / `#232832`).
   - Atualizar `src/data/staticShowcaseData.ts` caso o GitHub Pages rode sem daemon `:4320` (fallback determinístico sem quebrar o build).
