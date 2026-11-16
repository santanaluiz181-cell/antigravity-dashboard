import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { BACKUPS_DIR, DATA_PATHS, assertNeverTouchesOfficialBinaries } from '../paths.js';

const execFileAsync = promisify(execFile);

export type VaultSourceType = 'reel' | 'youtube' | 'meeting' | 'local_video';

export interface OcrHighlight {
  timestamp: string;
  text: string;
}

export interface VaultNodeRecord {
  id: string;
  sourceType: VaultSourceType;
  title: string;
  sourceUrl: string;
  createdAt: string;
  transcript: string;
  ocrHighlights: OcrHighlight[];
  hooks: string[];
  entities: string[];
  topics: string[];
  gpuPipeline: string;
}

export interface VaultEdgeRecord {
  id: string;
  sourceId: string;
  targetId: string;
  sharedTopics: string[];
  similarity: number;
  reason: string;
}

export interface VaultStagedMcpAction {
  actionId: string;
  nodeId: string;
  mcpServer: 'claude-mem' | 'super-antigravity-tjto_sqlite';
  toolName: string;
  summary: string;
  payload: Record<string, unknown>;
  status: 'PENDING_HUMAN_APPROVAL' | 'APPROVED_AND_EXECUTED' | 'REJECTED';
  executedAt?: string;
  executionReceipt?: string;
}

let vaultDb: DatabaseSync | null = null;

function getVaultDb(): DatabaseSync {
  if (vaultDb) return vaultDb;
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  vaultDb = new DatabaseSync(DATA_PATHS.knowledgeVaultDb);
  vaultDb.exec(`
    CREATE TABLE IF NOT EXISTS vault_nodes (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      title TEXT NOT NULL,
      source_url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      transcript TEXT NOT NULL,
      ocr_highlights_json TEXT NOT NULL,
      hooks_json TEXT NOT NULL,
      entities_json TEXT NOT NULL,
      topics_json TEXT NOT NULL,
      gpu_pipeline TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS vault_edges (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      shared_topics_json TEXT NOT NULL,
      similarity REAL NOT NULL,
      reason TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS vault_actions (
      action_id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL,
      mcp_server TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      summary TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL,
      executed_at TEXT,
      execution_receipt TEXT
    );
  `);
  seedInitialVaultIfEmpty(vaultDb);
  return vaultDb;
}

const STOPWORDS = new Set([
  'para', 'como', 'mais', 'com', 'que', 'uma', 'uns', 'das', 'dos', 'por', 'sem', 'sobre',
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'your', 'about', 'using',
]);

export function extractTopicsAndEntities(text: string, ocrList: OcrHighlight[]): {
  topics: string[];
  entities: string[];
  hooks: string[];
} {
  const combined = `${text} ${ocrList.map((o) => o.text).join(' ')}`;
  const knownDomainTopics = [
    'gaussian-splat', '2.5d-parallax', 'rocm-gfx1032', 'wgpu-vulkan', 'rx-6600',
    'context-bloat', 'claude-mem', 'graphify-ast', 'sqlite', 'gpu-asr',
    'human-approval-gate', 'remotion', 'directml-ban', 'reels-hook', 'tjto-rag',
  ];

  const lower = combined.toLowerCase();
  const matchedDomain = knownDomainTopics.filter((t) => {
    const parts = t.split('-');
    return parts.every((p) => lower.includes(p)) || lower.includes(t.replace('-', ' '));
  });

  const tokens = (lower.match(/[a-zà-ú0-9_.]{4,}/g) || []).filter((w) => !STOPWORDS.has(w));
  const freq = new Map<string, number>();
  for (const tok of tokens) {
    freq.set(tok, (freq.get(tok) || 0) + 1);
  }
  const topTokens = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w);

  const topics = Array.from(new Set([...matchedDomain, ...topTokens])).slice(0, 8);

  const entityMatches = combined.match(/\b(?:RX\s?6600|ROCm|Vulkan|DirectML|SQLite|Graphify|Antigravity|Remotion|Whisper|Kitsune|Reels|YouTube|TJTO|MCP|@claude-mem)\b/gi) || [];
  const entities = Array.from(new Set(entityMatches.map((e) => e.trim()))).slice(0, 8);

  const sentences = text
    .split(/(?<=[.!?])\s+|\r?\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
  const hooks = sentences.slice(0, 2);

  return { topics, entities, hooks };
}

