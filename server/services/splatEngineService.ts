import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  DATA_PATHS,
  ROCM_PYTHON,
  WGPU_PYTHON,
  assertNeverTouchesOfficialBinaries,
  normalizeWinPath,
} from '../paths.js';

const execFileAsync = promisify(execFile);

export type AllowedSplatBackend = 'auto' | 'rocm' | 'wgpu';

export interface SplatEncodeRequest {
  imagePath?: string;
  imageBase64?: string;
  imageBPath?: string;
  imageBBase64?: string;
  aspect?: string;
  nmax?: number;
  steps?: number;
  backend?: string;
  quick?: boolean;
}

export interface SplatRunMetadata {
  runId: string;
  createdAt: string;
  backendRequested: AllowedSplatBackend;
  pythonInterpreter: string;
  aspect: string;
  nmax: number;
  hasMorphB: boolean;
  artifacts: string[];
  meta?: Record<string, unknown>;
}

export function assertValidSplatBackend(backendRaw?: string): AllowedSplatBackend {
  const normalized = (backendRaw || 'auto').trim().toLowerCase();
  if (normalized === 'directml' || normalized === 'cpu') {
    throw new Error(
      `HARD_ABORT_BANNED_BACKEND: Backend "${normalized}" is strictly prohibited (RX 6600 Vulkan/ROCm GPU only, zero CPU/DirectML fallback)`
    );
  }
  if (normalized !== 'auto' && normalized !== 'rocm' && normalized !== 'wgpu') {
    throw new Error(`INVALID_SPLAT_BACKEND: Unsupported backend "${normalized}"`);
  }
  return normalized;
}

export function resolveSplatPythonInterpreter(backend: AllowedSplatBackend): string {
  if (backend === 'rocm') {
    return fs.existsSync(ROCM_PYTHON) ? ROCM_PYTHON : 'python';
  }
  if (backend === 'wgpu') {
    return fs.existsSync(WGPU_PYTHON) ? WGPU_PYTHON : 'python';
  }
  if (fs.existsSync(ROCM_PYTHON)) return ROCM_PYTHON;
  if (fs.existsSync(WGPU_PYTHON)) return WGPU_PYTHON;
  return 'python';
}

export async function runGaussianSplatEncode(req: SplatEncodeRequest): Promise<SplatRunMetadata> {
  const backend = assertValidSplatBackend(req.backend);
  if (!fs.existsSync(DATA_PATHS.gaussianSplatTrainScript)) {
    throw new Error(`SPLAT_ENGINE_MISSING: ${DATA_PATHS.gaussianSplatTrainScript}`);
  }

  const runId = `splat_${Date.now()}`;
  const runDir = path.join(DATA_PATHS.splatRunsDir, runId);
  fs.mkdirSync(runDir, { recursive: true });

  let imageAPath = req.imagePath ? normalizeWinPath(req.imagePath) : '';
  if (imageAPath) {
    assertNeverTouchesOfficialBinaries(imageAPath);
  } else if (req.imageBase64) {
    const b64 = req.imageBase64.replace(/^data:[^;]+;base64,/, '');
    imageAPath = path.join(runDir, 'input_a.png');
    fs.writeFileSync(imageAPath, Buffer.from(b64, 'base64'));
  } else {
    throw new Error('MISSING_IMAGE_INPUT: Provide imagePath or imageBase64');
  }

  let imageBPath = req.imageBPath ? normalizeWinPath(req.imageBPath) : '';
  if (imageBPath) {
    assertNeverTouchesOfficialBinaries(imageBPath);
  } else if (req.imageBBase64) {
    const b64 = req.imageBBase64.replace(/^data:[^;]+;base64,/, '');
    imageBPath = path.join(runDir, 'input_b.png');
    fs.writeFileSync(imageBPath, Buffer.from(b64, 'base64'));
  }

  const aspect = (req.aspect || 'auto').trim();
  const nmax = Math.max(400, Math.min(100000, Number(req.nmax || 1600)));
  const steps = Math.max(20, Math.min(5000, Number(req.steps || (req.quick ? 20 : 600))));
  const pythonBin = resolveSplatPythonInterpreter(backend);

  const cliArgs = [
    DATA_PATHS.gaussianSplatTrainScript,
    '--image',
    imageAPath,
    '--aspect',
    aspect,
    '--backend',
    backend,
    '--nmax',
    String(nmax),
    '--steps',
    String(steps),
    '--out-dir',
    runDir,
  ];
  if (imageBPath) {
    cliArgs.push('--image-b', imageBPath);
  }
  if (req.quick) {
    cliArgs.push('--quick');
  }

  await execFileAsync(pythonBin, cliArgs, { timeout: 120000 });

  const metaPath = path.join(runDir, 'meta.json');
  const meta = fs.existsSync(metaPath)
    ? (JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as Record<string, unknown>)
    : undefined;

  const artifacts = fs.readdirSync(runDir).filter((f) =>
    ['blobs.json', 'blobs.svg', 'meta.json', 'snapshots.bin', 'depth-tex.f32', 'final-render.png', 'morph_ab.json'].includes(f)
  );

  return {
    runId,
    createdAt: new Date().toISOString(),
    backendRequested: backend,
    pythonInterpreter: pythonBin,
    aspect,
    nmax,
    hasMorphB: Boolean(imageBPath),
    artifacts,
    meta,
  };
}

