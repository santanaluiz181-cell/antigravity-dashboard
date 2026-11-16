import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import fs from 'node:fs';
import path from 'node:path';
import { BACKUPS_DIR, DATA_PATHS, isAllowedReadPath, normalizeWinPath } from './paths.js';
import { runFullBloatScan } from './services/tokenScanner.js';
import {
  PROFILE_PRESETS,
  applyProfilePreset,
  getActiveProfileState,
  readQuarantineLedger,
  type ProfilePreset,
} from './services/profileManager.js';
import {
  listBrainSessions,
  listGlobalHtmlArtifacts,
  probeKitsuneAndNotch,
  readSessionTranscriptSteps,
} from './services/transcriptReader.js';
import {
  ensureDefaultBootDataset,
  executeDatasetQuery,
  ingestCsvContent,
  ingestStructuredRecords,
  listDatasets,
} from './services/sqliteInspector.js';
import {
  approveOrRejectStagedAction,
  extractStructuredMeetingIntelligence,
  loadMeetingsStore,
  transcribeAudioViaGpuAsr,
} from './services/meetingPipeline.js';
import {
  approveOrRejectVaultAction,
  getKnowledgeVaultSnapshot,
  ingestVideoToVault,
} from './services/mediaKnowledgeVault.js';
import {
  listSplatRuns,
  resolveSplatArtifactFile,
  runGaussianSplatEncode,
  type SplatEncodeRequest,
} from './services/splatEngineService.js';

export const app = new Hono();

app.use(
  '/api/*',
  cors({
    origin: ['http://localhost:5175', 'http://127.0.0.1:5175', 'http://localhost:4320', 'http://127.0.0.1:4320'],
  })
);

// 1. Module 1: Context & Token-Bloat Control Center
app.get('/api/bloat/scan', (c) => {
  const report = runFullBloatScan();
  ensureDefaultBootDataset(report.items);
  return c.json({
    report,
    presets: PROFILE_PRESETS,
    activeProfile: getActiveProfileState(),
    quarantineLedger: readQuarantineLedger(),
  });
});