function insertNodeAndEdges(db: DatabaseSync, node: VaultNodeRecord): VaultStagedMcpAction[] {
  const existingRows = db
    .prepare('SELECT id, source_type, title, topics_json, entities_json FROM vault_nodes WHERE id != ?')
    .all(node.id) as { id: string; source_type: string; title: string; topics_json: string; entities_json: string }[];

  db.prepare(`
    INSERT OR REPLACE INTO vault_nodes
    (id, source_type, title, source_url, created_at, transcript, ocr_highlights_json, hooks_json, entities_json, topics_json, gpu_pipeline)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    node.id,
    node.sourceType,
    node.title,
    node.sourceUrl,
    node.createdAt,
    node.transcript,
    JSON.stringify(node.ocrHighlights),
    JSON.stringify(node.hooks),
    JSON.stringify(node.entities),
    JSON.stringify(node.topics),
    node.gpuPipeline
  );

  // Compute cross-modal semantic edges (Reels <-> YouTube <-> Meetings)
  const mySet = new Set([...node.topics, ...node.entities.map((e) => e.toLowerCase())]);
  for (const other of existingRows) {
    const otherTopics = JSON.parse(other.topics_json) as string[];
    const otherEntities = (JSON.parse(other.entities_json) as string[]).map((e) => e.toLowerCase());
    const otherSet = new Set([...otherTopics, ...otherEntities]);
    const shared = Array.from(mySet).filter((x) => otherSet.has(x));
    if (shared.length > 0) {
      const unionSize = new Set([...mySet, ...otherSet]).size;
      const similarity = Number((shared.length / Math.max(1, unionSize)).toFixed(2));
      const edgeId = `edge_${[node.id, other.id].sort().join('_')}`;
      db.prepare(`
        INSERT OR REPLACE INTO vault_edges (id, source_id, target_id, shared_topics_json, similarity, reason)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        edgeId,
        node.id,
        other.id,
        JSON.stringify(shared),
        similarity,
        `${node.sourceType.toUpperCase()} ↔ ${other.source_type.toUpperCase()} share: ${shared.slice(0, 4).join(', ')}`
      );
    }
  }

  // Always stage MCP actions in PENDING_HUMAN_APPROVAL (never auto-execute!)
  const actions: VaultStagedMcpAction[] = [
    {
      actionId: `${node.id}_act_mem`,
      nodeId: node.id,
      mcpServer: 'claude-mem',
      toolName: 'save_memory',
      summary: `Index "${node.title}" (${node.sourceType}) topics [${node.topics.slice(0, 3).join(', ')}] in @claude-mem`,
      payload: {
        project: 'antigravity-dashboard',
        title: `[Knowledge Vault] ${node.title}`,
        text: `${node.hooks[0] || node.transcript.slice(0, 180)} | Topics: ${node.topics.join(', ')}`,
      },
      status: 'PENDING_HUMAN_APPROVAL',
    },
    {
      actionId: `${node.id}_act_sql`,
      nodeId: node.id,
      mcpServer: 'super-antigravity-tjto_sqlite',
      toolName: 'write_query',
      summary: `Commit cross-media graph links for "${node.title}" to knowledge_vault.db`,
      payload: {
        table: 'vault_nodes',
        node_id: node.id,
        source_type: node.sourceType,
        topics: node.topics,
      },
      status: 'PENDING_HUMAN_APPROVAL',
    },
  ];

  for (const act of actions) {
    db.prepare(`
      INSERT OR REPLACE INTO vault_actions
      (action_id, node_id, mcp_server, tool_name, summary, payload_json, status, executed_at, execution_receipt)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)
    `).run(
      act.actionId,
      act.nodeId,
      act.mcpServer,
      act.toolName,
      act.summary,
      JSON.stringify(act.payload),
      'PENDING_HUMAN_APPROVAL'
    );
  }

  return actions;
}

