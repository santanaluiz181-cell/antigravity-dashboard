# CARTOGRAPHER — MAPA ARQUITETURAL DA CODEBASE (AST)
**Raiz:** `E:\Downloads_C\Antigravity Dashboard` | **Arquivos Mapeados:** 27 | **Linhas:** 8,924
**Economia Map-First:** Varredura cega ~76,309 tokens vs Mapa ~1,296 tokens (**75,013 tokens economizados / -98.3%**)

> **Regra Map-First:** Use os intervalos `Lstart-Lend` abaixo com `read_file(StartLine, EndLine)`. Proibido ler arquivos >80 linhas por inteiro.

---
### `/`
- **.graphify.json** (916 linhas, 19.0 KB)
- **index.html** (18 linhas, 0.8 KB)
- **organizer.md** (28 linhas, 4.0 KB)
- **package-lock.json** (3904 linhas, 125.1 KB)
- **package.json** (34 linhas, 0.9 KB)
- **tsconfig.json** (17 linhas, 0.4 KB)
- **vite.config.ts** (17 linhas, 0.4 KB)
- **vitest.config.ts** (9 linhas, 0.2 KB)

### `backups`
- **meetings_ledger.json** (35 linhas, 1.2 KB)

### `server`
- **index.ts** (233 linhas, 7.9 KB) → Rotas: `GET /api/bloat/scan (L45-L54), POST /api/bloat/preset (L56-L73), GET /api/sessions/overview (L76-L90), GET /api/sessions/:conversationId/transcript (L92-L96), GET /api/sessions/artifact-preview (L98-L109), GET /api/datasources/list (L112-L118), POST /api/datasources/ingest (L120-L145), POST /api/datasources/query (L147-L158), GET /api/meetings/list (L161-L177), POST /api/meetings/process (L179-L208), POST /api/meetings/approve-action (L210-L225)`; Exports: `app`
- **paths.ts** (69 linhas, 3.3 KB) → Funções: `normalizeWinPath (L37-L43), assertNeverTouchesOfficialBinaries (L45-L56), isAllowedReadPath (L58-L69)`; Exports: `USER_HOME, GEMINI_ROOT, ANTIGRAVITY_DIR, CONFIG_DIR, WORKSPACE_ROOT, BACKUPS_DIR, SAME_DRIVE_QUARANTINE_DIR, DATA_PATHS, normalizeWinPath, assertNeverTouchesOfficialBinaries`

### `server/services`
- **meetingPipeline.ts** (213 linhas, 7.1 KB) → Funções: `getMeetingsStoragePath (L36-L39), persistMeetingsStore (L41-L44), loadMeetingsStore (L46-L60), extractStructuredMeetingIntelligence (L62-L133), transcribeAudioViaGpuAsr (L135-L170), approveOrRejectStagedAction (L172-L213)`; Exports: `StagedMcpAction, MeetingSessionRecord, loadMeetingsStore, extractStructuredMeetingIntelligence, approveOrRejectStagedAction`
- **profileManager.ts** (324 linhas, 11.5 KB) → Funções: `withProfileLock (L98-L108), ensureBackupDirs (L110-L117), getLedgerPath (L119-L122), getActiveStatePath (L124-L127), readQuarantineLedger (L129-L137), writeQuarantineLedger (L139-L143), getActiveProfileState (L145-L145), moveDirectoryAtomic (L157-L182), applyProfilePreset (L184-L324)`; Exports: `ProfilePreset, PROFILE_PRESETS, QuarantineLedgerEntry, ProfileApplyResult, readQuarantineLedger, getActiveProfileState`
- **sqliteInspector.ts** (319 linhas, 10.1 KB) → Funções: `assertReadOnlySelectSql (L40-L61), sanitizeIdentifier (L63-L71), parseCsvLine (L73-L95), inferSqlType (L97-L117), ingestStructuredRecords (L119-L191), ingestCsvContent (L193-L210), executeDatasetQuery (L212-L257), listDatasets (L259-L259), ensureDefaultBootDataset (L269-L269)`; Exports: `ColumnSchema, DataSourceQueryResult, assertReadOnlySelectSql, sanitizeIdentifier, parseCsvLine, ingestStructuredRecords, ingestCsvContent, executeDatasetQuery, listDatasets, ensureDefaultBootDataset`
- **tokenScanner.ts** (332 linhas, 11.4 KB) → Funções: `estimateTokensFromText (L41-L50), countLines (L52-L57), extractFrontmatterDescription (L59-L73), scanSkillFolder (L75-L125), scanRuleFiles (L127-L166), scanMcpServers (L168-L228), annotateDuplicates (L230-L261), runFullBloatScan (L263-L332)`; Exports: `ScannedItem, BloatScanReport, BLOAT_LINE_THRESHOLD, BLOAT_TOKEN_THRESHOLD, SYSTEM_INDEX_BUDGET_TOKENS, estimateTokensFromText, countLines, extractFrontmatterDescription, annotateDuplicates, runFullBloatScan`
- **transcriptReader.ts** (238 linhas, 7.8 KB) → Funções: `listBrainSessions (L38-L112), readSessionTranscriptSteps (L114-L165), listGlobalHtmlArtifacts (L167-L167), probeKitsuneAndNotch (L185-L238)`; Exports: `SessionSummary, TranscriptStep, KitsuneStatus, listBrainSessions, readSessionTranscriptSteps, listGlobalHtmlArtifacts`

### `src`
- **App.tsx** (201 linhas, 7.3 KB) → Funções: `handleApplyPreset (L97-L122), refreshDatasets (L124-L127), refreshMeetings (L129-L132)`; Exports: `App`
- **main.tsx** (10 linhas, 0.2 KB)

### `src/components`
- **AntigravityLogo.tsx** (25 linhas, 0.8 KB) → Exports: `AntigravityLogo`
- **BottomCommandBar.tsx** (141 linhas, 5.1 KB) → Exports: `ActiveTabId, BottomCommandBar`
- **Module1BloatCenter.tsx** (419 linhas, 17.8 KB) → Exports: `ScannedItemDto, BloatScanReportDto, ProfilePresetDto, Module1BloatCenter`
- **Module2LiveSessions.tsx** (288 linhas, 11.7 KB) → Exports: `SessionSummaryDto, TranscriptStepDto, KitsuneStatusDto, Module2LiveSessions`
- **Module3DataSourcesPane.tsx** (429 linhas, 17.8 KB) → Funções: `handleRunSql (L78-L96), handleSelectDataset (L98-L106), handleFileUpload (L108-L131)`; Exports: `ColumnSchemaDto, DataSourceQueryResultDto, DatasetMetaDto, Module3DataSourcesPane`
- **Module4PostMeetingMvp.tsx** (349 linhas, 14.0 KB) → Funções: `handleProcessMeeting (L61-L82), handleAudioDrop (L84-L91)`; Exports: `StagedMcpActionDto, MeetingSessionDto, Module4PostMeetingMvp`
- **TopTelemetryBar.tsx** (147 linhas, 5.7 KB) → Exports: `TopTelemetryBar`

### `src/styles`
- **onyx.css** (70 linhas, 1.5 KB)

### `tests`
- **dashboard.test.ts** (139 linhas, 5.3 KB)
