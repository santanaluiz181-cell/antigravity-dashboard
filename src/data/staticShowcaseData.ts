import type {
  BloatScanReportDto,
  ProfilePresetDto,
  ScannedItemDto,
} from '../components/Module1BloatCenter';
import type {
  KitsuneStatusDto,
  SessionSummaryDto,
  TranscriptStepDto,
} from '../components/Module2LiveSessions';
import type {
  ColumnSchemaDto,
  DataSourceQueryResultDto,
  DatasetMetaDto,
} from '../components/Module3DataSourcesPane';
import type { MeetingSessionDto } from '../components/Module4PostMeetingMvp';

export interface QuarantineLedgerEntryDto {
  skillName: string;
  originalPath: string;
  quarantinePath: string;
  movedAt: string;
  reason: string;
}

const BASE_ITEMS: ScannedItemDto[] = [
  {
    id: 'rule:GEMINI.md',
    name: 'GEMINI.md (Global User Rule)',
    category: 'rule',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\GEMINI.md',
    charCount: 12480,
    lineCount: 312,
    estimatedTokens: 3280,
    descriptionTokens: 3280,
    isBloated: true,
    bloatReasons: ['Rule file > 250 lines (312 lines)'],
    isDuplicate: false,
    enabled: true,
    description: 'Always-injected system rule (312 lines)',
  },
  {
    id: 'rule:AGENTS.md (SuperAntigravityTJTO)',
    name: 'AGENTS.md (SuperAntigravityTJTO)',
    category: 'rule',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\config\\plugins\\super-antigravity-tjto\\rules\\AGENTS.md',
    charCount: 10940,
    lineCount: 268,
    estimatedTokens: 2890,
    descriptionTokens: 2890,
    isBloated: true,
    bloatReasons: ['Rule file > 250 lines (268 lines)'],
    isDuplicate: false,
    enabled: true,
    description: 'Always-injected plugin rule (268 lines)',
  },
  {
    id: 'skill-global:caveman',
    name: 'caveman',
    category: 'skill-global',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\config\\skills\\caveman\\SKILL.md',
    charCount: 2850,
    lineCount: 84,
    estimatedTokens: 740,
    descriptionTokens: 310,
    isBloated: true,
    bloatReasons: ['Duplicate skill collision with skill-plugin-tjto (caveman)'],
    isDuplicate: true,
    duplicateOf: 'C:\\Users\\tharcio\\.gemini\\config\\plugins\\super-antigravity-tjto\\skills\\caveman\\SKILL.md',
    enabled: true,
    description: 'Token compression protocol (global duplicate)',
  },
  {
    id: 'skill-global:tdd',
    name: 'tdd',
    category: 'skill-global',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\config\\skills\\tdd\\SKILL.md',
    charCount: 3120,
    lineCount: 92,
    estimatedTokens: 820,
    descriptionTokens: 290,
    isBloated: true,
    bloatReasons: ['Duplicate skill collision with skill-plugin-tjto (tdd)'],
    isDuplicate: true,
    duplicateOf: 'C:\\Users\\tharcio\\.gemini\\config\\plugins\\super-antigravity-tjto\\skills\\tdd\\SKILL.md',
    enabled: true,
    description: 'Red-green-refactor verification loop (global duplicate)',
  },
  {
    id: 'skill-global:codebase-design',
    name: 'codebase-design',
    category: 'skill-global',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\config\\skills\\codebase-design\\SKILL.md',
    charCount: 4180,
    lineCount: 118,
    estimatedTokens: 1100,
    descriptionTokens: 340,
    isBloated: true,
    bloatReasons: ['Duplicate skill collision with skill-plugin-tjto (codebase-design)'],
    isDuplicate: true,
    duplicateOf: 'C:\\Users\\tharcio\\.gemini\\config\\plugins\\super-antigravity-tjto\\skills\\codebase-design\\SKILL.md',
    enabled: true,
    description: 'Deep module boundaries and seams (global duplicate)',
  },
  {
    id: 'skill-global:diagnosing-bugs',
    name: 'diagnosing-bugs',
    category: 'skill-global',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\config\\skills\\diagnosing-bugs\\SKILL.md',
    charCount: 3640,
    lineCount: 105,
    estimatedTokens: 960,
    descriptionTokens: 315,
    isBloated: true,
    bloatReasons: ['Duplicate skill collision with skill-plugin-tjto (diagnosing-bugs)'],
    isDuplicate: true,
    duplicateOf: 'C:\\Users\\tharcio\\.gemini\\config\\plugins\\super-antigravity-tjto\\skills\\diagnosing-bugs\\SKILL.md',
    enabled: true,
    description: 'Root-cause regression triage (global duplicate)',
  },
  {
    id: 'skill-global:human-craft-frontend',
    name: 'human-craft-frontend',
    category: 'skill-global',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\config\\skills\\human-craft-frontend\\SKILL.md',
    charCount: 2420,
    lineCount: 64,
    estimatedTokens: 640,
    descriptionTokens: 280,
    isBloated: true,
    bloatReasons: ['Duplicate skill collision with skill-plugin-tjto (human-craft-frontend)'],
    isDuplicate: true,
    duplicateOf: 'C:\\Users\\tharcio\\.gemini\\config\\plugins\\super-antigravity-tjto\\skills\\human-craft-frontend\\SKILL.md',
    enabled: true,
    description: '5-Gate human-first frontend craft (global duplicate)',
  },
  {
    id: 'skill-global:watch-video',
    name: 'watch-video',
    category: 'skill-global',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\config\\skills\\watch-video\\SKILL.md',
    charCount: 5210,
    lineCount: 148,
    estimatedTokens: 1380,
    descriptionTokens: 360,
    isBloated: true,
    bloatReasons: ['Duplicate skill collision with skill-plugin-tjto (watch-video)'],
    isDuplicate: true,
    duplicateOf: 'C:\\Users\\tharcio\\.gemini\\config\\plugins\\super-antigravity-tjto\\skills\\watch-video\\SKILL.md',
    enabled: true,
    description: 'GPU video decomposition via d3d11va + DirectML + Vulkan (global duplicate)',
  },
  {
    id: 'skill-plugin-tjto:caveman',
    name: 'caveman',
    category: 'skill-plugin-tjto',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\config\\plugins\\super-antigravity-tjto\\skills\\caveman\\SKILL.md',
    charCount: 2850,
    lineCount: 84,
    estimatedTokens: 740,
    descriptionTokens: 310,
    isBloated: false,
    bloatReasons: [],
    isDuplicate: false,
    enabled: true,
    description: 'Canonical SuperAntigravityTJTO token reduction skill',
  },
  {
    id: 'skill-plugin-tjto:watch-video',
    name: 'watch-video',
    category: 'skill-plugin-tjto',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\config\\plugins\\super-antigravity-tjto\\skills\\watch-video\\SKILL.md',
    charCount: 5210,
    lineCount: 148,
    estimatedTokens: 1380,
    descriptionTokens: 360,
    isBloated: false,
    bloatReasons: [],
    isDuplicate: false,
    enabled: true,
    description: 'Canonical Vulkan GPU video inspector',
  },
  {
    id: 'skill-plugin-tjto:antislop',
    name: 'antislop',
    category: 'skill-plugin-tjto',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\config\\plugins\\super-antigravity-tjto\\skills\\antislop\\SKILL.md',
    charCount: 46080,
    lineCount: 750,
    estimatedTokens: 11800,
    descriptionTokens: 420,
    isBloated: true,
    bloatReasons: ['Exceeds 250 lines (750 lines)', 'Heavy full-load footprint (11,800 tokens)'],
    isDuplicate: false,
    enabled: true,
    description: 'Anti-AI-slop rules for coding agents',
  },
  {
    id: 'skill-plugin-science:cheminformatics-physics',
    name: 'cheminformatics-physics',
    category: 'skill-plugin-science',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\config\\plugins\\science\\skills\\cheminformatics_physics\\SKILL.md',
    charCount: 11200,
    lineCount: 294,
    estimatedTokens: 2950,
    descriptionTokens: 640,
    isBloated: true,
    bloatReasons: ['Exceeds 250 lines (294 lines)'],
    isDuplicate: false,
    enabled: true,
    description: '3D molecular conformers, Vina docking, OpenMM simulation',
  },
  {
    id: 'skill-plugin-science:rdkit-general',
    name: 'rdkit-general',
    category: 'skill-plugin-science',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\config\\plugins\\science\\skills\\rdkit_general\\SKILL.md',
    charCount: 8400,
    lineCount: 210,
    estimatedTokens: 2210,
    descriptionTokens: 580,
    isBloated: false,
    bloatReasons: [],
    isDuplicate: false,
    enabled: true,
    description: '2D chemical depictions and ChemDraw exports',
  },
  {
    id: 'skill-builtin:native-swarm',
    name: 'swarm',
    category: 'skill-builtin',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\antigravity\\builtin\\skills\\native_swarm\\SKILL.md',
    charCount: 4920,
    lineCount: 140,
    estimatedTokens: 1290,
    descriptionTokens: 280,
    isBloated: false,
    bloatReasons: [],
    isDuplicate: false,
    enabled: true,
    description: 'Multi-agent parallel workspace coordinator',
  },
  {
    id: 'mcp:claude-mem',
    name: 'claude-mem',
    category: 'mcp-server',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\antigravity\\mcp_config.json',
    charCount: 6820,
    lineCount: 20,
    estimatedTokens: 1705,
    descriptionTokens: 180,
    isBloated: false,
    bloatReasons: [],
    isDuplicate: false,
    enabled: true,
    description: 'MCP Server (20 tools: save_memory, mem_search, work_state_write)',
  },
  {
    id: 'mcp:kitsune-router',
    name: 'kitsune-router',
    category: 'mcp-server',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\antigravity\\mcp_config.json',
    charCount: 3180,
    lineCount: 8,
    estimatedTokens: 795,
    descriptionTokens: 84,
    isBloated: false,
    bloatReasons: [],
    isDuplicate: false,
    enabled: true,
    description: 'MCP Server (8 tools: model routing & PrivacyGuard)',
  },
  {
    id: 'mcp:playwright',
    name: 'playwright',
    category: 'mcp-server',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\antigravity\\mcp_config.json',
    charCount: 3920,
    lineCount: 10,
    estimatedTokens: 980,
    descriptionTokens: 100,
    isBloated: false,
    bloatReasons: [],
    isDuplicate: false,
    enabled: true,
    description: 'MCP Server (10 tools: headless browser inspection)',
  },
  {
    id: 'mcp:super-antigravity-tjto_stitch',
    name: 'super-antigravity-tjto_stitch',
    category: 'mcp-server',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\antigravity\\mcp_config.json',
    charCount: 6200,
    lineCount: 15,
    estimatedTokens: 1550,
    descriptionTokens: 140,
    isBloated: false,
    bloatReasons: [],
    isDuplicate: false,
    enabled: true,
    description: 'MCP Server (15 tools: Google Stitch UI generation)',
  },
  {
    id: 'mcp:lottiefiles-creator',
    name: 'lottiefiles-creator',
    category: 'mcp-server',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\antigravity\\mcp_config.json',
    charCount: 18400,
    lineCount: 82,
    estimatedTokens: 4600,
    descriptionTokens: 676,
    isBloated: true,
    bloatReasons: ['Exposes 82 MCP tools in system index'],
    isDuplicate: false,
    enabled: true,
    description: 'MCP Server (82 tools: vector motion scenes & keyframes)',
  },
  {
    id: 'mcp:filmcraft-bridge',
    name: 'filmcraft-bridge',
    category: 'mcp-server',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\antigravity\\mcp_config.json',
    charCount: 5400,
    lineCount: 18,
    estimatedTokens: 1350,
    descriptionTokens: 164,
    isBloated: false,
    bloatReasons: [],
    isDuplicate: false,
    enabled: true,
    description: 'MCP Server (18 tools: timeline & preview bridge)',
  },
  {
    id: 'mcp:super-antigravity-tjto_sqlite',
    name: 'super-antigravity-tjto_sqlite',
    category: 'mcp-server',
    sourcePath: 'C:\\Users\\tharcio\\.gemini\\antigravity\\mcp_config.json',
    charCount: 2100,
    lineCount: 6,
    estimatedTokens: 525,
    descriptionTokens: 68,
    isBloated: false,
    bloatReasons: [],
    isDuplicate: false,
    enabled: true,
    description: 'MCP Server (6 tools: read/write SQLite inspector)',
  },
];