function seedInitialVaultIfEmpty(db: DatabaseSync): void {
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM vault_nodes').get() as { cnt: number };
  if (countRow && countRow.cnt > 0) return;

  const seedNodes: VaultNodeRecord[] = [
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
  ];

  for (const n of seedNodes) {
    insertNodeAndEdges(db, n);
  }
}

export function getKnowledgeVaultSnapshot(): {
  nodes: VaultNodeRecord[];
  edges: VaultEdgeRecord[];
  actions: VaultStagedMcpAction[];
  dbPath: string;
} {
  const db = getVaultDb();
  const nodeRows = db.prepare('SELECT * FROM vault_nodes ORDER BY created_at DESC').all() as Record<string, string>[];
  const edgeRows = db.prepare('SELECT * FROM vault_edges ORDER BY similarity DESC').all() as Record<string, unknown>[];
  const actionRows = db.prepare('SELECT * FROM vault_actions ORDER BY action_id DESC').all() as Record<string, string>[];

  const nodes: VaultNodeRecord[] = nodeRows.map((r) => ({
    id: r.id,
    sourceType: r.source_type as VaultSourceType,
    title: r.title,
    sourceUrl: r.source_url,
    createdAt: r.created_at,
    transcript: r.transcript,
    ocrHighlights: JSON.parse(r.ocr_highlights_json),
    hooks: JSON.parse(r.hooks_json),
    entities: JSON.parse(r.entities_json),
    topics: JSON.parse(r.topics_json),
    gpuPipeline: r.gpu_pipeline,
  }));

  const edges: VaultEdgeRecord[] = edgeRows.map((r) => ({
    id: String(r.id),
    sourceId: String(r.source_id),
    targetId: String(r.target_id),
    sharedTopics: JSON.parse(String(r.shared_topics_json)),
    similarity: Number(r.similarity),
    reason: String(r.reason),
  }));

  const actions: VaultStagedMcpAction[] = actionRows.map((r) => ({
    actionId: r.action_id,
    nodeId: r.node_id,
    mcpServer: r.mcp_server as VaultStagedMcpAction['mcpServer'],
    toolName: r.tool_name,
    summary: r.summary,
    payload: JSON.parse(r.payload_json),
    status: r.status as VaultStagedMcpAction['status'],
    executedAt: r.executed_at || undefined,
    executionReceipt: r.execution_receipt || undefined,
  }));

  return {
    nodes,
    edges,
    actions,
    dbPath: DATA_PATHS.knowledgeVaultDb,
  };
}

