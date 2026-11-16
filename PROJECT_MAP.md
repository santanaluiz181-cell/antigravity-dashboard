# CARTOGRAPHER — MAPA ARQUITETURAL DA CODEBASE (AST)
**Raiz:** `E:\Downloads_C\Antigravity Dashboard` | **Arquivos Mapeados:** 43 | **Linhas:** 16,459
**Economia Map-First:** Varredura cega ~156,949 tokens vs Mapa ~2,427 tokens (**154,522 tokens economizados / -98.5%**)

> **Regra Map-First:** Use os intervalos `Lstart-Lend` abaixo com `read_file(StartLine, EndLine)`. Proibido ler arquivos >80 linhas por inteiro.

---
### `/`
- **.graphify.json** (1160 linhas, 24.8 KB)
- **README.md** (122 linhas, 7.3 KB)
- **UNIFIED_INTEGRATION_BRIEF.md** (56 linhas, 6.8 KB)
- **index.html** (19 linhas, 0.9 KB)
- **organizer.md** (19 linhas, 2.3 KB)
- **package-lock.json** (3904 linhas, 125.1 KB)
- **package.json** (34 linhas, 0.9 KB)
- **tsconfig.json** (17 linhas, 0.4 KB)
- **vite.config.ts** (18 linhas, 0.4 KB)
- **vitest.config.ts** (9 linhas, 0.2 KB)

### `backups`
- **meetings_ledger.json** (35 linhas, 1.2 KB)

### `docs`
- **README.pt-BR.md** (47 linhas, 2.4 KB)
- **README.zh-CN.md** (85 linhas, 6.2 KB)

### `engines/gaussian-splat-25d`
- **bench_option_a_wgpu.py** (379 linhas, 16.7 KB) → Funções: `main (L255-L376)`
- **bench_option_c_rocm_gfx1032.py** (118 linhas, 4.7 KB) → Classes: `StrictROCmDispatchAuditor (L10-L43)`; Funções: `StrictROCmDispatchAuditor.__init__ (L11-L13), StrictROCmDispatchAuditor.__torch_dispatch__ (L15-L43), main (L45-L115)`
- **depth.py** (189 linhas, 8.5 KB) → Funções: `compute_sobel_norm (L20-L25), estimate_depth_map (L28-L56), extract_clean_subject_mask (L59-L85), run_depth_pipeline (L88-L167), main (L170-L185)`
- **remotion_gaussian_splat_25d.tsx** (467 linhas, 15.2 KB) → Funções: `compileProgram (L164-L182), compile (L165-L173), decodeSnapshotRecordToInstanceBuffer (L187-L230), buildInstanceBufferFromJSON (L235-L266), renderPass (L343-L402), bindAttr (L363-L367)`; Exports: `GaussianBlobEntry, CompactBlobsJSON, GaussianSplat25DProps, decodeSnapshotRecordToInstanceBuffer, buildInstanceBufferFromJSON, GaussianSplat25DScene`
- **test_gaussian_splat_dual_backend.py** (174 linhas, 7.2 KB) → Classes: `TestGaussianSplatDualBackendGate2 (L26-L170)`; Funções: `_load_mod (L16-L20), TestGaussianSplatDualBackendGate2.setUp (L27-L41), TestGaussianSplatDualBackendGate2.tearDown (L43-L44), TestGaussianSplatDualBackendGate2.test_01_dynamic_aspect_ratios (L46-L53), TestGaussianSplatDualBackendGate2.test_02_error_map_weighted_pick_window (L55-L64), TestGaussianSplatDualBackendGate2.test_03_universal_depth_and_clean_mask_no_skull_shell (L66-L78), TestGaussianSplatDualBackendGate2.test_04_stripped_facial_heuristics_and_shaders (L80-L101), TestGaussianSplatDualBackendGate2.test_05_negative_mutation_hard_abort_directml_and_cpu_fallback (L103-L146), TestGaussianSplatDualBackendGate2.test_06_end_to_end_cli_and_ab_morph_export (L148-L170)`
- **train.py** (1094 linhas, 45.2 KB) → Funções: `parse_aspect_and_crop (L31-L53), stage_height (L56-L58), compute_numpy_sobel_energy (L61-L69), pick_window (L72-L101), pair_blobs_for_morph (L104-L118), pack_snapshot_record (L121-L132), export_compact_json_and_svg (L135-L213), run_wgpu_engine (L479-L635), run_rocm_engine (L641-L930), select_and_run_backend (L933-L964), main (L967-L1090)`
- **viewer_25d.html** (292 linhas, 22.2 KB)