function computeReportFromItems(items: ScannedItemDto[]): BloatScanReportDto {
  const breakdownByCategory: Record<string, { count: number; tokens: number; indexTokens: number }> = {};
  let totalFullLoadTokens = 0;
  let totalSystemPromptIndexTokens = 0;
  let activeItems = 0;
  let duplicateSkillsCount = 0;
  let bloatedPromptsCount = 0;
  const contextBudgetLimitTokens = 14000;

  for (const item of items) {
    if (!breakdownByCategory[item.category]) {
      breakdownByCategory[item.category] = { count: 0, tokens: 0, indexTokens: 0 };
    }
    breakdownByCategory[item.category].count += 1;
    breakdownByCategory[item.category].tokens += item.estimatedTokens;
    breakdownByCategory[item.category].indexTokens += item.enabled ? item.descriptionTokens : 0;

    if (item.enabled) {
      activeItems += 1;
      totalFullLoadTokens += item.estimatedTokens;
      totalSystemPromptIndexTokens += item.descriptionTokens;
      if (item.isDuplicate) duplicateSkillsCount += 1;
    }
    if (item.isBloated) bloatedPromptsCount += 1;
  }

  const budgetUtilizationPct = Math.min(
    100,
    Math.round((totalSystemPromptIndexTokens / contextBudgetLimitTokens) * 100)
  );

  return {
    scannedAt: new Date().toISOString(),
    totalItems: items.length,
    activeItems,
    totalFullLoadTokens,
    totalSystemPromptIndexTokens,
    contextBudgetLimitTokens,
    budgetUtilizationPct,
    evictionRiskWarning:
      totalSystemPromptIndexTokens > contextBudgetLimitTokens * 0.8 || duplicateSkillsCount > 0,
    duplicateSkillsCount,
    bloatedPromptsCount,
    breakdownByCategory,
    items,
  };
}