export function listSplatRuns(): SplatRunMetadata[] {
  if (!fs.existsSync(DATA_PATHS.splatRunsDir)) return [];
  const entries = fs.readdirSync(DATA_PATHS.splatRunsDir, { withFileTypes: true });
  const runs: SplatRunMetadata[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const runDir = path.join(DATA_PATHS.splatRunsDir, entry.name);
    const metaPath = path.join(runDir, 'meta.json');
    let meta: Record<string, unknown> | undefined;
    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      } catch {
        // ignore
      }
    }
    const stat = fs.statSync(runDir);
    const artifacts = fs.readdirSync(runDir).filter((f) =>
      ['blobs.json', 'blobs.svg', 'meta.json', 'snapshots.bin', 'depth-tex.f32', 'final-render.png', 'morph_ab.json'].includes(f)
    );
    runs.push({
      runId: entry.name,
      createdAt: stat.mtime.toISOString(),
      backendRequested: (meta?.backend as AllowedSplatBackend) || 'auto',
      pythonInterpreter: resolveSplatPythonInterpreter('auto'),
      aspect: String(meta?.aspect || 'auto'),
      nmax: Number(meta?.n_final || 1600),
      hasMorphB: Boolean(meta?.has_morph_b),
      artifacts,
      meta,
    });
  }

  return runs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function resolveSplatArtifactFile(runId: string, fileName: string): { filePath: string; contentType: string } {
  const safeRunId = path.basename(runId);
  const safeFile = path.basename(fileName);
  const fullPath = normalizeWinPath(path.join(DATA_PATHS.splatRunsDir, safeRunId, safeFile));
  const rootNorm = normalizeWinPath(DATA_PATHS.splatRunsDir).toLowerCase();
  if (!fullPath.toLowerCase().startsWith(rootNorm + path.sep)) {
    throw new Error('PATH_TRAVERSAL_DENIED');
  }
  if (!fs.existsSync(fullPath)) {
    throw new Error(`ARTIFACT_NOT_FOUND: ${safeFile}`);
  }

  const ext = path.extname(safeFile).toLowerCase();
  const contentType =
    ext === '.json'
      ? 'application/json'
      : ext === '.svg'
      ? 'image/svg+xml'
      : ext === '.png'
      ? 'image/png'
      : ext === '.html'
      ? 'text/html; charset=utf-8'
      : 'application/octet-stream';

  return { filePath: fullPath, contentType };
}