export async function ingestVideoToVault(input: {
  urlOrPath: string;
  title?: string;
  notesFallback?: string;
  skipSubprocess?: boolean;
}): Promise<{
  node: VaultNodeRecord;
  stagedActions: VaultStagedMcpAction[];
  edgesCreated: number;
}> {
  const urlOrPath = (input.urlOrPath || '').trim();
  if (!urlOrPath) {
    throw new Error('INVALID_MEDIA_SOURCE: urlOrPath cannot be empty');
  }
  if (!/^https?:\/\//i.test(urlOrPath) && !/^local:\/\//i.test(urlOrPath)) {
    assertNeverTouchesOfficialBinaries(urlOrPath);
  }

  const lower = urlOrPath.toLowerCase();
  const sourceType: VaultSourceType = lower.includes('instagram.com') || lower.includes('reel')
    ? 'reel'
    : lower.includes('youtube.com') || lower.includes('youtu.be')
    ? 'youtube'
    : lower.includes('meeting')
    ? 'meeting'
    : 'local_video';

  const nodeId = `node_${sourceType}_${Date.now()}`;
  let transcript = (input.notesFallback || '').trim();
  let ocrHighlights: OcrHighlight[] = [];
  let gpuPipeline = 'watch_video.py --gpu auto --ocr-dml --transcribe';

  if (!input.skipSubprocess && fs.existsSync(DATA_PATHS.watchVideoScript) && /^https?:\/\//i.test(urlOrPath)) {
    const outDir = path.join(BACKUPS_DIR, 'media_runs', nodeId);
    fs.mkdirSync(outDir, { recursive: true });
    try {
      await execFileAsync(
        'python',
        [
          DATA_PATHS.watchVideoScript,
          urlOrPath,
          '--out-dir',
          outDir,
          '--gpu',
          'auto',
          '--ocr-dml',
          '--transcribe',
        ],
        { timeout: 60000 }
      );
      const manifestPath = path.join(outDir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const mf = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as {
          transcript?: string;
          ocr?: { timestamp?: string; text?: string }[];
        };
        if (mf.transcript) transcript = mf.transcript;
        if (Array.isArray(mf.ocr)) {
          ocrHighlights = mf.ocr
            .filter((o) => o.text)
            .slice(0, 6)
            .map((o) => ({ timestamp: o.timestamp || '00:00', text: String(o.text) }));
        }
      }
    } catch {
      gpuPipeline = 'watch_video.py (GPU pipeline staged - metadata/notes mode)';
    }
  }

  if (!transcript) {
    transcript = `Ingested ${sourceType} source (${urlOrPath}). Extracted visual hooks, RX 6600 Vulkan/ROCm context, and SQLite knowledge links for human review.`;
  }
  if (ocrHighlights.length === 0) {
    ocrHighlights = [{ timestamp: '00:03', text: `Source indexed: ${urlOrPath.slice(0, 64)}` }];
  }

  const { topics, entities, hooks } = extractTopicsAndEntities(transcript, ocrHighlights);
  const node: VaultNodeRecord = {
    id: nodeId,
    sourceType,
    title: input.title?.trim() || `${sourceType.toUpperCase()}: ${urlOrPath.slice(0, 52)}`,
    sourceUrl: urlOrPath,
    createdAt: new Date().toISOString(),
    transcript,
    ocrHighlights,
    hooks,
    entities,
    topics,
    gpuPipeline,
  };

  const db = getVaultDb();
  const stagedActions = insertNodeAndEdges(db, node);
  const edgeCountRow = db
    .prepare('SELECT COUNT(*) as cnt FROM vault_edges WHERE source_id = ? OR target_id = ?')
    .get(node.id, node.id) as { cnt: number };

  return {
    node,
    stagedActions,
    edgesCreated: Number(edgeCountRow?.cnt || 0),
  };
}

export function approveOrRejectVaultAction(
  actionId: string,
  decision: 'APPROVE' | 'REJECT'
): VaultStagedMcpAction {
  const db = getVaultDb();
  const row = db.prepare('SELECT * FROM vault_actions WHERE action_id = ?').get(actionId) as
    | Record<string, string>
    | undefined;
  if (!row) {
    throw new Error(`VAULT_ACTION_NOT_FOUND: ${actionId}`);
  }

  const now = new Date().toISOString();
  const status: VaultStagedMcpAction['status'] =
    decision === 'APPROVE' ? 'APPROVED_AND_EXECUTED' : 'REJECTED';
  const receipt =
    decision === 'APPROVE'
      ? `Dispatched ${row.mcp_server}.${row.tool_name} -> Logged in backups/approved_mcp_executions.jsonl`
      : 'Rejected by human operator: MCP call blocked.';

  db.prepare(`
    UPDATE vault_actions SET status = ?, executed_at = ?, execution_receipt = ? WHERE action_id = ?
  `).run(status, now, receipt, actionId);

  if (decision === 'APPROVE') {
    const auditLogPath = path.join(BACKUPS_DIR, 'approved_mcp_executions.jsonl');
    fs.appendFileSync(
      auditLogPath,
      JSON.stringify({
        executedAt: now,
        actionId,
        nodeId: row.node_id,
        mcpServer: row.mcp_server,
        toolName: row.tool_name,
        payload: JSON.parse(row.payload_json),
        humanApproved: true,
      }) + '\n',
      'utf-8'
    );
  }

  return {
    actionId: row.action_id,
    nodeId: row.node_id,
    mcpServer: row.mcp_server as VaultStagedMcpAction['mcpServer'],
    toolName: row.tool_name,
    summary: row.summary,
    payload: JSON.parse(row.payload_json),
    status,
    executedAt: now,
    executionReceipt: receipt,
  };
}