export const FALLBACK_BLOAT_REPORT: BloatScanReportDto = computeReportFromItems(BASE_ITEMS);

export const FALLBACK_PRESETS: ProfilePresetDto[] = [
  {
    id: 'coding-lean',
    name: 'Coding Lean',
    tagline: 'Quarantines duplicate skills + Science/Media bloat. Restores evicted browser & research subagents.',
    badge: 'RECOMMENDED (-64% Index)',
    estimatedSavedIndexTokens: 6800,
    enabledMcpServers: ['claude-mem', 'everything', 'kitsune-router', 'playwright'],
  },
  {
    id: 'frontend-craft',
    name: 'Frontend Craft',
    tagline: 'Design systems, Stitch MCP, LottieFiles, Desigma, Playwright, and anti-slop UI skills only.',
    badge: 'UI / STITCH / MOTION',
    estimatedSavedIndexTokens: 5400,
    enabledMcpServers: ['claude-mem', 'kitsune-router', 'playwright', 'super-antigravity-tjto_stitch', 'lottiefiles-creator'],
  },
  {
    id: 'journalism-tjto',
    name: 'Journalism & Gabinete TJTO',
    tagline: 'MJ Notch Companion, RAG pipeline, Gabinete Judiciário, Perplexity Sonar, LGPD, SQLite & Turnitout.',
    badge: 'MJ + EPROC + RAG',
    estimatedSavedIndexTokens: 5100,
    enabledMcpServers: ['claude-mem', 'everything', 'kitsune-router', 'playwright', 'super-antigravity-tjto_sqlite'],
  },
  {
    id: 'video-broll',
    name: 'Video / B-Roll & DSP',
    tagline: 'SuperRender, Watch Video GPU, Earshot Audio DSP, Huashu Motion, Filmcraft Bridge & Lottie.',
    badge: 'GPU MEDIA STUDIO',
    estimatedSavedIndexTokens: 4900,
    enabledMcpServers: ['claude-mem', 'kitsune-router', 'filmcraft-bridge', 'filmcraft-headless', 'lottiefiles-creator'],
  },
  {
    id: 'full-restore',
    name: 'Full Restore (Unquarantine All)',
    tagline: 'Restores every quarantined skill and enables all configured MCP servers from verified backups.',
    badge: 'RESTORE 100%',
    estimatedSavedIndexTokens: 0,
    enabledMcpServers: ['*'],
  },
];

