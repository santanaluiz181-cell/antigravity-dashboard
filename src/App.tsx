import React, { useCallback, useEffect, useState } from 'react';
import { TopTelemetryBar } from './components/TopTelemetryBar';
import { BottomCommandBar, type ActiveTabId } from './components/BottomCommandBar';
import { AntigravityParticlesCanvas } from './components/AntigravityParticlesCanvas';
import { AntigravityLogo } from './components/AntigravityLogo';
import {
  Module1BloatCenter,
  type BloatScanReportDto,
  type ProfilePresetDto,
} from './components/Module1BloatCenter';
import {
  Module2LiveSessions,
  type KitsuneStatusDto,
  type SessionSummaryDto,
} from './components/Module2LiveSessions';
import {
  Module3DataSourcesPane,
  type DataSourceQueryResultDto,
  type DatasetMetaDto,
} from './components/Module3DataSourcesPane';
import {
  Module4PostMeetingMvp,
  type MeetingSessionDto,
} from './components/Module4PostMeetingMvp';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTabId>('bloat');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [cursorPill, setCursorPill] = useState<{ visible: boolean; x: number; y: number; label: string }>({
    visible: false,
    x: 0,
    y: 0,
    label: 'Explore Stage',
  });

  // Module 1 state
  const [bloatReport, setBloatReport] = useState<BloatScanReportDto | null>(null);
  const [presets, setPresets] = useState<ProfilePresetDto[]>([]);
  const [activePresetId, setActivePresetId] = useState<string>('unoptimized');
  const [quarantineLedger, setQuarantineLedger] = useState<
    { skillName: string; originalPath: string; quarantinePath: string; movedAt: string; reason: string }[]
  >([]);
  const [isApplyingPreset, setIsApplyingPreset] = useState(false);
  const [lastApplyFeedback, setLastApplyFeedback] = useState<string | null>(null);

  // Module 2 state
  const [sessions, setSessions] = useState<SessionSummaryDto[]>([]);
  const [kitsune, setKitsune] = useState<KitsuneStatusDto | null>(null);
  const [globalArtifacts, setGlobalArtifacts] = useState<
    { name: string; fullPath: string; updatedAt: string }[]
  >([]);

  // Module 3 state
  const [datasets, setDatasets] = useState<DatasetMetaDto[]>([]);
  const [initialDataResult, setInitialDataResult] = useState<DataSourceQueryResultDto | null>(null);

  // Module 4 state
  const [meetings, setMeetings] = useState<MeetingSessionDto[]>([]);
  const [gpuAsrPath, setGpuAsrPath] = useState<string>(
    'C:\\Users\\tharcio\\.gemini\\config\\plugins\\super-antigravity-tjto\\tools\\gpu_asr.py'
  );
  const [gpuAsrAvailable, setGpuAsrAvailable] = useState<boolean>(true);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const fetchAllTelemetry = useCallback(async () => {
    setIsLoading(true);
    try {
      const [bloatRes, sessRes, dsRes, mtgRes] = await Promise.all([
        fetch('/api/bloat/scan').then((r) => r.json()),
        fetch('/api/sessions/overview').then((r) => r.json()),
        fetch('/api/datasources/list').then((r) => r.json()),
        fetch('/api/meetings/list').then((r) => r.json()),
      ]);

      if (bloatRes.report) setBloatReport(bloatRes.report);
      if (Array.isArray(bloatRes.presets)) setPresets(bloatRes.presets);
      if (bloatRes.activeProfile?.activePresetId) {
        setActivePresetId(bloatRes.activeProfile.activePresetId);
      }
      if (Array.isArray(bloatRes.quarantineLedger)) {
        setQuarantineLedger(bloatRes.quarantineLedger);
      }

      if (Array.isArray(sessRes.sessions)) setSessions(sessRes.sessions);
      if (sessRes.kitsune) setKitsune(sessRes.kitsune);
      if (Array.isArray(sessRes.globalArtifacts)) setGlobalArtifacts(sessRes.globalArtifacts);

      if (Array.isArray(dsRes.datasets)) setDatasets(dsRes.datasets);
      if (dsRes.initialResult) setInitialDataResult(dsRes.initialResult);

      if (Array.isArray(mtgRes.meetings)) setMeetings(mtgRes.meetings);
      if (mtgRes.gpuAsrPath) setGpuAsrPath(mtgRes.gpuAsrPath);
      if (typeof mtgRes.gpuAsrAvailable === 'boolean') setGpuAsrAvailable(mtgRes.gpuAsrAvailable);
    } catch {
      // offline fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllTelemetry();
  }, [fetchAllTelemetry]);

  const handleApplyPreset = async (presetId: string) => {
    setIsApplyingPreset(true);
    setLastApplyFeedback(null);
    try {
      const res = await fetch('/api/bloat/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId }),
      });
      const data = await res.json();
      if (data.report) setBloatReport(data.report);
      if (data.activeProfile?.activePresetId) {
        setActivePresetId(data.activeProfile.activePresetId);
      }
      if (Array.isArray(data.quarantineLedger)) {
        setQuarantineLedger(data.quarantineLedger);
      }
      if (data.result) {
        setLastApplyFeedback(
          `Applied preset "${data.result.presetId}": quarantined ${data.result.quarantinedCount} skills, restored ${data.result.restoredCount}, toggled ${data.result.mcpToggledCount} MCP servers. Backup saved at ${data.result.backupSnapshotPath}`
        );
      }
    } finally {
      setIsApplyingPreset(false);
    }
  };

  const refreshDatasets = async () => {
    const dsRes = await fetch('/api/datasources/list').then((r) => r.json());
    if (Array.isArray(dsRes.datasets)) setDatasets(dsRes.datasets);
  };

  const refreshMeetings = async () => {
    const mtgRes = await fetch('/api/meetings/list').then((r) => r.json());
    if (Array.isArray(mtgRes.meetings)) setMeetings(mtgRes.meetings);
  };

  const stageCards: {
    id: ActiveTabId;
    num: string;
    title: string;
    subtitle: string;
    metric: string;
    accentColor: string;
  }[] = [
    {
      id: 'bloat',
      num: '01',
      title: 'Context & Bloat Control',
      subtitle: 'Quarantine duplicate skills and >250L rules with SHA-256 backups.',
      metric: `${bloatReport?.duplicateSkillsCount ?? 0} duplicates · ${bloatReport?.activeItems ?? 0} active`,
      accentColor: '#3279f9',
    },
    {
      id: 'sessions',
      num: '02',
      title: 'Brain, Kitsune & Billion-Context',
      subtitle: 'Stream transcript.jsonl, claude-mem :37777, and Graphify AST.',
      metric: `-${kitsune?.cartographerSavingsPct ?? 98.3}% tokens · ${kitsune?.graphifyNodes ?? 20} AST nodes`,
      accentColor: '#34a853',
    },
    {
      id: 'datasources',
      num: '03',
      title: 'Live Dashboards & Sources',
      subtitle: 'Drop CSV/JSON into native SQLite with read-only SQL lineage.',
      metric: `${datasets.length} mounted tables · SELECT/WITH guard`,
      accentColor: '#fbbc04',
    },
    {
      id: 'meetings',
      num: '04',
      title: 'Post-Meeting Vulkan Executor',
      subtitle: 'Transcribe via tools/gpu_asr.py and gate MCP calls behind human clicks.',
      metric: `${meetings.length} sessions · Human Gate Active`,
      accentColor: '#ea4335',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <TopTelemetryBar
        indexTokens={bloatReport?.totalSystemPromptIndexTokens ?? 0}
        budgetLimit={bloatReport?.contextBudgetLimitTokens ?? 14000}
        utilizationPct={bloatReport?.budgetUtilizationPct ?? 0}
        duplicateCount={bloatReport?.duplicateSkillsCount ?? 0}
        bloatedCount={bloatReport?.bloatedPromptsCount ?? 0}
        activePresetId={activePresetId}
        kitsuneReachable={Boolean(kitsune?.reachable)}
        kitsuneProfile={kitsune?.activeProfile || 'Gemini 4 Argon (Default)'}
        theme={theme}
        onToggleTheme={toggleTheme}
        onRefresh={fetchAllTelemetry}
        isLoading={isLoading}
      />

      <main className="flex-1 max-w-[1560px] w-full mx-auto px-5 pt-5">
        {/* Interactive Antigravity Hero + Claude Dashboards & Motion Stage Header */}
        <section
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setCursorPill({
              visible: true,
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
              label: 'Gravitational Field Active',
            });
          }}
          onPointerLeave={() => setCursorPill((prev) => ({ ...prev, visible: false }))}
          className="relative overflow-hidden rounded-3xl border border-[var(--agy-border)] bg-[var(--agy-surface)] mb-6 p-6 md:p-9"
        >
          {/* Live Mouse-Reactive Capsule Particle Canvas (Ported from antigravity.google MainParticlesComponent) */}
          <AntigravityParticlesCanvas
            theme={theme}
            density={195}
            className="absolute inset-0 w-full h-full opacity-90"
          />

          {/* Floating Custom Cursor Pill (Ported from antigravity.google CustomCursor.CwZSZOZb.css) */}
          {cursorPill.visible && (
            <div
              style={{
                transform: `translate3d(${cursorPill.x + 14}px, ${cursorPill.y - 18}px, 0)`,
              }}
              className="hidden lg:flex pointer-events-none absolute top-0 left-0 z-20 items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#121317] text-[11px] font-medium shadow-lg border border-[#e1e6ec] transition-transform duration-75"
            >
              <span className="google-symbol !text-[15px] text-[#3279f9]" aria-hidden="true">
                ads_click
              </span>
              <span>{cursorPill.label}</span>
            </div>
          )}

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center gap-3">
                <AntigravityLogo className="w-14 h-14 rounded-2xl shadow-md" />
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-[var(--agy-accent)]">
                    Google Antigravity · Local Studio
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-[var(--agy-text-primary)]">
                    Live Dashboards, Context &amp; Motion
                  </h1>
                </div>
              </div>

              <p className="text-sm sm:text-base text-[var(--agy-text-secondary)] max-w-2xl leading-relaxed">
                Every chart, token metric, and staged MCP action exposes its exact local filesystem path and read-only SQL query. Built as code on top of{' '}
                <code className="text-[var(--agy-text-primary)]">~/.gemini</code>,{' '}
                <code className="text-[var(--agy-text-primary)]">claude-mem :37777</code>, and{' '}
                <code className="text-[var(--agy-text-primary)]">Graphify AST</code>.
              </p>
            </div>

            {/* Right Interactive Stage Switcher (Claude Dashboards & Motion Showcase Pattern) */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {stageCards.map((st) => {
                const isSelected = activeTab === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setActiveTab(st.id)}
                    className={`text-left p-3.5 rounded-2xl border backdrop-blur-md transition-all ${
                      isSelected
                        ? 'bg-[var(--agy-canvas)]/95 border-[#3279f9] shadow-lg'
                        : 'bg-[var(--agy-canvas)]/75 border-[var(--agy-border)] hover:border-[#3279f9]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span style={{ color: st.accentColor }} className="font-semibold">
                        STAGE {st.num}
                      </span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full bg-[#3279f9]/15 text-[#8ab4f8] text-[10px]">
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-[var(--agy-text-primary)] mt-1">
                      {st.title}
                    </div>
                    <p className="text-[11px] text-[var(--agy-text-secondary)] mt-0.5 line-clamp-2">
                      {st.subtitle}
                    </p>
                    <div className="text-[10px] font-mono text-[var(--agy-text-muted)] mt-2 pt-1.5 border-t border-[var(--agy-border-subtle)]">
                      {st.metric}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Active Interactive Workbench Stage */}
        {activeTab === 'bloat' && (
          <Module1BloatCenter
            report={bloatReport}
            presets={presets}
            activePresetId={activePresetId}
            quarantineLedger={quarantineLedger}
            searchQuery={searchQuery}
            onApplyPreset={handleApplyPreset}
            isApplying={isApplyingPreset}
            lastApplyFeedback={lastApplyFeedback}
          />
        )}

        {activeTab === 'sessions' && (
          <Module2LiveSessions
            sessions={sessions}
            kitsune={kitsune}
            globalArtifacts={globalArtifacts}
            searchQuery={searchQuery}
          />
        )}

        {activeTab === 'datasources' && (
          <Module3DataSourcesPane
            datasets={datasets}
            initialResult={initialDataResult}
            onRefreshDatasets={refreshDatasets}
          />
        )}

        {activeTab === 'meetings' && (
          <Module4PostMeetingMvp
            meetings={meetings}
            gpuAsrPath={gpuAsrPath}
            gpuAsrAvailable={gpuAsrAvailable}
            onRefreshMeetings={refreshMeetings}
          />
        )}
      </main>

      <BottomCommandBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activePresetId={activePresetId}
        onQuickApplyPreset={handleApplyPreset}
        isApplyingPreset={isApplyingPreset}
      />
    </div>
  );
};
