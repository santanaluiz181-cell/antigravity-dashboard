# CARTOGRAPHER — MAPA ARQUITETURAL DA CODEBASE (AST)
**Raiz:** `E:\Downloads_C\Antigravity Dashboard` | **Arquivos Mapeados:** 33 | **Linhas:** 11,837
**Economia Map-First:** Varredura cega ~106,130 tokens vs Mapa ~1,577 tokens (**104,553 tokens economizados / -98.5%**)

> **Regra Map-First:** Use os intervalos `Lstart-Lend` abaixo com `read_file(StartLine, EndLine)`. Proibido ler arquivos >80 linhas por inteiro.

---
### `/`
- **.graphify.json** (1160 linhas, 24.8 KB)
- **README.md** (122 linhas, 7.3 KB)
- **index.html** (19 linhas, 0.9 KB)
- **organizer.md** (15 linhas, 1.8 KB)
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

### `server`
- **index.ts** (233 linhas, 7.9 KB) → Rotas: `GET /api/bloat/scan (L45-L54), POST /api/bloat/preset (L56-L73), GET /api/sessions/overview (L76-L90), GET /api/sessions/:conversationId/transcript (L92-L96), GET /api/sessions/artifact-preview (L98-L109), GET /api/datasources/list (L112-L118), POST /api/datasources/ingest (L120-L145), POST /api/datasources/query (L147-L158), GET /api/meetings/list (L161-L177), POST /api/meetings/process (L179-L208), POST /api/meetings/approve-action (L210-L225)`; Exports: `app`
- **paths.ts** (69 linhas, 3.3 KB) → Funções: `normalizeWinPath (L37-L43), assertNeverTouchesOfficialBinaries (L45-L56), isAllowedReadPath (L58-L69)`; Exports: `USER_HOME, GEMINI_ROOT, ANTIGRAVITY_DIR, CONFIG_DIR, WORKSPACE_ROOT, BACKUPS_DIR, SAME_DRIVE_QUARANTINE_DIR, DATA_PATHS, normalizeWinPath, assertNeverTouchesOfficialBinaries`

### `server/services`
- **meetingPipeline.ts** (213 linhas, 7.1 KB) → Funções: `getMeetingsStoragePath (L36-L39), persistMeetingsStore (L41-L44), loadMeetingsStore (L46-L60), extractStructuredMeetingIntelligence (L62-L133), transcribeAudioViaGpuAsr (L135-L170), approveOrRejectStagedAction (L172-L213)`; Exports: `StagedMcpAction, MeetingSessionRecord, loadMeetingsStore, extractStructuredMeetingIntelligence, approveOrRejectStagedAction`
- **profileManager.ts** (324 linhas, 11.5 KB) → Funções: `withProfileLock (L98-L108), ensureBackupDirs (L110-L117), getLedgerPath (L119-L122), getActiveStatePath (L124-L127), readQuarantineLedger (L129-L137), writeQuarantineLedger (L139-L143), getActiveProfileState (L145-L145), moveDirectoryAtomic (L157-L182), applyProfilePreset (L184-L324)`; Exports: `ProfilePreset, PROFILE_PRESETS, QuarantineLedgerEntry, ProfileApplyResult, readQuarantineLedger, getActiveProfileState`
- **sqliteInspector.ts** (319 linhas, 10.1 KB) → Funções: `assertReadOnlySelectSql (L40-L61), sanitizeIdentifier (L63-L71), parseCsvLine (L73-L95), inferSqlType (L97-L117), ingestStructuredRecords (L119-L191), ingestCsvContent (L193-L210), executeDatasetQuery (L212-L257), listDatasets (L259-L259), ensureDefaultBootDataset (L269-L269)`; Exports: `ColumnSchema, DataSourceQueryResult, assertReadOnlySelectSql, sanitizeIdentifier, parseCsvLine, ingestStructuredRecords, ingestCsvContent, executeDatasetQuery, listDatasets, ensureDefaultBootDataset`
- **tokenScanner.ts** (332 linhas, 11.4 KB) → Funções: `estimateTokensFromText (L41-L50), countLines (L52-L57), extractFrontmatterDescription (L59-L73), scanSkillFolder (L75-L125), scanRuleFiles (L127-L166), scanMcpServers (L168-L228), annotateDuplicates (L230-L261), runFullBloatScan (L263-L332)`; Exports: `ScannedItem, BloatScanReport, BLOAT_LINE_THRESHOLD, BLOAT_TOKEN_THRESHOLD, SYSTEM_INDEX_BUDGET_TOKENS, estimateTokensFromText, countLines, extractFrontmatterDescription, annotateDuplicates, runFullBloatScan`
- **transcriptReader.ts** (287 linhas, 9.2 KB) → Funções: `listBrainSessions (L43-L117), readSessionTranscriptSteps (L119-L170), listGlobalHtmlArtifacts (L172-L172), probeKitsuneAndNotch (L190-L287)`; Exports: `SessionSummary, TranscriptStep, KitsuneStatus, listBrainSessions, readSessionTranscriptSteps, listGlobalHtmlArtifacts`