export function simulatePresetClientSide(
  presetId: string,
  currentReport: BloatScanReportDto | null
): {
  report: BloatScanReportDto;
  activePresetId: string;
  quarantineLedger: QuarantineLedgerEntryDto[];
  feedback: string;
} {
  const sourceItems = (currentReport?.items || BASE_ITEMS).map((item) => ({ ...item }));
  const preset = FALLBACK_PRESETS.find((p) => p.id === presetId) || FALLBACK_PRESETS[0];
  const ledger: QuarantineLedgerEntryDto[] = [];
  let quarantinedCount = 0;
  let restoredCount = 0;
  let mcpToggledCount = 0;

  for (const item of sourceItems) {
    if (preset.id === 'full-restore') {
      if (!item.enabled) restoredCount += 1;
      item.enabled = true;
    } else if (item.category === 'mcp-server') {
      const shouldEnable =
        preset.enabledMcpServers.includes('*') ||
        preset.enabledMcpServers.includes(item.name) ||
        preset.enabledMcpServers.some((allowed) => item.name.includes(allowed));
      if (item.enabled !== shouldEnable) mcpToggledCount += 1;
      item.enabled = shouldEnable;
    } else if (item.isDuplicate || item.category === 'skill-plugin-science') {
      if (item.enabled) quarantinedCount += 1;
      item.enabled = false;
      ledger.push({
        skillName: item.name,
        originalPath: item.sourcePath,
        quarantinePath: `backups/quarantine_skills/${item.name}`,
        movedAt: new Date().toISOString(),
        reason: item.isDuplicate ? `Duplicate of ${item.duplicateOf || 'plugin'}` : `Parked by ${preset.name}`,
      });
    } else {
      item.enabled = true;
    }
  }

  return {
    report: computeReportFromItems(sourceItems),
    activePresetId: preset.id,
    quarantineLedger: ledger,
    feedback: `Applied "${preset.name}": quarantined ${quarantinedCount} redundant skills, restored ${restoredCount}, toggled ${mcpToggledCount} MCP servers (Browser Preview Mode).`,
  };
}

export const FALLBACK_KITSUNE_STATUS: KitsuneStatusDto = {
  reachable: true,
  endpoint: 'http://127.0.0.1:4319',
  activeProfile: 'OAuth (Gemini 4 Argon)',
  activeProvider: 'google-antigravity-oauth',
  latencyMs: 4,
  notchReachable: true,
  claudeMemReachable: true,
  graphifyNodes: 25,
  graphifyEdges: 51,
  cartographerSavingsPct: 98.4,
  billionContextReady: true,
};

export const FALLBACK_SESSIONS: SessionSummaryDto[] = [
  {
    conversationId: 'f2d1700e-0ef0-4436-9cc2-0c91848d09b7',
    transcriptPath: 'C:\\Users\\tharcio\\.gemini\\antigravity\\brain\\f2d1700e-0ef0-4436-9cc2-0c91848d09b7\\.system_generated\\logs\\transcript.jsonl',
    updatedAt: new Date().toISOString(),
    sizeBytes: 248600,
    stepCount: 42,
    lastUserPrompt: 'Reverse-engineer Claude Dashboards & Motion into the Google Antigravity visual language with GitHub Pages deploy.',
    subagentsInvoked: 2,
    toolCallsCount: 31,
    artifacts: [
      {
        name: 'antigravity_dashboards_preview.html',
        fullPath: 'C:\\Users\\tharcio\\.gemini\\antigravity\\html_artifacts\\antigravity_dashboards_preview.html',
        type: 'html',
      },
    ],
  },
  {
    conversationId: '062f293a-9a59-45bb-ab41-146577fe93b9',
    transcriptPath: 'C:\\Users\\tharcio\\.gemini\\antigravity\\brain\\062f293a-9a59-45bb-ab41-146577fe93b9\\.system_generated\\logs\\transcript.jsonl',
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    sizeBytes: 68400,
    stepCount: 14,
    lastUserPrompt: 'Workspace & Path Scout: inspect ~/.gemini/config/skills, plugins/super-antigravity-tjto, and Kitsune :4319.',
    subagentsInvoked: 0,
    toolCallsCount: 9,
    artifacts: [],
  },
];

export const FALLBACK_STEPS: Record<string, TranscriptStepDto[]> = {
  'f2d1700e-0ef0-4436-9cc2-0c91848d09b7': [
    {
      stepIndex: 1,
      source: 'USER_EXPLICIT',
      type: 'USER_INPUT',
      status: 'DONE',
      createdAt: new Date().toISOString(),
      contentPreview: 'Inspect antigravity.google tokens via /REA, vectorize easel logo to SVG, and organize dashboard like claude.com/resources/articles/dashboards-and-motion.',
      toolCalls: [],
      hasTruncatedFields: false,
    },
    {
      stepIndex: 2,
      source: 'MODEL',
      type: 'PLANNER_RESPONSE',
      status: 'DONE',
      createdAt: new Date().toISOString(),
      contentPreview: 'Extracted Google Sans Flex, Google Sans Code, Google Symbols, --palette-grey-1200 (#121317), and MainParticlesComponent capsule physics from antigravity.google.',
      toolCalls: [
        { name: 'run_command', summary: 'Extract antigravity.google CSS & particle shaders' },
        { name: 'write_file', summary: 'public/logo.svg + AntigravityParticlesCanvas.tsx' },
      ],
      hasTruncatedFields: false,
    },
    {
      stepIndex: 3,
      source: 'MODEL',
      type: 'PLANNER_RESPONSE',
      status: 'DONE',
      createdAt: new Date().toISOString(),
      contentPreview: 'Verified Vitest suite (6/6 passing) and indexed 25 files / 51 AST edges in .graphify.json (-98.4% Cartographer token reduction).',
      toolCalls: [
        { name: 'call_mcp_tool', summary: 'claude-mem.save_memory (#130)' },
        { name: 'run_command', summary: 'vitest run && vite build' },
      ],
      hasTruncatedFields: false,
    },
  ],
};