### `server`
- **index.ts** (352 linhas, 11.5 KB) → Rotas: `GET /api/bloat/scan (L56-L65), POST /api/bloat/preset (L67-L84), GET /api/sessions/overview (L87-L101), GET /api/sessions/:conversationId/transcript (L103-L107), GET /api/sessions/artifact-preview (L109-L120), GET /api/datasources/list (L123-L129), POST /api/datasources/ingest (L131-L156), POST /api/datasources/query (L158-L169), GET /api/meetings/list (L172-L188), POST /api/meetings/process (L190-L219), POST /api/meetings/approve-action (L221-L236), GET /api/media/vault (L239-L247)`; Exports: `app`
- **paths.ts** (81 linhas, 4.2 KB) → Funções: `normalizeWinPath (L49-L55), assertNeverTouchesOfficialBinaries (L57-L68), isAllowedReadPath (L70-L81)`; Exports: `USER_HOME, GEMINI_ROOT, ANTIGRAVITY_DIR, CONFIG_DIR, WORKSPACE_ROOT, BACKUPS_DIR, SAME_DRIVE_QUARANTINE_DIR, SUPER_TJTO_TOOLS_DIR, GAUSSIAN_SPLAT_ENGINE_DIR, ROCM_PYTHON`

### `server/services`
- **mediaKnowledgeVault.ts** (513 linhas, 17.7 KB) → Funções: `getVaultDb (L54-L94), extractTopicsAndEntities (L101-L105), insertNodeAndEdges (L143-L239), seedInitialVaultIfEmpty (L241-L301), getKnowledgeVaultSnapshot (L303-L308), ingestVideoToVault (L357-L362), approveOrRejectVaultAction (L461-L513)`; Exports: `VaultSourceType, OcrHighlight, VaultNodeRecord, VaultEdgeRecord, VaultStagedMcpAction, extractTopicsAndEntities, getKnowledgeVaultSnapshot, approveOrRejectVaultAction`
- **meetingPipeline.ts** (213 linhas, 7.1 KB) → Funções: `getMeetingsStoragePath (L36-L39), persistMeetingsStore (L41-L44), loadMeetingsStore (L46-L60), extractStructuredMeetingIntelligence (L62-L133), transcribeAudioViaGpuAsr (L135-L170), approveOrRejectStagedAction (L172-L213)`; Exports: `StagedMcpAction, MeetingSessionRecord, loadMeetingsStore, extractStructuredMeetingIntelligence, approveOrRejectStagedAction`
- **profileManager.ts** (324 linhas, 11.5 KB) → Funções: `withProfileLock (L98-L108), ensureBackupDirs (L110-L117), getLedgerPath (L119-L122), getActiveStatePath (L124-L127), readQuarantineLedger (L129-L137), writeQuarantineLedger (L139-L143), getActiveProfileState (L145-L145), moveDirectoryAtomic (L157-L182), applyProfilePreset (L184-L324)`; Exports: `ProfilePreset, PROFILE_PRESETS, QuarantineLedgerEntry, ProfileApplyResult, readQuarantineLedger, getActiveProfileState`
- **splatEngineService.ts** (209 linhas, 6.6 KB) → Funções: `assertValidSplatBackend (L41-L52), resolveSplatPythonInterpreter (L54-L64), runGaussianSplatEncode (L66-L145), listSplatRuns (L147-L182), resolveSplatArtifactFile (L184-L184)`; Exports: `AllowedSplatBackend, SplatEncodeRequest, SplatRunMetadata, assertValidSplatBackend, resolveSplatPythonInterpreter, listSplatRuns, resolveSplatArtifactFile`
- **sqliteInspector.ts** (319 linhas, 10.1 KB) → Funções: `assertReadOnlySelectSql (L40-L61), sanitizeIdentifier (L63-L71), parseCsvLine (L73-L95), inferSqlType (L97-L117), ingestStructuredRecords (L119-L191), ingestCsvContent (L193-L210), executeDatasetQuery (L212-L257), listDatasets (L259-L259), ensureDefaultBootDataset (L269-L269)`; Exports: `ColumnSchema, DataSourceQueryResult, assertReadOnlySelectSql, sanitizeIdentifier, parseCsvLine, ingestStructuredRecords, ingestCsvContent, executeDatasetQuery, listDatasets, ensureDefaultBootDataset`
- **tokenScanner.ts** (332 linhas, 11.4 KB) → Funções: `estimateTokensFromText (L41-L50), countLines (L52-L57), extractFrontmatterDescription (L59-L73), scanSkillFolder (L75-L125), scanRuleFiles (L127-L166), scanMcpServers (L168-L228), annotateDuplicates (L230-L261), runFullBloatScan (L263-L332)`; Exports: `ScannedItem, BloatScanReport, BLOAT_LINE_THRESHOLD, BLOAT_TOKEN_THRESHOLD, SYSTEM_INDEX_BUDGET_TOKENS, estimateTokensFromText, countLines, extractFrontmatterDescription, annotateDuplicates, runFullBloatScan`
- **transcriptReader.ts** (287 linhas, 9.2 KB) → Funções: `listBrainSessions (L43-L117), readSessionTranscriptSteps (L119-L170), listGlobalHtmlArtifacts (L172-L172), probeKitsuneAndNotch (L190-L287)`; Exports: `SessionSummary, TranscriptStep, KitsuneStatus, listBrainSessions, readSessionTranscriptSteps, listGlobalHtmlArtifacts`