app.post('/api/bloat/preset', async (c) => {
  try {
    const body = (await c.req.json()) as { presetId?: ProfilePreset['id'] };
    if (!body.presetId) {
      return c.json({ error: 'Missing presetId' }, 400);
    }
    const result = await applyProfilePreset(body.presetId);
    const updatedReport = runFullBloatScan();
    return c.json({
      result,
      report: updatedReport,
      activeProfile: getActiveProfileState(),
      quarantineLedger: readQuarantineLedger(),
    });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

// 2. Module 2: Live Sessions, Remote & Kitsune Bridge
app.get('/api/sessions/overview', async (c) => {
  const sessions = listBrainSessions(25);
  const kitsune = await probeKitsuneAndNotch();
  const globalArtifacts = listGlobalHtmlArtifacts();
  return c.json({
    sessions,
    kitsune,
    globalArtifacts,
    remoteUrl: 'https://antigravity.google/remote',
    paths: {
      brainDir: DATA_PATHS.brainDir,
      htmlArtifactsDir: DATA_PATHS.htmlArtifactsDir,
    },
  });
});

app.get('/api/sessions/:conversationId/transcript', (c) => {
  const convId = c.req.param('conversationId');
  const steps = readSessionTranscriptSteps(convId, 100);
  return c.json({ conversationId: convId, steps });
});

app.get('/api/sessions/artifact-preview', (c) => {
  const filePath = c.req.query('path') || '';
  if (!filePath || !isAllowedReadPath(filePath)) {
    return c.text('Access denied: Path outside allowed Antigravity roots', 403);
  }
  const resolved = normalizeWinPath(filePath);
  if (!fs.existsSync(resolved)) {
    return c.text('Artifact file not found', 404);
  }
  const content = fs.readFileSync(resolved, 'utf-8');
  return c.html(content);
});

// 3. Module 3: Interactive Data Dashboard + Sources Pane
app.get('/api/datasources/list', (c) => {
  const scan = runFullBloatScan();
  ensureDefaultBootDataset(scan.items);
  const list = listDatasets();
  const initialResult = list.length > 0 ? executeDatasetQuery(list[0].id, `SELECT * FROM "${list[0].tableName}" LIMIT 100`) : null;
  return c.json({ datasets: list, initialResult });
});

app.post('/api/datasources/ingest', async (c) => {
  try {
    const body = (await c.req.json()) as {
      name?: string;
      format?: 'csv' | 'json';
      content?: string;
      originLabel?: string;
    };
    const name = body.name || 'custom_dataset';
    const format = body.format || 'csv';
    const rawContent = body.content || '';

    let result;
    if (format === 'csv') {
      result = ingestCsvContent(name, rawContent, body.originLabel);
    } else {
      const parsed = JSON.parse(rawContent);
      const records = Array.isArray(parsed) ? parsed : [parsed];
      result = ingestStructuredRecords(name, 'json', records, body.originLabel);
    }

    return c.json({ datasets: listDatasets(), result });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

app.post('/api/datasources/query', async (c) => {
  try {
    const body = (await c.req.json()) as { datasetId?: string; sql?: string };
    if (!body.datasetId || !body.sql) {
      return c.json({ error: 'datasetId and sql are required' }, 400);
    }
    const result = executeDatasetQuery(body.datasetId, body.sql);
    return c.json({ result });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

// 4. Module 4: Post-Meeting Executor MVP (GPU ASR + Human Approval Gate)
app.get('/api/meetings/list', (c) => {
  let list = loadMeetingsStore();
  if (list.length === 0) {
    // Seed 1 realistic session from current workspace context
    extractStructuredMeetingIntelligence(
      'Architecture Sync — Antigravity Bloat & Onyx Studio',
      'Decidimos padronizar o Antigravity Dashboard em superfície Onyx #0B0D10 sem modificar binários oficiais agy.exe. Definido que skills duplicadas em ~/.gemini/config/skills serão movidas para quarentena atômica quando o preset Coding Lean for ativado. Tarefa 1: Persistir resumo de decisão no @claude-mem. Tarefa 2: Registrar auditoria de tokens no banco SQLite local.',
      'ggml_vulkan (tools/gpu_asr.py — GPU Ready)'
    );
    list = loadMeetingsStore();
  }
  return c.json({
    meetings: list,
    gpuAsrPath: DATA_PATHS.gpuAsrScript,
    gpuAsrAvailable: fs.existsSync(DATA_PATHS.gpuAsrScript),
  });
});

app.post('/api/meetings/process', async (c) => {
  try {
    const body = (await c.req.json()) as {
      title?: string;
      transcriptText?: string;
      audioBase64?: string;
      fileName?: string;
    };
    const title = body.title || 'Post-Meeting Execution Sync';

    if (body.audioBase64) {
      fs.mkdirSync(path.join(BACKUPS_DIR, 'meeting_audio'), { recursive: true });
      const safeFile = path.basename(body.fileName || `meeting_${Date.now()}.wav`);
      const audioPath = path.join(BACKUPS_DIR, 'meeting_audio', safeFile);
      const base64Data = body.audioBase64.replace(/^data:[^;]+;base64,/, '');
      fs.writeFileSync(audioPath, Buffer.from(base64Data, 'base64'));
      const record = await transcribeAudioViaGpuAsr(audioPath, title, body.transcriptText);
      return c.json({ meeting: record, meetings: loadMeetingsStore() });
    }

    const record = extractStructuredMeetingIntelligence(
      title,
      body.transcriptText || '',
      'ggml_vulkan (tools/gpu_asr.py — Direct Transcript Pipeline)'
    );
    return c.json({ meeting: record, meetings: loadMeetingsStore() });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

app.post('/api/meetings/approve-action', async (c) => {
  try {
    const body = (await c.req.json()) as {
      meetingId?: string;
      actionId?: string;
      decision?: 'APPROVE' | 'REJECT';
    };
    if (!body.meetingId || !body.actionId || !body.decision) {
      return c.json({ error: 'meetingId, actionId, and decision are required' }, 400);
    }
    const updatedAction = approveOrRejectStagedAction(body.meetingId, body.actionId, body.decision);
    return c.json({ action: updatedAction, meetings: loadMeetingsStore() });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

// 5. Media Knowledge Vault (Reels <-> YouTube <-> Meetings Cross-Graph)
app.get('/api/media/vault', (c) => {
  const snapshot = getKnowledgeVaultSnapshot();
  return c.json({
    ...snapshot,
    watchVideoScript: DATA_PATHS.watchVideoScript,
    watchVideoAvailable: fs.existsSync(DATA_PATHS.watchVideoScript),
    semanticLookupAvailable: fs.existsSync(DATA_PATHS.semanticLookupScript),
  });
});

app.get('/api/media/graph', (c) => {
  const snapshot = getKnowledgeVaultSnapshot();
  return c.json({
    nodes: snapshot.nodes.map((n) => ({
      id: n.id,
      sourceType: n.sourceType,
      title: n.title,
      topics: n.topics,
      entities: n.entities,
      ocrCount: n.ocrHighlights.length,
    })),
    edges: snapshot.edges,
  });
});

app.post('/api/media/ingest-video', async (c) => {
  try {
    const body = (await c.req.json()) as {
      urlOrPath?: string;
      title?: string;
      notesFallback?: string;
      skipSubprocess?: boolean;
    };
    if (!body.urlOrPath) {
      return c.json({ error: 'urlOrPath is required' }, 400);
    }
    const result = await ingestVideoToVault({
      urlOrPath: body.urlOrPath,
      title: body.title,
      notesFallback: body.notesFallback,
      skipSubprocess: body.skipSubprocess,
    });
    return c.json({
      ...result,
      vault: getKnowledgeVaultSnapshot(),
    });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

app.post('/api/media/approve-action', async (c) => {
  try {
    const body = (await c.req.json()) as {
      actionId?: string;
      decision?: 'APPROVE' | 'REJECT';
    };
    if (!body.actionId || !body.decision) {
      return c.json({ error: 'actionId and decision are required' }, 400);
    }
    const updatedAction = approveOrRejectVaultAction(body.actionId, body.decision);
    return c.json({ action: updatedAction, vault: getKnowledgeVaultSnapshot() });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

// 6. Gaussian Splat 2.5D Studio (Dual-Backend: ROCm gfx1032 / wgpu Vulkan, Zero DirectML/CPU)
app.get('/api/splat/runs', (c) => {
  return c.json({
    runs: listSplatRuns(),
    viewerAvailable: fs.existsSync(DATA_PATHS.gaussianSplatViewerHtml),
    trainScriptAvailable: fs.existsSync(DATA_PATHS.gaussianSplatTrainScript),
  });
});

app.post('/api/splat/encode', async (c) => {
  try {
    const body = (await c.req.json()) as SplatEncodeRequest;
    const run = await runGaussianSplatEncode(body);
    return c.json({ run, runs: listSplatRuns() });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

app.get('/api/splat/viewer', (c) => {
  if (!fs.existsSync(DATA_PATHS.gaussianSplatViewerHtml)) {
    return c.text('viewer_25d.html not found', 404);
  }
  return c.html(fs.readFileSync(DATA_PATHS.gaussianSplatViewerHtml, 'utf-8'));
});

app.get('/api/splat/runs/:runId/:fileName', (c) => {
  try {
    const { runId, fileName } = c.req.param();
    const { filePath, contentType } = resolveSplatArtifactFile(runId, fileName);
    const buf = fs.readFileSync(filePath);
    return new Response(buf, {
      status: 200,
      headers: { 'Content-Type': contentType },
    });
  } catch (err) {
    return c.text(err instanceof Error ? err.message : 'Not found', 404);
  }
});

const isMain = process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join('server', 'index.ts'));
if (isMain) {
  const port = Number(process.env.PORT || 4320);
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`[Antigravity Dashboard API] Listening on http://127.0.0.1:${info.port}`);
  });
}
