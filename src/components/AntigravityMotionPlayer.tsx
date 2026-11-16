import React, { useEffect, useMemo, useState } from 'react';
import { FALLBACK_SPLAT_RUNS, type SplatRunDto } from '../data/staticShowcaseData';

interface MotionScene {
  id: number;
  label: string;
  shortTitle: string;
  headline: string;
  caption: string;
  accent: string;
  nodes: { label: string; sub: string; metric: string }[];
}

const SCENES: MotionScene[] = [
  {
    id: 0,
    label: 'Scene 1',
    shortTitle: 'Context Overflow Detection',
    headline: 'Duplicate skills and >250-line rules exceed index ceiling',
    caption:
      'When global skills collide with plugin skills, Antigravity evicts core subagents (browser, research) before your prompt runs.',
    accent: '#fbbc04',
    nodes: [
      { label: '~/.gemini/config/skills', sub: 'Global duplicate layer', metric: '+2,840 idx tok' },
      { label: 'plugins/super-antigravity-tjto', sub: 'Canonical skills + rules', metric: '+3,840 idx tok' },
      { label: 'System Index Ceiling', sub: 'Eviction risk when >80%', metric: 'ALERT: Overflow' },
    ],
  },
  {
    id: 1,
    label: 'Scene 2',
    shortTitle: 'SHA-256 Atomic Quarantine',
    headline: 'One-click presets park redundant skills without touching binaries',
    caption:
      'Every toggle snapshots mcp_config.json with SHA-256 verification and keeps agy.exe completely untouched (ToS Section 6 safe).',
    accent: '#3279f9',
    nodes: [
      { label: 'assertNeverTouchesOfficialBinaries()', sub: 'Blocks .exe / .dll / .asar', metric: 'PASS (0 patches)' },
      { label: 'backups/quarantine_skills/', sub: 'Reversible SHA-256 ledger', metric: '-64% idx bloat' },
      { label: 'Coding Lean Active', sub: 'browser + research restored', metric: 'Budget Healthy' },
    ],
  },
  {
    id: 2,
    label: 'Scene 3',
    shortTitle: 'Graphify AST & claude-mem :37777',
    headline: 'Navigate 25 files and 51 AST edges at -98.4% token cost',
    caption:
      'Cartographer maps static symbols in PROJECT_MAP.md while claude-mem :37777 persists verified decisions across sessions.',
    accent: '#34a853',
    nodes: [
      { label: '.graphify.json', sub: '25 files, 51 AST edges', metric: 'Slice reads' },
      { label: 'PROJECT_MAP.md', sub: 'Cartographer symbol index', metric: '-98.4% tokens' },
      { label: 'claude-mem :37777', sub: 'Corpus + work_state_write', metric: 'HTTP 200 LIVE' },
    ],
  },
  {
    id: 3,
    label: 'Scene 4',
    shortTitle: 'Read-Only SQLite & Vulkan GPU Gate',
    headline: 'Every metric exposes SQL lineage; MCP actions await human click',
    caption:
      'Audio routes to tools/gpu_asr.py (ggml_vulkan) and staged MCP calls stay locked in PENDING_HUMAN_APPROVAL until approved.',
    accent: '#ea4335',
    nodes: [
      { label: 'tools/gpu_asr.py', sub: 'ggml_vulkan GPU ASR', metric: 'Word timestamps' },
      { label: 'node:sqlite DatabaseSync', sub: 'SELECT / WITH read-only guard', metric: '0.42 ms query' },
      { label: 'Human Approval Gate', sub: 'PENDING_HUMAN_APPROVAL', metric: 'Click to dispatch' },
    ],
  },
];