export const FALLBACK_DATASETS: DatasetMetaDto[] = [
  {
    id: 'ds_antigravity_telemetry',
    name: 'antigravity_context_telemetry',
    format: 'json',
    tableName: 'tbl_antigravity_context_telemetry',
    originPath: 'C:\\Users\\tharcio\\.gemini\\config\\skills + plugins\\super-antigravity-tjto\\skills',
  },
];

const INITIAL_TELEMETRY_ROWS: Record<string, unknown>[] = BASE_ITEMS.map((item) => ({
  item_name: item.name,
  category: item.category,
  full_tokens: item.estimatedTokens,
  index_tokens: item.descriptionTokens,
  lines: item.lineCount,
  is_duplicate: item.isDuplicate ? 1 : 0,
}));

function buildColumnsFromRows(rows: Record<string, unknown>[]): ColumnSchemaDto[] {
  const first = rows[0] || {};
  return Object.keys(first).map((k) => {
    const val = first[k];
    return {
      name: k,
      type: typeof val === 'number' ? (Number.isInteger(val) ? 'INTEGER' : 'REAL') : 'TEXT',
      sampleValue: val === null || val === undefined ? 'NULL' : String(val).slice(0, 50),
    };
  });
}

export const FALLBACK_DATA_RESULT: DataSourceQueryResultDto = {
  datasetId: 'ds_antigravity_telemetry',
  datasetName: 'antigravity_context_telemetry',
  sourceFormat: 'json',
  originPath: 'C:\\Users\\tharcio\\.gemini\\config\\skills + plugins\\super-antigravity-tjto\\skills',
  tableName: 'tbl_antigravity_context_telemetry',
  executedSql: 'SELECT * FROM "tbl_antigravity_context_telemetry" LIMIT 100',
  executionMs: 0.42,
  totalRowsInTable: INITIAL_TELEMETRY_ROWS.length,
  returnedRowsCount: INITIAL_TELEMETRY_ROWS.length,
  columns: buildColumnsFromRows(INITIAL_TELEMETRY_ROWS),
  rows: INITIAL_TELEMETRY_ROWS,
  transformationsApplied: [
    'Normalized 6 column identifiers to snake_case SQL-safe names',
    'Inferred column types (4 numeric, 2 text)',
    `Loaded ${INITIAL_TELEMETRY_ROWS.length} rows into native SQLite table "tbl_antigravity_context_telemetry"`,
  ],
};

export function runClientSideSqlSimulation(
  sql: string,
  baseRows: Record<string, unknown>[],
  meta: {
    datasetId: string;
    datasetName: string;
    sourceFormat: 'csv' | 'json' | 'sqlite';
    originPath: string;
    tableName: string;
  }
): { result?: DataSourceQueryResultDto; error?: string } {
  const trimmed = (sql || '').trim().replace(/;+\s*$/, '');
  if (!trimmed) return { error: 'SQL_EMPTY: Query cannot be empty' };
  if (trimmed.includes(';')) {
    return { error: 'SQL_SECURITY_VIOLATION: Multiple SQL statements are prohibited' };
  }
  const upper = trimmed.toUpperCase();
  if (!upper.startsWith('SELECT ') && !upper.startsWith('WITH ')) {
    return { error: 'SQL_SECURITY_VIOLATION: Only read-only SELECT or WITH queries are permitted' };
  }
  if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|ATTACH|DETACH|PRAGMA|REPLACE|VACUUM|TRUNCATE)\b/i.test(trimmed)) {
    return { error: 'SQL_SECURITY_VIOLATION: Mutating or administrative SQL keywords are prohibited' };
  }

  let rows = baseRows.map((r) => ({ ...r }));

  if (/WHERE\s+lines\s*>\s*250/i.test(trimmed)) {
    rows = rows.filter((r) => Number(r.lines) > 250);
  } else if (/WHERE\s+is_duplicate\s*=\s*1/i.test(trimmed)) {
    rows = rows.filter((r) => Number(r.is_duplicate) === 1);
  }

  if (/GROUP\s+BY\s+category/i.test(trimmed)) {
    const grouped = new Map<string, { category: string; items: number; total_index_tokens: number; total_full_tokens: number }>();
    for (const r of rows) {
      const cat = String(r.category || 'unknown');
      const cur = grouped.get(cat) || { category: cat, items: 0, total_index_tokens: 0, total_full_tokens: 0 };
      cur.items += 1;
      cur.total_index_tokens += Number(r.index_tokens || 0);
      cur.total_full_tokens += Number(r.full_tokens || 0);
      grouped.set(cat, cur);
    }
    rows = Array.from(grouped.values()).sort((a, b) => b.total_index_tokens - a.total_index_tokens);
  } else if (/ORDER\s+BY\s+lines\s+DESC/i.test(trimmed)) {
    rows.sort((a, b) => Number(b.lines || 0) - Number(a.lines || 0));
  }

  const limitMatch = trimmed.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) {
    rows = rows.slice(0, Number(limitMatch[1]));
  }

  return {
    result: {
      datasetId: meta.datasetId,
      datasetName: meta.datasetName,
      sourceFormat: meta.sourceFormat,
      originPath: meta.originPath,
      tableName: meta.tableName,
      executedSql: trimmed,
      executionMs: 0.35,
      totalRowsInTable: baseRows.length,
      returnedRowsCount: rows.length,
      columns: buildColumnsFromRows(rows),
      rows,
      transformationsApplied: [
        'Verified strict read-only SELECT/WITH guard in browser engine',
        `Returned ${rows.length} rows matching transformation query`,
      ],
    },
  };
}

