import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  FileAudio,
  Film,
  GitBranch,
  Link2,
  Lock,
  Mic,
  Play,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  FALLBACK_VAULT_SNAPSHOT,
  extractMeetingClientSide,
  ingestVideoClientSide,
  type VaultSnapshotDto,
} from '../data/staticShowcaseData';

export interface StagedMcpActionDto {
  actionId: string;
  mcpServer: string;
  toolName: string;
  summary: string;
  owner: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  payload: Record<string, unknown>;
  status: 'PENDING_HUMAN_APPROVAL' | 'APPROVED_AND_EXECUTED' | 'REJECTED';
  executedAt?: string;
  executionReceipt?: string;
}

export interface MeetingSessionDto {
  meetingId: string;
  title: string;
  createdAt: string;
  asrEngine: string;
  durationSec: number;
  transcript: string;
  executiveSummary: string[];
  decisions: string[];
  stagedActions: StagedMcpActionDto[];
}

interface Module4Props {
  meetings: MeetingSessionDto[];
  gpuAsrPath: string;
  gpuAsrAvailable: boolean;
  onRefreshMeetings: () => void;
  onClientUpdateMeetings?: (updater: (prev: MeetingSessionDto[]) => MeetingSessionDto[]) => void;
  embedded?: boolean;
}