### `src`
- **App.tsx** (883 linhas, 42.2 KB) → Funções: `toggleTheme (L304-L308), fetchJsonSafe (L310-L317), handleApplyPreset (L365-L400), refreshDatasets (L402-L409), refreshMeetings (L411-L418), handleCopyShareLink (L420-L427)`; Exports: `App`
- **main.tsx** (10 linhas, 0.2 KB)

### `src/components`
- **AntigravityLogo.tsx** (12 linhas, 0.3 KB) → Exports: `AntigravityLogo`
- **AntigravityMotionPlayer.tsx** (659 linhas, 27.9 KB) → Funções: `handleReadImageFile (L116-L124), handleEncodeSplat (L126-L184)`; Exports: `AntigravityMotionPlayer, antigravityExplainerConfig`
- **AntigravityParticlesCanvas.tsx** (246 linhas, 8.3 KB) → Funções: `resize (L51-L59), onPointerMove (L91-L103), onPointerLeave (L105-L107), smoothstep (L116-L119), render (L121-L227)`; Exports: `AntigravityParticlesCanvas`
- **BottomCommandBar.tsx** (140 linhas, 5.1 KB) → Exports: `ActiveTabId, BottomCommandBar`
- **Module1BloatCenter.tsx** (424 linhas, 18.9 KB) → Exports: `ScannedItemDto, BloatScanReportDto, ProfilePresetDto, Module1BloatCenter`
- **Module2LiveSessions.tsx** (332 linhas, 14.4 KB) → Exports: `SessionSummaryDto, TranscriptStepDto, KitsuneStatusDto, Module2LiveSessions`
- **Module3DataSourcesPane.tsx** (501 linhas, 21.3 KB) → Funções: `handleRunSql (L100-L139), handleSelectDataset (L141-L149), handleFileUpload (L151-L197)`; Exports: `ColumnSchemaDto, DataSourceQueryResultDto, DatasetMetaDto, Module3DataSourcesPane`
- **Module4PostMeetingMvp.tsx** (774 linhas, 33.7 KB) → Funções: `handleIngestVideo (L111-L138), handleVaultActionDecision (L140-L173), handleProcessMeeting (L175-L204), handleAudioDrop (L206-L213), sourceBadgeColor (L261-L265)`; Exports: `StagedMcpActionDto, MeetingSessionDto, Module4PostMeetingMvp`
- **TopTelemetryBar.tsx** (180 linhas, 7.0 KB) → Exports: `UiLang, ViewMode, TopTelemetryBar`

### `src/data`
- **staticShowcaseData.ts** (1082 linhas, 38.8 KB) → Funções: `computeReportFromItems (L350-L396), simulatePresetClientSide (L443-L451), buildColumnsFromRows (L598-L608), runClientSideSqlSimulation (L629-L638), ingestClientSideFile (L702-L707), extractMeetingClientSide (L816-L852), ingestVideoClientSide (L985-L1049)`; Exports: `QuarantineLedgerEntryDto, FALLBACK_BLOAT_REPORT, FALLBACK_PRESETS, simulatePresetClientSide, FALLBACK_KITSUNE_STATUS, FALLBACK_SESSIONS, FALLBACK_STEPS, FALLBACK_DATASETS, FALLBACK_DATA_RESULT, runClientSideSqlSimulation`

### `src/styles`
- **onyx.css** (139 linhas, 3.6 KB)

### `tests`
- **dashboard.test.ts** (209 linhas, 8.3 KB)