export function ingestClientSideFile(
  name: string,
  format: 'csv' | 'json',
  content: string,
  originLabel: string
): { meta: DatasetMetaDto; result: DataSourceQueryResultDto; error?: string } {
  try {
    let records: Record<string, unknown>[] = [];
    if (format === 'json') {
      const parsed = JSON.parse(content);
      records = Array.isArray(parsed) ? parsed : [parsed];
    } else {
      const lines = content.replace(/^\uFEFF/, '').trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        return {
          meta: FALLBACK_DATASETS[0],
          result: FALLBACK_DATA_RESULT,
          error: 'CSV_INVALID: CSV must include header row and at least 1 data row',
        };
      }
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const rec: Record<string, unknown> = {};
        headers.forEach((h, idx) => {
          const rawVal = vals[idx] ?? '';
          const num = Number(rawVal);
          rec[h || `col_${idx}`] = rawVal !== '' && Number.isFinite(num) ? num : rawVal;
        });
        records.push(rec);
      }
    }

    const id = `ds_${Date.now()}`;
    const tableName = `tbl_${name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`;
    const meta: DatasetMetaDto = { id, name, format, tableName, originPath: originLabel };
    const result: DataSourceQueryResultDto = {
      datasetId: id,
      datasetName: name,
      sourceFormat: format,
      originPath: originLabel,
      tableName,
      executedSql: `SELECT * FROM "${tableName}" LIMIT 100`,
      executionMs: 0.48,
      totalRowsInTable: records.length,
      returnedRowsCount: Math.min(100, records.length),
      columns: buildColumnsFromRows(records),
      rows: records.slice(0, 100),
      transformationsApplied: [
        `Parsed ${format.toUpperCase()} payload in-browser`,
        `Indexed ${records.length} rows into virtual table "${tableName}"`,
      ],
    };
    return { meta, result };
  } catch (err) {
    return {
      meta: FALLBACK_DATASETS[0],
      result: FALLBACK_DATA_RESULT,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export const FALLBACK_MEETINGS: MeetingSessionDto[] = [
  {
    meetingId: 'mtg_showcase_01',
    title: 'Architecture Sync: Antigravity Bloat & Onyx Studio',
    createdAt: new Date().toISOString(),
    asrEngine: 'ggml_vulkan (tools/gpu_asr.py - GPU Ready)',
    durationSec: 46,
    transcript:
      'Decidimos padronizar o Antigravity Dashboard na estética oficial antigravity.google sem modificar o binário agy.exe. Definido que skills duplicadas em ~/.gemini/config/skills serão movidas para quarentena atômica SHA-256 ao ativar Coding Lean. Tarefa 1: Persistir resumo de decisão no @claude-mem. Tarefa 2: Registrar auditoria de tokens no banco SQLite local.',
    executiveSummary: [
      'Standardized Antigravity Dashboard in official antigravity.google design tokens with zero agy.exe binary modification.',
      'Enabled SHA-256 atomic skill quarantine under Coding Lean to eliminate duplicate collisions.',
      'Configured read-only SQLite lineage and Vulkan GPU meeting transcription.',
    ],
    decisions: [
      'Enforce assertNeverTouchesOfficialBinaries() guard across all profile presets (ToS Section 6 safe).',
      'Quarantine duplicate global skills colliding with SuperAntigravityTJTO.',
    ],
    stagedActions: [
      {
        actionId: 'mtg_showcase_01_act_1',
        mcpServer: 'claude-mem',
        toolName: 'save_memory',
        summary: 'Save Architecture Sync decisions to @claude-mem persistent memory.',
        owner: 'Nexus Principal',
        priority: 'HIGH',
        payload: {
          title: '[Meeting] Antigravity Bloat & Onyx Studio - Action #1',
          project: 'antigravity-dashboard',
          text: 'Persist SHA-256 quarantine decision and ToS Section 6 binary guard.',
        },
        status: 'PENDING_HUMAN_APPROVAL',
      },
      {
        actionId: 'mtg_showcase_01_act_2',
        mcpServer: 'super-antigravity-tjto_sqlite',
        toolName: 'write_query',
        summary: 'Record token audit ledger row in local SQLite table.',
        owner: 'Tester / QA',
        priority: 'MEDIUM',
        payload: {
          table: 'meeting_action_ledger',
          action_summary: 'Record context budget audit after Coding Lean preset.',
          meeting_id: 'mtg_showcase_01',
        },
        status: 'PENDING_HUMAN_APPROVAL',
      },
    ],
  },
];

export function extractMeetingClientSide(title: string, transcriptText: string): MeetingSessionDto {
  const cleaned = (transcriptText || '').trim();
  const sentences = cleaned
    .split(/(?<=[.!?])\s+|\r?\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  const summary = sentences.slice(0, 3);
  const decisions = sentences.filter((s) => /\b(decidimos|decided|approved|definido|padronizar|vamos)\b/i.test(s));
  const actions = sentences.filter((s) => /\b(tarefa|action|todo|salvar|registrar|build|fix|auditar)\b/i.test(s));
  const meetingId = `mtg_${Date.now()}`;
  const staged = (actions.length ? actions : ['Persist meeting decisions to @claude-mem']).map((act, idx) => ({
    actionId: `${meetingId}_act_${idx + 1}`,
    mcpServer: idx === 0 ? 'claude-mem' : 'super-antigravity-tjto_sqlite',
    toolName: idx === 0 ? 'save_memory' : 'write_query',
    summary: act,
    owner: idx === 0 ? 'Nexus Principal' : 'Tester / QA',
    priority: (idx === 0 ? 'HIGH' : 'MEDIUM') as 'HIGH' | 'MEDIUM',
    payload: {
      meeting_id: meetingId,
      title,
      action: act,
    },
    status: 'PENDING_HUMAN_APPROVAL' as const,
  }));

  return {
    meetingId,
    title: title || 'Post-Meeting Execution Sync',
    createdAt: new Date().toISOString(),
    asrEngine: 'ggml_vulkan (tools/gpu_asr.py - Interactive Browser Mode)',
    durationSec: Math.max(12, Math.round(cleaned.split(/\s+/).length / 2.4)),
    transcript: cleaned,
    executiveSummary: summary.length ? summary : ['Meeting notes processed.'],
    decisions: decisions.length ? decisions : [`Adopted workspace controls for ${title}.`],
    stagedActions: staged,
  };
}

export interface VaultNodeDto {
  id: string;
  sourceType: 'reel' | 'youtube' | 'meeting' | 'local_video';
  title: string;
  sourceUrl: string;
  createdAt: string;
  transcript: string;
  ocrHighlights: { timestamp: string; text: string }[];
  hooks: string[];
  entities: string[];
  topics: string[];
  gpuPipeline: string;
}

export interface VaultEdgeDto {
  id: string;
  sourceId: string;
  targetId: string;
  sharedTopics: string[];
  similarity: number;
  reason: string;
}

export interface VaultActionDto {
  actionId: string;
  nodeId: string;
  mcpServer: string;
  toolName: string;
  summary: string;
  payload: Record<string, unknown>;
  status: 'PENDING_HUMAN_APPROVAL' | 'APPROVED_AND_EXECUTED' | 'REJECTED';
  executedAt?: string;
  executionReceipt?: string;
}

export interface VaultSnapshotDto {
  nodes: VaultNodeDto[];
  edges: VaultEdgeDto[];
  actions: VaultActionDto[];
  dbPath: string;
}

export const FALLBACK_VAULT_SNAPSHOT: VaultSnapshotDto = {
  dbPath: 'backups/knowledge_vault.db',
  nodes: [
    {
      id: 'node_reel_25d_parallax',
      sourceType: 'reel',
      title: 'Instagram Reel: 2.5D Gaussian Splat Parallax Hook',
      sourceUrl: 'https://www.instagram.com/reel/antigravity-25d-demo/',
      createdAt: new Date(Date.now() - 7200_000).toISOString(),
      transcript:
        'Hook nos primeiros 2 segundos: separe o sujeito em Z=25, coloque a tipografia atrás em Z=15 e use Gaussian Splat no fundo em Z=5 com Vulkan ou ROCm na RX 6600.',
      ocrHighlights: [
        { timestamp: '00:02', text: 'Z-Sandwich: Z=5 BG | Z=15 Title | Z=25 Subject' },
        { timestamp: '00:09', text: 'ROCm gfx1032: 8.44ms/step (Zero DirectML)' },
      ],
      hooks: ['Separe o sujeito em Z=25 e coloque a tipografia em Z=15 para paralaxe 2.5D imediata.'],
      entities: ['Gaussian', 'Vulkan', 'ROCm', 'RX 6600', 'DirectML'],
      topics: ['gaussian-splat', '2.5d-parallax', 'rocm-gfx1032', 'wgpu-vulkan', 'rx-6600'],
      gpuPipeline: 'watch_video.py --gpu auto --ocr-dml --transcribe',
    },
    {
      id: 'node_yt_bloat_graphify',
      sourceType: 'youtube',
      title: 'YouTube Deep Dive: Eliminating Context Bloat with Graphify AST & SQLite',
      sourceUrl: 'https://www.youtube.com/watch?v=antigravity-context-ast',
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
      transcript:
        'Skills duplicadas e regras acima de 250 linhas expulsam subagentes. Use Graphify AST e SQLite Read-Only com aprovação humana para conectar conhecimento de Reels e reuniões no claude-mem.',
      ocrHighlights: [
        { timestamp: '01:14', text: 'Cartographer PROJECT_MAP.md: -98.5% Tokens' },
        { timestamp: '03:40', text: 'PENDING_HUMAN_APPROVAL -> @claude-mem' },
      ],
      hooks: ['Skills duplicadas expulsam subagentes; Graphify AST reduz 98.5% dos tokens de descoberta.'],
      entities: ['Graphify', 'SQLite', 'Antigravity', 'claude-mem', 'Reels'],
      topics: ['context-bloat', 'graphify-ast', 'sqlite', 'claude-mem', 'human-approval-gate'],
      gpuPipeline: 'watch_video.py --gpu auto --ocr-dml --transcribe',
    },
    {
      id: 'node_mtg_rx6600_architecture',
      sourceType: 'meeting',
      title: 'Meeting: Unified RX 6600 GPU + Knowledge Vault Sync',
      sourceUrl: 'local://meetings/rx6600-unified-sync',
      createdAt: new Date(Date.now() - 1200_000).toISOString(),
      transcript:
        'Decidimos banir DirectML no Gaussian Splat e rodar apenas wgpu Vulkan ou ROCm gfx1032 na RX 6600, integrando transcrições de Reels e YouTube no SQLite com aprovação humana antes do MCP.',
      ocrHighlights: [
        { timestamp: '00:18', text: 'assertNeverTouchesOfficialBinaries() -> agy.exe locked' },
      ],
      hooks: ['Banir DirectML e consolidar Reels + YouTube + Reuniões no SQLite knowledge_vault.db.'],
      entities: ['RX 6600', 'DirectML', 'Vulkan', 'ROCm', 'SQLite', 'Reels', 'YouTube', 'MCP'],
      topics: ['gaussian-splat', 'rocm-gfx1032', 'wgpu-vulkan', 'rx-6600', 'sqlite', 'human-approval-gate', 'directml-ban'],
      gpuPipeline: 'gpu_asr.py (ggml_vulkan)',
    },
  ],
  edges: [
    {
      id: 'edge_reel_mtg',
      sourceId: 'node_reel_25d_parallax',
      targetId: 'node_mtg_rx6600_architecture',
      sharedTopics: ['gaussian-splat', 'rocm-gfx1032', 'wgpu-vulkan', 'rx-6600'],
      similarity: 0.44,
      reason: 'REEL <-> MEETING share: gaussian-splat, rocm-gfx1032, wgpu-vulkan, rx-6600',
    },
    {
      id: 'edge_yt_mtg',
      sourceId: 'node_yt_bloat_graphify',
      targetId: 'node_mtg_rx6600_architecture',
      sharedTopics: ['sqlite', 'human-approval-gate'],
      similarity: 0.25,
      reason: 'YOUTUBE <-> MEETING share: sqlite, human-approval-gate',
    },
  ],
  actions: [
    {
      actionId: 'node_reel_25d_parallax_act_mem',
      nodeId: 'node_reel_25d_parallax',
      mcpServer: 'claude-mem',
      toolName: 'save_memory',
      summary: 'Index "Instagram Reel: 2.5D Gaussian Splat Parallax Hook" in @claude-mem',
      payload: {
        project: 'antigravity-dashboard',
        title: '[Knowledge Vault] 2.5D Gaussian Splat Parallax Hook',
        topics: ['gaussian-splat', '2.5d-parallax', 'rocm-gfx1032', 'wgpu-vulkan'],
      },
      status: 'PENDING_HUMAN_APPROVAL',
    },
  ],
};

export function ingestVideoClientSide(
  current: VaultSnapshotDto,
  urlOrPath: string,
  title?: string,
  notesFallback?: string
): VaultSnapshotDto {
  const lower = urlOrPath.toLowerCase();
  const sourceType: VaultNodeDto['sourceType'] = lower.includes('instagram.com') || lower.includes('reel')
    ? 'reel'
    : lower.includes('youtube.com') || lower.includes('youtu.be')
    ? 'youtube'
    : 'local_video';

  const id = `node_${sourceType}_${Date.now()}`;
  const text = (notesFallback || `Analyzed ${sourceType} (${urlOrPath}) for RX 6600 Vulkan/ROCm, gaussian-splat, and sqlite knowledge graph.`).trim();
  const domainTopics = ['gaussian-splat', '2.5d-parallax', 'rocm-gfx1032', 'wgpu-vulkan', 'rx-6600', 'sqlite', 'claude-mem', 'graphify-ast', 'context-bloat', 'human-approval-gate'];
  const topics = domainTopics.filter((t) => text.toLowerCase().includes(t.split('-')[0]));
  if (topics.length === 0) topics.push('gaussian-splat', 'sqlite');

  const newNode: VaultNodeDto = {
    id,
    sourceType,
    title: title?.trim() || `${sourceType.toUpperCase()}: ${urlOrPath.slice(0, 48)}`,
    sourceUrl: urlOrPath,
    createdAt: new Date().toISOString(),
    transcript: text,
    ocrHighlights: [{ timestamp: '00:02', text: `OCR Extracted: ${urlOrPath.slice(0, 48)}` }],
    hooks: [text.split(/[.!?]/)[0] || text.slice(0, 90)],
    entities: ['RX 6600', 'Vulkan', 'SQLite'],
    topics,
    gpuPipeline: 'watch_video.py --gpu auto --ocr-dml --transcribe (Browser Mode)',
  };

  const newEdges: VaultEdgeDto[] = [];
  for (const existing of current.nodes) {
    const shared = topics.filter((t) => existing.topics.includes(t));
    if (shared.length > 0) {
      newEdges.push({
        id: `edge_${id}_${existing.id}`,
        sourceId: id,
        targetId: existing.id,
        sharedTopics: shared,
        similarity: Number((shared.length / Math.max(1, new Set([...topics, ...existing.topics]).size)).toFixed(2)),
        reason: `${sourceType.toUpperCase()} <-> ${existing.sourceType.toUpperCase()} share: ${shared.join(', ')}`,
      });
    }
  }

  const newAction: VaultActionDto = {
    actionId: `${id}_act_mem`,
    nodeId: id,
    mcpServer: 'claude-mem',
    toolName: 'save_memory',
    summary: `Index "${newNode.title}" (${sourceType}) topics [${topics.slice(0, 3).join(', ')}] in @claude-mem`,
    payload: { project: 'antigravity-dashboard', title: newNode.title, topics },
    status: 'PENDING_HUMAN_APPROVAL',
  };

  return {
    ...current,
    nodes: [newNode, ...current.nodes],
    edges: [...newEdges, ...current.edges],
    actions: [newAction, ...current.actions],
  };
}

export interface SplatRunDto {
  runId: string;
  createdAt: string;
  backendRequested: 'auto' | 'rocm' | 'wgpu';
  pythonInterpreter: string;
  aspect: string;
  nmax: number;
  hasMorphB: boolean;
  artifacts: string[];
  meta?: Record<string, unknown>;
}

export const FALLBACK_SPLAT_RUNS: SplatRunDto[] = [
  {
    runId: 'splat_rx6600_reference',
    createdAt: new Date().toISOString(),
    backendRequested: 'rocm',
    pythonInterpreter: 'E:\\Downloads_C\\VoiceStudio\\.venv\\Scripts\\python.exe',
    aspect: '16:9',
    nmax: 1600,
    hasMorphB: true,
    artifacts: ['blobs.json', 'blobs.svg', 'snapshots.bin', 'depth-tex.f32', 'meta.json', 'morph_ab.json'],
    meta: {
      backend: 'rocm',
      device: 'AMD Radeon RX 6600 (gfx1032)',
      n_final: 1600,
      psnr: 29.4,
      train_seconds: 8.45,
      aspect: 1.7778,
    },
  },
];