export const AntigravityMotionPlayer: React.FC<{ activePresetId: string }> = ({
  activePresetId,
}) => {
  const [sceneIdx, setSceneIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [budgetCeiling, setBudgetCeiling] = useState<number>(14000);
  const [velocityMultiplier, setVelocityMultiplier] = useState<number>(1.0);
  const [presetLabel, setPresetLabel] = useState<string>(activePresetId || 'coding-lean');
  const [studioTab, setStudioTab] = useState<'explainer' | 'splat25d'>('explainer');

  // 2.5D Gaussian Splat Studio state
  const [splatRuns, setSplatRuns] = useState<SplatRunDto[]>(FALLBACK_SPLAT_RUNS);
  const [selectedRunId, setSelectedRunId] = useState<string>(FALLBACK_SPLAT_RUNS[0].runId);
  const [splatBackend, setSplatBackend] = useState<'auto' | 'rocm' | 'wgpu'>('auto');
  const [splatAspect, setSplatAspect] = useState<string>('auto');
  const [splatNmax, setSplatNmax] = useState<number>(1600);
  const [splatImagePath, setSplatImagePath] = useState<string>('');
  const [splatImageB64, setSplatImageB64] = useState<string>('');
  const [splatImageBB64, setSplatImageBB64] = useState<string>('');
  const [isEncodingSplat, setIsEncodingSplat] = useState<boolean>(false);
  const [splatStatusMsg, setSplatStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/splat/runs')
      .then(async (r) => {
        const ct = r.headers.get('content-type') || '';
        if (!r.ok || !ct.includes('application/json')) throw new Error('API_UNAVAILABLE');
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data.runs) && data.runs.length > 0) {
          setSplatRuns(data.runs);
          setSelectedRunId(data.runs[0].runId);
        }
      })
      .catch(() => {
        // Keep FALLBACK_SPLAT_RUNS for standalone GitHub Pages
      });
  }, []);

  const activeRun = splatRuns.find((r) => r.runId === selectedRunId) || splatRuns[0];

  const handleReadImageFile = (file: File, target: 'A' | 'B') => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = typeof reader.result === 'string' ? reader.result : '';
      if (target === 'A') setSplatImageB64(res);
      else setSplatImageBB64(res);
    };
    reader.readAsDataURL(file);
  };

  const handleEncodeSplat = async () => {
    setIsEncodingSplat(true);
    setSplatStatusMsg(null);
    try {
      const res = await fetch('/api/splat/encode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backend: splatBackend,
          aspect: splatAspect,
          nmax: splatNmax,
          imagePath: splatImagePath.trim() || undefined,
          imageBase64: splatImageB64 || undefined,
          imageBBase64: splatImageBB64 || undefined,
          quick: true,
        }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) throw new Error('API_UNAVAILABLE');
      const data = await res.json();
      if (!res.ok || data.error) {
        setSplatStatusMsg(data.error || 'Splat encode error');
        return;
      }
      if (Array.isArray(data.runs)) {
        setSplatRuns(data.runs);
      }
      if (data.run?.runId) {
        setSelectedRunId(data.run.runId);
        setSplatStatusMsg(`Encoded ${data.run.runId} via ${data.run.backendRequested} on RX 6600.`);
      }
    } catch {
      const simRun: SplatRunDto = {
        runId: `splat_sim_${Date.now()}`,
        createdAt: new Date().toISOString(),
        backendRequested: splatBackend,
        pythonInterpreter:
          splatBackend === 'wgpu'
            ? 'venv_py311 (wgpu 0.33.0 Vulkan 1.4)'
            : 'E:\\Downloads_C\\VoiceStudio\\.venv\\Scripts\\python.exe (ROCm gfx1032)',
        aspect: splatAspect,
        nmax: splatNmax,
        hasMorphB: Boolean(splatImageBB64),
        artifacts: ['blobs.json', 'blobs.svg', 'snapshots.bin', 'depth-tex.f32', 'meta.json'],
        meta: {
          backend: splatBackend === 'auto' ? 'rocm' : splatBackend,
          device: 'AMD Radeon RX 6600 (Preview Mode)',
          n_final: splatNmax,
          aspect: splatAspect,
          z_sandwich: 'Z=5 BG | Z=15 Typography | Z=25 Foreground',
        },
      };
      setSplatRuns((prev) => [simRun, ...prev]);
      setSelectedRunId(simRun.runId);
      setSplatStatusMsg(`Staged 2.5D run "${simRun.runId}" (Browser Preview Mode, Zero DirectML/CPU).`);
    } finally {
      setIsEncodingSplat(false);
    }
  };

  useEffect(() => {
    if (activePresetId && activePresetId !== 'unoptimized') {
      setPresetLabel(activePresetId);
    }
  }, [activePresetId]);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setIsPlaying(false);
      return;
    }
    if (!isPlaying) return;

    const intervalMs = 60;
    const step = (100 / (3200 / intervalMs)) * velocityMultiplier;
    const timer = window.setInterval(() => {
      setProgressPct((prev) => {
        const next = prev + step;
        if (next >= 100) {
          setSceneIdx((s) => (s + 1) % SCENES.length);
          return 0;
        }
        return next;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isPlaying, velocityMultiplier]);

  const currentScene = SCENES[sceneIdx];

  const generatedMotionCode = useMemo(
    () =>
      `// Editable explainer code (built as code, zero generated video)
export const antigravityExplainerConfig = {
  scene: "${currentScene.shortTitle}",
  sceneIndex: ${sceneIdx + 1},
  preset: "${presetLabel}",
  contextBudgetCeilingTokens: ${budgetCeiling},
  capsuleRingVelocity: ${velocityMultiplier.toFixed(1)},
  securityGuard: "assertNeverTouchesOfficialBinaries()",
  telemetryEndpoints: {
    api: "http://127.0.0.1:4320",
    claudeMem: "http://127.0.0.1:37777",
    kitsuneRouter: "http://127.0.0.1:4319"
  }
};`,
    [currentScene.shortTitle, sceneIdx, presetLabel, budgetCeiling, velocityMultiplier]
  );

  return (
    <div className="onyx-card overflow-hidden">
      {/* Top Motion Studio Header */}
      <div className="px-5 py-3.5 border-b border-[var(--agy-border)] flex flex-wrap items-center justify-between gap-3 bg-[var(--agy-canvas)]/60">
        <div className="flex items-center gap-2.5">
          <span className="google-symbol text-[#3279f9]" aria-hidden="true">
            animation
          </span>
          <div>
            <div className="text-xs font-semibold text-[var(--agy-text-primary)]">
              Antigravity Motion: Code-Driven Architecture Explainer
            </div>
            <div className="text-[11px] font-mono text-[var(--agy-text-muted)]">
              Live parameterized SVG stage + editable configuration code
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-full bg-[var(--agy-canvas)] border border-[var(--agy-border)] text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setStudioTab('explainer')}
              className={`px-3 py-1 rounded-full transition-colors ${
                studioTab === 'explainer'
                  ? 'bg-[#3279f9] text-white'
                  : 'text-[var(--agy-text-secondary)] hover:text-[var(--agy-text-primary)]'
              }`}
            >
              Code Explainer
            </button>
            <button
              type="button"
              onClick={() => setStudioTab('splat25d')}
              className={`px-3 py-1 rounded-full transition-colors ${
                studioTab === 'splat25d'
                  ? 'bg-[#3279f9] text-white'
                  : 'text-[var(--agy-text-secondary)] hover:text-[var(--agy-text-primary)]'
              }`}
            >
              2.5D Gaussian Splat Studio
            </button>
          </div>

          {studioTab === 'explainer' && (
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={isPlaying ? 'Pause explainer playback' : 'Play explainer playback'}
              className="px-3 py-1.5 rounded-full bg-[#3279f9] text-white text-xs font-medium flex items-center gap-1.5 hover:opacity-95"
            >
              <span className="google-symbol !text-[16px]" aria-hidden="true">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
          )}
        </div>
      </div>

      {studioTab === 'splat25d' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left 5 cols: Dual-Backend RX 6600 Encoder Controls */}
          <div className="lg:col-span-5 p-5 space-y-3.5 border-b lg:border-b-0 lg:border-r border-[var(--agy-border)] bg-[var(--agy-canvas)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--agy-accent)]">
                RX 6600 Dual-Backend Encoder
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#34a853]/15 text-[#34a853] border border-[#34a853]/30">
                Zero DirectML / Zero CPU
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-mono text-[var(--agy-text-muted)] block">Backend</label>
                <select
                  value={splatBackend}
                  onChange={(e) => setSplatBackend(e.target.value as 'auto' | 'rocm' | 'wgpu')}
                  className="w-full mt-1 bg-[var(--agy-surface)] border border-[var(--agy-border)] rounded-lg px-2 py-1.5 text-xs font-mono text-[var(--agy-text-primary)]"
                >
                  <option value="auto">auto (RX 6600)</option>
                  <option value="rocm">rocm (gfx1032)</option>
                  <option value="wgpu">wgpu (Vulkan)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-[var(--agy-text-muted)] block">Aspect</label>
                <select
                  value={splatAspect}
                  onChange={(e) => setSplatAspect(e.target.value)}
                  className="w-full mt-1 bg-[var(--agy-surface)] border border-[var(--agy-border)] rounded-lg px-2 py-1.5 text-xs font-mono text-[var(--agy-text-primary)]"
                >
                  <option value="auto">auto</option>
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16 (Reels)</option>
                  <option value="1:1">1:1</option>
                  <option value="4:5">4:5</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-[var(--agy-text-muted)] block">NMAX Blobs</label>
                <input
                  type="number"
                  min={400}
                  max={100000}
                  step={200}
                  value={splatNmax}
                  onChange={(e) => setSplatNmax(Number(e.target.value))}
                  className="w-full mt-1 bg-[var(--agy-surface)] border border-[var(--agy-border)] rounded-lg px-2 py-1.5 text-xs font-mono text-[var(--agy-text-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-[var(--agy-text-muted)] block">
                Local Image A Path (or upload below)
              </label>
              <input
                type="text"
                value={splatImagePath}
                onChange={(e) => setSplatImagePath(e.target.value)}
                placeholder="C:\Users\...\frame.png or leave empty & upload"
                className="w-full mt-1 bg-[var(--agy-surface)] border border-[var(--agy-border)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[var(--agy-text-primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="p-2.5 rounded-xl border border-dashed border-[var(--agy-border)] hover:border-[#3279f9] text-center cursor-pointer bg-[var(--agy-surface)]">
                <div className="text-[11px] font-mono text-[var(--agy-text-primary)]">
                  {splatImageB64 ? 'Image A Loaded' : 'Upload Image A'}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleReadImageFile(f, 'A');
                  }}
                />
              </label>
              <label className="p-2.5 rounded-xl border border-dashed border-[var(--agy-border)] hover:border-[#3279f9] text-center cursor-pointer bg-[var(--agy-surface)]">
                <div className="text-[11px] font-mono text-[var(--agy-text-secondary)]">
                  {splatImageBB64 ? 'Morph B Loaded' : 'Optional Morph B'}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleReadImageFile(f, 'B');
                  }}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleEncodeSplat}
              disabled={isEncodingSplat}
              className="w-full py-2 rounded-full bg-[#3279f9] text-white font-semibold text-xs hover:opacity-95"
            >
              {isEncodingSplat
                ? 'Encoding 2.5D Gaussian Splats on RX 6600...'
                : 'Encode 2.5D Splats (train.py --backend auto)'}
            </button>

            {splatStatusMsg && (
              <div className="text-[11px] font-mono text-[#34a853] bg-[#34a853]/10 border border-[#34a853]/30 rounded-lg p-2">
                {splatStatusMsg}
              </div>
            )}
          </div>

          {/* Right 7 cols: Z-Sandwich Preview & Artifacts Inspector */}
          <div className="lg:col-span-7 p-5 space-y-4 bg-[var(--agy-surface)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-[var(--agy-text-primary)]">
                  Z-Sandwich 2.5D Parallax &amp; Remotion Scene (`GaussianSplat25DScene`)
                </div>
                <div className="text-[11px] font-mono text-[var(--agy-text-muted)]">
                  Run: {activeRun?.runId} · Interpreter: {activeRun?.pythonInterpreter}
                </div>
              </div>
              <a
                href="/api/splat/viewer"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded-full bg-[var(--agy-canvas)] border border-[var(--agy-border)] text-[11px] font-mono text-[var(--agy-accent)] hover:border-[#3279f9]"
              >
                Open WebGL2 viewer_25d.html
              </a>
            </div>

            {/* Z-Sandwich Layer Diagram */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-[var(--agy-canvas)] border border-[var(--agy-border)]">
                <div className="text-[10px] font-mono text-[#8ab4f8]">Z=5 · BACKGROUND</div>
                <div className="text-xs font-semibold text-[var(--agy-text-primary)] mt-1">
                  Depth-Masked BG Splats
                </div>
                <div className="text-[10px] font-mono text-[var(--agy-text-muted)] mt-1">
                  depth.py (Depth Anything V2)
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--agy-canvas)] border border-[#3279f9]/50">
                <div className="text-[10px] font-mono text-[#fbbc04]">Z=15 · MIDGROUND</div>
                <div className="text-xs font-semibold text-[var(--agy-text-primary)] mt-1">
                  Editorial Typography
                </div>
                <div className="text-[10px] font-mono text-[var(--agy-text-muted)] mt-1">
                  Occluded behind subject
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--agy-canvas)] border border-[var(--agy-border)]">
                <div className="text-[10px] font-mono text-[#34a853]">Z=25 · FOREGROUND</div>
                <div className="text-xs font-semibold text-[var(--agy-text-primary)] mt-1">
                  Subject 2.5D Parallax
                </div>
                <div className="text-[10px] font-mono text-[var(--agy-text-muted)] mt-1">
                  remotion_gaussian_splat_25d.tsx
                </div>
              </div>
            </div>

            {/* Emitted Artifacts & Meta */}
            <div className="bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-xl p-3 space-y-2">
              <div className="text-[10px] font-mono uppercase text-[var(--agy-text-muted)]">
                Run Artifacts ({activeRun?.artifacts.length || 0})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(activeRun?.artifacts || []).map((art) => (
                  <a
                    key={art}
                    href={`/api/splat/runs/${encodeURIComponent(activeRun.runId)}/${encodeURIComponent(art)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-0.5 rounded bg-[var(--agy-surface)] border border-[var(--agy-border)] text-[10px] font-mono text-[var(--agy-accent)] hover:border-[#3279f9]"
                  >
                    {art}
                  </a>
                ))}
              </div>
              <pre className="text-[10px] font-mono text-[var(--agy-text-secondary)] overflow-x-auto pt-1">
                {JSON.stringify(activeRun?.meta || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        /* Main Split: Animated Stage on Left | Live Editable Code & Sliders on Right */
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left Stage (7 cols) */}
        <div className="lg:col-span-7 p-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[var(--agy-border)] bg-[var(--agy-canvas)]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span
                style={{ color: currentScene.accent }}
                className="text-[11px] font-mono font-semibold uppercase tracking-wider"
              >
                {currentScene.label}: {currentScene.shortTitle}
              </span>
              <span className="text-[11px] font-mono text-[var(--agy-text-muted)]">
                Budget Ceiling: {budgetCeiling.toLocaleString()} tok
              </span>
            </div>

            <h4 className="text-lg font-semibold text-[var(--agy-text-primary)] mt-1.5">
              {currentScene.headline}
            </h4>
            <p className="text-xs text-[var(--agy-text-secondary)] mt-1 leading-relaxed">
              {currentScene.caption}
            </p>

            {/* Animated 3-Node Pipeline Visualization */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 relative">
              {currentScene.nodes.map((node, i) => {
                const isActiveNode = Math.floor((progressPct / 100) * 3) === i;
                return (
                  <div
                    key={node.label}
                    style={{
                      borderColor: isActiveNode ? currentScene.accent : 'var(--agy-border)',
                    }}
                    className={`p-3.5 rounded-xl border bg-[var(--agy-surface)] transition-all duration-300 ${
                      isActiveNode ? 'scale-[1.02] shadow-lg' : 'opacity-85'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[var(--agy-text-muted)]">STEP 0{i + 1}</span>
                      <span
                        style={{ color: currentScene.accent }}
                        className="font-semibold"
                      >
                        {node.metric}
                      </span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-[var(--agy-text-primary)] mt-2 break-all">
                      {node.label}
                    </div>
                    <div className="text-[11px] text-[var(--agy-text-secondary)] mt-1">
                      {node.sub}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scrubber & Scene Pills */}
          <div className="mt-6 space-y-2.5">
            <div className="w-full h-1.5 rounded-full bg-[var(--agy-surface)] border border-[var(--agy-border)] overflow-hidden">
              <div
                style={{ width: `${progressPct}%`, backgroundColor: currentScene.accent }}
                className="h-full transition-all duration-75"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SCENES.map((sc, idx) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => {
                    setSceneIdx(idx);
                    setProgressPct(0);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-mono border transition-colors ${
                    sceneIdx === idx
                      ? 'bg-[#3279f9]/15 border-[#3279f9] text-[var(--agy-accent)]'
                      : 'bg-[var(--agy-surface)] border-[var(--agy-border)] text-[var(--agy-text-secondary)] hover:text-[var(--agy-text-primary)]'
                  }`}
                >
                  {sc.label}: {sc.shortTitle}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Editable Parameters & Live Code Output (5 cols) */}
        <div className="lg:col-span-5 p-5 space-y-4 bg-[var(--agy-surface)]">
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--agy-text-secondary)]">
              Live Editable Motion Parameters
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="motion-budget-slider"
                  className="text-[11px] font-mono text-[var(--agy-text-secondary)] block"
                >
                  Token Ceiling: {budgetCeiling.toLocaleString()}
                </label>
                <input
                  id="motion-budget-slider"
                  type="range"
                  min={8000}
                  max={24000}
                  step={1000}
                  value={budgetCeiling}
                  onChange={(e) => setBudgetCeiling(Number(e.target.value))}
                  className="w-full mt-1 accent-[#3279f9]"
                />
              </div>

              <div>
                <label
                  htmlFor="motion-speed-slider"
                  className="text-[11px] font-mono text-[var(--agy-text-secondary)] block"
                >
                  Playback Speed: {velocityMultiplier.toFixed(1)}x
                </label>
                <input
                  id="motion-speed-slider"
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.5}
                  value={velocityMultiplier}
                  onChange={(e) => setVelocityMultiplier(Number(e.target.value))}
                  className="w-full mt-1 accent-[#3279f9]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="motion-preset-input"
                className="text-[11px] font-mono text-[var(--agy-text-secondary)] block"
              >
                Target Profile Label
              </label>
              <input
                id="motion-preset-input"
                type="text"
                value={presetLabel}
                onChange={(e) => setPresetLabel(e.target.value)}
                className="w-full mt-1 bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-lg px-3 py-1.5 text-xs font-mono text-[var(--agy-text-primary)]"
              />
            </div>
          </div>

          <div>
            <div className="text-[11px] font-mono text-[var(--agy-text-muted)] mb-1.5">
              Generated Code Spec (Live Sync)
            </div>
            <pre className="p-3 rounded-xl bg-[var(--agy-canvas)] border border-[var(--agy-border)] text-[11px] font-mono text-[var(--agy-accent)] overflow-x-auto leading-relaxed">
              {generatedMotionCode}
            </pre>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