### `src`
- **App.tsx** (883 linhas, 42.2 KB) → Funções: `toggleTheme (L304-L308), fetchJsonSafe (L310-L317), handleApplyPreset (L365-L400), refreshDatasets (L402-L409), refreshMeetings (L411-L418), handleCopyShareLink (L420-L427)`; Exports: `App`
- **main.tsx** (10 linhas, 0.2 KB)

### `src/components`
- **AntigravityLogo.tsx** (12 linhas, 0.3 KB) → Exports: `AntigravityLogo`
- **AntigravityMotionPlayer.tsx** (334 linhas, 13.2 KB) → Exports: `AntigravityMotionPlayer, antigravityExplainerConfig`
- **AntigravityParticlesCanvas.tsx** (246 linhas, 8.3 KB) → Funções: `resize (L51-L59), onPointerMove (L91-L103), onPointerLeave (L105-L107), smoothstep (L116-L119), render (L121-L227)`; Exports: `AntigravityParticlesCanvas`
- **BottomCommandBar.tsx** (140 linhas, 5.1 KB) → Exports: `ActiveTabId, BottomCommandBar`
- **Module1BloatCenter.tsx** (424 linhas, 18.9 KB) → Exports: `ScannedItemDto, BloatScanReportDto, ProfilePresetDto, Module1BloatCenter`
- **Module2LiveSessions.tsx** (332 linhas, 14.4 KB) → Exports: `SessionSummaryDto, TranscriptStepDto, KitsuneStatusDto, Module2LiveSessions`
- **Module3DataSourcesPane.tsx** (501 linhas, 21.3 KB) → Funções: `handleRunSql (L100-L139), handleSelectDataset (L141-L149), handleFileUpload (L151-L197)`; Exports: `ColumnSchemaDto, DataSourceQueryResultDto, DatasetMetaDto, Module3DataSourcesPane`
- **Module4PostMeetingMvp.tsx** (403 linhas, 16.6 KB) → Funções: `handleProcessMeeting (L66-L95), handleAudioDrop (L97-L104)`; Exports: `StagedMcpActionDto, MeetingSessionDto, Module4PostMeetingMvp`
- **TopTelemetryBar.tsx** (180 linhas, 7.0 KB) → Exports: `UiLang, ViewMode, TopTelemetryBar`

### `src/data`
- **staticShowcaseData.ts** (852 linhas, 30.3 KB) → Funções: `computeReportFromItems (L350-L396), simulatePresetClientSide (L443-L451), buildColumnsFromRows (L598-L608), runClientSideSqlSimulation (L629-L638), ingestClientSideFile (L702-L707), extractMeetingClientSide (L816-L852)`; Exports: `QuarantineLedgerEntryDto, FALLBACK_BLOAT_REPORT, FALLBACK_PRESETS, simulatePresetClientSide, FALLBACK_KITSUNE_STATUS, FALLBACK_SESSIONS, FALLBACK_STEPS, FALLBACK_DATASETS, FALLBACK_DATA_RESULT, runClientSideSqlSimulation`

### `src/styles`
- **onyx.css** (139 linhas, 3.6 KB)

### `tests`
- **dashboard.test.ts** (139 linhas, 5.3 KB)
