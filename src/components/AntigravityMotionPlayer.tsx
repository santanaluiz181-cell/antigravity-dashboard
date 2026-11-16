import React, { useEffect, useMemo, useState } from 'react';

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
        </div>
      </div>

      {/* Main Split: Animated Stage on Left | Live Editable Code & Sliders on Right */}
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
    </div>
  );
};