export const Module4PostMeetingMvp: React.FC<Module4Props> = ({
  meetings,
  gpuAsrPath,
  gpuAsrAvailable,
  onRefreshMeetings,
  onClientUpdateMeetings,
  embedded = false,
}) => {
  const [hubTab, setHubTab] = useState<'vault' | 'meetings'>('vault');
  const [title, setTitle] = useState('Gabinete / Architecture Sync');
  const [transcriptInput, setTranscriptInput] = useState(
    'Decidimos ativar o preset Coding Lean para remover skills duplicadas em ~/.gemini/config/skills e liberar o orçamento de contexto. Tarefa 1: Salvar decisão arquitetural no @claude-mem. Tarefa 2: Registrar log de auditoria no SQLite.'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>(meetings[0]?.meetingId || '');

  // Cross-Media Knowledge Vault state (Reels + YouTube + Meetings)
  const [vault, setVault] = useState<VaultSnapshotDto>(FALLBACK_VAULT_SNAPSHOT);
  const [videoUrl, setVideoUrl] = useState('https://www.instagram.com/reel/antigravity-gpu-splat/');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoNotes, setVideoNotes] = useState('');
  const [isIngestingVideo, setIsIngestingVideo] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    FALLBACK_VAULT_SNAPSHOT.nodes[0]?.id || ''
  );

  useEffect(() => {
    fetch('/api/media/vault')
      .then(async (r) => {
        const ct = r.headers.get('content-type') || '';
        if (!r.ok || !ct.includes('application/json')) throw new Error('API_UNAVAILABLE');
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data.nodes) && data.nodes.length > 0) {
          setVault({
            nodes: data.nodes,
            edges: data.edges || [],
            actions: data.actions || [],
            dbPath: data.dbPath || 'backups/knowledge_vault.db',
          });
          setSelectedNodeId(data.nodes[0].id);
        }
      })
      .catch(() => {
        // Keep static showcase vault fallback
      });
  }, []);

  const activeMeeting =
    meetings.find((m) => m.meetingId === selectedMeetingId) || meetings[0] || null;

  const activeVaultNode =
    vault.nodes.find((n) => n.id === selectedNodeId) || vault.nodes[0] || null;

  const handleIngestVideo = async () => {
    if (!videoUrl.trim()) return;
    setIsIngestingVideo(true);
    try {
      const res = await fetch('/api/media/ingest-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urlOrPath: videoUrl.trim(),
          title: videoTitle.trim() || undefined,
          notesFallback: videoNotes.trim() || undefined,
        }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.includes('application/json')) throw new Error('API_UNAVAILABLE');
      const data = await res.json();
      if (data.vault) {
        setVault(data.vault);
        if (data.node?.id) setSelectedNodeId(data.node.id);
      }
    } catch {
      const updated = ingestVideoClientSide(vault, videoUrl.trim(), videoTitle, videoNotes);
      setVault(updated);
      if (updated.nodes[0]) setSelectedNodeId(updated.nodes[0].id);
    } finally {
      setIsIngestingVideo(false);
    }
  };

  const handleVaultActionDecision = async (actionId: string, decision: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch('/api/media/approve-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, decision }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.includes('application/json')) throw new Error('API_UNAVAILABLE');
      const data = await res.json();
      if (data.vault) setVault(data.vault);
    } catch {
      setVault((prev) => ({
        ...prev,
        actions: prev.actions.map((act) => {
          if (act.actionId !== actionId) return act;
          const now = new Date().toISOString();
          return decision === 'APPROVE'
            ? {
                ...act,
                status: 'APPROVED_AND_EXECUTED',
                executedAt: now,
                executionReceipt: `Approved in browser gate -> ${act.mcpServer}.${act.toolName}`,
              }
            : {
                ...act,
                status: 'REJECTED',
                executedAt: now,
                executionReceipt: 'Rejected by human operator: MCP call blocked.',
              };
        }),
      }));
    }
  };

  const handleProcessMeeting = async (audioBase64?: string, fileName?: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/meetings/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          transcriptText: transcriptInput,
          audioBase64,
          fileName,
        }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.includes('application/json')) {
        throw new Error('API_UNAVAILABLE');
      }
      const data = await res.json();
      if (data.meeting) {
        setSelectedMeetingId(data.meeting.meetingId);
      }
      onRefreshMeetings();
    } catch {
      const created = extractMeetingClientSide(title, transcriptInput);
      onClientUpdateMeetings?.((prev) => [created, ...prev]);
      setSelectedMeetingId(created.meetingId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAudioDrop = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = typeof reader.result === 'string' ? reader.result : '';
      handleProcessMeeting(b64, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleDecision = async (
    meetingId: string,
    actionId: string,
    decision: 'APPROVE' | 'REJECT'
  ) => {
    try {
      const res = await fetch('/api/meetings/approve-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, actionId, decision }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.includes('application/json')) {
        throw new Error('API_UNAVAILABLE');
      }
      onRefreshMeetings();
    } catch {
      onClientUpdateMeetings?.((prev) =>
        prev.map((m) => {
          if (m.meetingId !== meetingId) return m;
          return {
            ...m,
            stagedActions: m.stagedActions.map((act) => {
              if (act.actionId !== actionId) return act;
              const now = new Date().toISOString();
              if (decision === 'REJECT') {
                return {
                  ...act,
                  status: 'REJECTED',
                  executedAt: now,
                  executionReceipt: 'Rejected by human operator: MCP call blocked.',
                };
              }
              return {
                ...act,
                status: 'APPROVED_AND_EXECUTED',
                executedAt: now,
                executionReceipt: `Approved in browser gate -> ${act.mcpServer}.${act.toolName} simulated receipt`,
              };
            }),
          };
        })
      );
    }
  };

  const sourceBadgeColor = (t: string) => {
    if (t === 'reel') return 'bg-[#ea4335]/15 text-[#ea4335] border-[#ea4335]/30';
    if (t === 'youtube') return 'bg-[#fbbc04]/15 text-[#fbbc04] border-[#fbbc04]/30';
    return 'bg-[#3279f9]/15 text-[#8ab4f8] border-[#3279f9]/30';
  };

  return (
    <div className={`space-y-4 ${embedded ? 'pb-4' : 'pb-24'}`}>
      {/* Top Knowledge Hub & GPU Pipeline Header */}
      <div className="onyx-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--agy-canvas)] border border-[var(--agy-border)] text-[var(--agy-accent)]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-[var(--agy-text-primary)]">
                Knowledge Hub (Instagram Reels + YouTube + Meetings)
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#34a853]/15 text-[#34a853] border border-[#34a853]/30">
                {gpuAsrAvailable ? 'GPU ASR + WATCH_VIDEO READY' : 'LOCAL PIPELINE'}
              </span>
            </div>
            <p className="text-xs text-[var(--agy-text-secondary)] font-mono mt-0.5">
              watch_video.py (--gpu auto --ocr-dml --transcribe) + {gpuAsrPath} · Human Click Gate Active
            </p>
          </div>
        </div>

        {/* Sub-Mode Toggle */}
        <div className="flex items-center p-0.5 rounded-full bg-[var(--agy-canvas)] border border-[var(--agy-border)] text-[11px] font-mono">
          <button
            type="button"
            onClick={() => setHubTab('vault')}
            className={`px-3 py-1 rounded-full transition-colors ${
              hubTab === 'vault'
                ? 'bg-[#3279f9] text-white'
                : 'text-[var(--agy-text-secondary)] hover:text-[var(--agy-text-primary)]'
            }`}
          >
            Reels &amp; YouTube Vault ({vault.nodes.length})
          </button>
          <button
            type="button"
            onClick={() => setHubTab('meetings')}
            className={`px-3 py-1 rounded-full transition-colors ${
              hubTab === 'meetings'
                ? 'bg-[#3279f9] text-white'
                : 'text-[var(--agy-text-secondary)] hover:text-[var(--agy-text-primary)]'
            }`}
          >
            Meetings Audio ({meetings.length})
          </button>
        </div>
      </div>

      {hubTab === 'vault' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 5 cols: Ingest Reels/YouTube URL + Nodes List */}
          <div className="onyx-card p-4 lg:col-span-5 space-y-3.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--agy-text-secondary)] flex items-center gap-2">
              <Film className="w-3.5 h-3.5 text-[var(--agy-accent)]" />
              1. Ingest Instagram Reel / YouTube / Local Video
            </h3>

            <div>
              <label htmlFor="vault-url-input" className="text-[11px] font-mono text-[var(--agy-text-secondary)]">
                Reels / YouTube URL or Local Path
              </label>
              <input
                id="vault-url-input"
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.instagram.com/reel/... or https://youtube.com/watch?v=..."
                className="w-full mt-1 bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-xl px-3 py-1.5 text-xs font-mono text-[var(--agy-text-primary)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Optional custom title..."
                className="bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--agy-text-primary)]"
              />
              <input
                type="text"
                value={videoNotes}
                onChange={(e) => setVideoNotes(e.target.value)}
                placeholder="Optional context / topics..."
                className="bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--agy-text-primary)]"
              />
            </div>

            <button
              type="button"
              onClick={handleIngestVideo}
              disabled={isIngestingVideo}
              className="w-full py-2 rounded-full bg-[#3279f9] text-white font-semibold text-xs hover:opacity-95 flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              {isIngestingVideo
                ? 'Running watch_video.py (GPU + OCR + ASR)...'
                : 'Extract Transcript, OCR & Cross-Link Graph'}
            </button>

            <div className="pt-2 border-t border-[var(--agy-border)] space-y-2 max-h-[310px] overflow-y-auto pr-1">
              <div className="text-[11px] font-mono text-[var(--agy-text-muted)]">
                Indexed Knowledge Nodes ({vault.nodes.length}) · {vault.dbPath}
              </div>
              {vault.nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    activeVaultNode?.id === node.id
                      ? 'bg-[var(--agy-surface-elevated)] border-[#3279f9]'
                      : 'bg-[var(--agy-canvas)] border-[var(--agy-border)] hover:border-[#3279f9]/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border uppercase ${sourceBadgeColor(node.sourceType)}`}>
                      {node.sourceType}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--agy-text-muted)]">
                      {node.topics.length} topics
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[var(--agy-text-primary)] mt-1.5">
                    {node.title}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {node.topics.slice(0, 4).map((tp) => (
                      <span
                        key={tp}
                        className="px-1.5 py-0.5 rounded bg-[var(--agy-surface)] border border-[var(--agy-border)] text-[10px] font-mono text-[var(--agy-accent)]"
                      >
                        #{tp}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right 7 cols: Cross-Media Graph Connections + OCR Highlights + Human Approval Queue */}
          <div className="onyx-card p-4 lg:col-span-7 space-y-4">
            {activeVaultNode && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--agy-border)] pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--agy-text-primary)]">
                      {activeVaultNode.title}
                    </h3>
                    <div className="text-[11px] font-mono text-[var(--agy-text-muted)] truncate max-w-[460px]">
                      {activeVaultNode.sourceUrl} · {activeVaultNode.gpuPipeline}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--agy-canvas)] border border-[var(--agy-border)] text-[10px] font-mono text-[#34a853]">
                    <GitBranch className="w-3 h-3" />
                    {vault.edges.length} Cross-Media Edges
                  </span>
                </div>

                {/* Transcript + OCR Frame Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-xl p-3">
                    <div className="text-[10px] font-mono uppercase text-[var(--agy-text-muted)] mb-1.5">
                      GPU Transcript &amp; Extracted Hooks
                    </div>
                    <p className="text-xs text-[var(--agy-text-primary)] leading-relaxed">
                      {activeVaultNode.transcript}
                    </p>
                  </div>

                  <div className="bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-xl p-3">
                    <div className="text-[10px] font-mono uppercase text-[var(--agy-accent)] mb-1.5">
                      Frame OCR Highlights (Timestamps)
                    </div>
                    <div className="space-y-1.5">
                      {activeVaultNode.ocrHighlights.map((ocr, idx) => (
                        <div key={idx} className="text-xs font-mono flex items-start gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-[var(--agy-surface)] text-[#fbbc04] shrink-0">
                            {ocr.timestamp}
                          </span>
                          <span className="text-[var(--agy-text-primary)]">{ocr.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cross-Media Graph Edges (Reels <-> YouTube <-> Meetings) */}
                <div className="bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-xl p-3 space-y-2">
                  <div className="text-[11px] font-mono uppercase text-[var(--agy-text-secondary)] flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[var(--agy-accent)]" />
                    Cross-Knowledge Connections (Reels / YouTube / Meetings)
                  </div>
                  {vault.edges.length === 0 ? (
                    <div className="text-xs text-[var(--agy-text-muted)]">
                      No cross-links detected yet. Ingest another Reel or YouTube video with overlapping topics.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {vault.edges.map((edge) => (
                        <div
                          key={edge.id}
                          className="p-2 rounded-lg bg-[var(--agy-surface)] border border-[var(--agy-border)] flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <span className="font-mono text-[var(--agy-text-primary)]">{edge.reason}</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#3279f9]/15 text-[var(--agy-accent)] font-mono text-[10px]">
                            sim {Math.round(edge.similarity * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Staged Vault MCP Actions (Human-in-the-Loop Gate) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--agy-text-secondary)]">
                  Staged Vault MCP Actions ({vault.actions.length})
                </span>
                <span className="text-[11px] font-mono text-[#fbbc04]">
                  Locked in PENDING_HUMAN_APPROVAL until clicked
                </span>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {vault.actions.map((act) => (
                  <div
                    key={act.actionId}
                    className="bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 rounded bg-[var(--agy-surface)] border border-[var(--agy-border)] font-mono text-[10px] text-[var(--agy-accent)]">
                        mcp:{act.mcpServer} -&gt; {act.toolName}
                      </span>
                      <div className="text-xs text-[var(--agy-text-primary)] font-medium">
                        {act.summary}
                      </div>
                      {act.executionReceipt && (
                        <div className="text-[11px] font-mono text-[#34a853]">{act.executionReceipt}</div>
                      )}
                    </div>

                    {act.status === 'PENDING_HUMAN_APPROVAL' ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleVaultActionDecision(act.actionId, 'APPROVE')}
                          className="px-3 py-1 rounded-full bg-[#34a853] text-white font-semibold text-xs flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Approve &amp; Trigger MCP
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVaultActionDecision(act.actionId, 'REJECT')}
                          className="px-2.5 py-1 rounded-full bg-[var(--agy-surface)] border border-[var(--agy-border)] text-[#ea4335] text-xs"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-xs font-mono ${
                          act.status === 'APPROVED_AND_EXECUTED' ? 'text-[#34a853]' : 'text-[#ea4335]'
                        }`}
                      >
                        {act.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Meetings Audio GPU ASR Tab */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 5 cols: Audio Upload / Notes Input */}
          <div className="onyx-card p-4 lg:col-span-5 space-y-3.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--agy-text-secondary)] flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-[var(--agy-accent)]" />
              1. Ingest Meeting Audio or Notes
            </h3>

            <div>
              <label htmlFor="meeting-title-input" className="text-[11px] font-mono text-[var(--agy-text-secondary)]">
                Meeting / Session Title
              </label>
              <input
                id="meeting-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full mt-1 bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--agy-text-primary)]"
              />
            </div>

            <label className="onyx-card-interactive p-3.5 flex items-center justify-between border-dashed">
              <div className="flex items-center gap-2.5">
                <FileAudio className="w-4 h-4 text-[var(--agy-accent)]" />
                <div>
                  <div className="text-xs font-medium text-[var(--agy-text-primary)]">
                    Upload Meeting Audio (.wav / .mp3 / .m4a)
                  </div>
                  <div className="text-[10px] font-mono text-[var(--agy-text-muted)]">
                    Routes directly to tools/gpu_asr.py (Vulkan GPU)
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[var(--agy-surface-elevated)] text-[11px] font-mono text-[var(--agy-accent)]">
                Browse
              </span>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAudioDrop(f);
                }}
              />
            </label>

            <div>
              <label htmlFor="meeting-notes-textarea" className="text-[11px] font-mono text-[var(--agy-text-secondary)]">
                Transcript Buffer / Voice Notes
              </label>
              <textarea
                id="meeting-notes-textarea"
                rows={5}
                value={transcriptInput}
                onChange={(e) => setTranscriptInput(e.target.value)}
                className="w-full mt-1 bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-xl p-2.5 text-xs text-[var(--agy-text-primary)] leading-relaxed"
              />
            </div>

            <button
              type="button"
              onClick={() => handleProcessMeeting()}
              disabled={isProcessing}
              className="w-full py-2 rounded-full bg-[#3279f9] text-white font-semibold text-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              {isProcessing
                ? 'Extracting Decisions & Staging MCP Actions...'
                : 'Extract Decisions & Stage MCP Actions (Locked)'}
            </button>

            {meetings.length > 1 && (
              <div className="pt-3 border-t border-[var(--agy-border)]">
                <div className="text-[11px] font-mono text-[var(--agy-text-secondary)] mb-1.5">
                  Recent Meeting Sessions ({meetings.length})
                </div>
                <div className="space-y-1.5">
                  {meetings.map((m) => (
                    <button
                      key={m.meetingId}
                      type="button"
                      onClick={() => setSelectedMeetingId(m.meetingId)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-mono border ${
                        activeMeeting?.meetingId === m.meetingId
                          ? 'bg-[var(--agy-surface-elevated)] border-[#3279f9] text-[var(--agy-text-primary)]'
                          : 'bg-[var(--agy-canvas)] border-[var(--agy-border)] text-[var(--agy-text-secondary)]'
                      }`}
                    >
                      {m.title} · {m.stagedActions.length} staged actions
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right 7 cols: Structured Summary, Decisions & Human Click Approval Gate */}
          {activeMeeting && (
            <div className="onyx-card p-4 lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--agy-border)] pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--agy-text-primary)]">{activeMeeting.title}</h3>
                  <span className="text-[11px] font-mono text-[var(--agy-text-muted)]">
                    Engine: {activeMeeting.asrEngine} · Est. Duration: {activeMeeting.durationSec}s
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--agy-canvas)] border border-[var(--agy-border)] text-[11px] font-mono text-[var(--agy-accent)]">
                  <Lock className="w-3 h-3" />
                  Human-in-the-Loop Gate Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-xl p-3">
                  <div className="text-[11px] font-mono uppercase text-[var(--agy-text-secondary)] mb-1.5">
                    Executive Summary
                  </div>
                  <ul className="space-y-1.5 text-xs text-[var(--agy-text-primary)] list-disc list-inside">
                    {activeMeeting.executiveSummary.map((s, i) => (
                      <li key={i} className="leading-relaxed">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-xl p-3">
                  <div className="text-[11px] font-mono uppercase text-[#34a853] mb-1.5">
                    Verified Decisions
                  </div>
                  <ul className="space-y-1.5 text-xs text-[var(--agy-text-primary)] list-disc list-inside">
                    {activeMeeting.decisions.map((d, i) => (
                      <li key={i} className="leading-relaxed">
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--agy-text-secondary)]">
                    2. Staged Antigravity MCP Actions ({activeMeeting.stagedActions.length})
                  </span>
                  <span className="text-[11px] font-mono text-[#fbbc04]">
                    Zero auto-execution without operator click
                  </span>
                </div>

                <div className="space-y-2.5">
                  {activeMeeting.stagedActions.map((act) => (
                    <div
                      key={act.actionId}
                      className="bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-xl p-3.5 flex flex-col gap-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[var(--agy-surface)] border border-[var(--agy-border)] font-mono text-[11px] text-[var(--agy-accent)]">
                            mcp:{act.mcpServer} -&gt; {act.toolName}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--agy-text-secondary)]">
                            Owner: {act.owner} · Priority: {act.priority}
                          </span>
                        </div>

                        {act.status === 'PENDING_HUMAN_APPROVAL' ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleDecision(activeMeeting.meetingId, act.actionId, 'APPROVE')
                              }
                              className="px-3 py-1 rounded-full bg-[#34a853] text-white font-semibold text-xs flex items-center gap-1 hover:opacity-90"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Approve &amp; Trigger MCP
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDecision(activeMeeting.meetingId, act.actionId, 'REJECT')
                              }
                              className="px-2.5 py-1 rounded-full bg-[var(--agy-surface)] border border-[var(--agy-border)] text-[#ea4335] text-xs flex items-center gap-1 hover:border-[#ea4335]"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        ) : act.status === 'APPROVED_AND_EXECUTED' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-[#34a853]">
                            <CheckCircle2 className="w-4 h-4" />
                            APPROVED &amp; DISPATCHED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-[#ea4335]">
                            <XCircle className="w-4 h-4" />
                            REJECTED
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[var(--agy-text-primary)] font-medium">{act.summary}</p>

                      <pre className="text-[10px] font-mono text-[var(--agy-text-secondary)] bg-[var(--agy-surface)] p-2.5 rounded-lg border border-[var(--agy-border)] overflow-x-auto">
                        {JSON.stringify(act.payload, null, 2)}
                      </pre>

                      {act.executionReceipt && (
                        <div className="text-[11px] font-mono text-[#34a853]">
                          Receipt: {act.executionReceipt}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
