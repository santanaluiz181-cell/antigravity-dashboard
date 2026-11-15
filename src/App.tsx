import React, { useCallback, useEffect, useState } from 'react';
import { TopTelemetryBar } from './components/TopTelemetryBar';
import { BottomCommandBar, type ActiveTabId } from './components/BottomCommandBar';
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
      // handle offline gracefully
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

  return (
    <div className="min-h-screen bg-[#0B0D10] text-[#E6EAF0] flex flex-col">
      <TopTelemetryBar
        indexTokens={bloatReport?.totalSystemPromptIndexTokens ?? 0}
        budgetLimit={bloatReport?.contextBudgetLimitTokens ?? 14000}
        utilizationPct={bloatReport?.budgetUtilizationPct ?? 0}
        duplicateCount={bloatReport?.duplicateSkillsCount ?? 0}
        bloatedCount={bloatReport?.bloatedPromptsCount ?? 0}
        activePresetId={activePresetId}
        kitsuneReachable={Boolean(kitsune?.reachable)}
        kitsuneProfile={kitsune?.activeProfile || 'Gemini 4 Argon (Default)'}
        onRefresh={fetchAllTelemetry}
        isLoading={isLoading}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-5 pt-5">
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
