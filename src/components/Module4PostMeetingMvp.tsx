import React, { useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  FileAudio,
  Lock,
  Mic,
  Play,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { extractMeetingClientSide } from '../data/staticShowcaseData';

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
  const [title, setTitle] = useState('Gabinete / Architecture Sync');
  const [transcriptInput, setTranscriptInput] = useState(
    'Decidimos ativar o preset Coding Lean para remover skills duplicadas em ~/.gemini/config/skills e liberar o orçamento de contexto. Tarefa 1: Salvar decisão arquitetural no @claude-mem. Tarefa 2: Registrar log de auditoria no SQLite.'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>(meetings[0]?.meetingId || '');

  const activeMeeting =
    meetings.find((m) => m.meetingId === selectedMeetingId) || meetings[0] || null;

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

  return (
    <div className={`space-y-4 ${embedded ? 'pb-4' : 'pb-24'}`}>
      {/* Top GPU ASR Pipeline Telemetry Banner */}
      <div className="onyx-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--agy-canvas)] border border-[var(--agy-border)] text-[var(--agy-accent)]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[var(--agy-text-primary)]">
                Post-Meeting Executor MVP (Zero Fragile WebRTC Meet Bot)
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#34a853]/15 text-[#34a853] border border-[#34a853]/30">
                {gpuAsrAvailable ? 'GPU ASR READY (ggml_vulkan)' : 'LOCAL PIPELINE'}
              </span>
            </div>
            <p className="text-xs text-[var(--agy-text-secondary)] font-mono mt-0.5">
              ASR Route: {gpuAsrPath} · Mandatory Human Click Gate before any Antigravity MCP dispatch
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Ingest & Transcript (5 cols) | Right Extracted Decisions & Human Approval Gate (7 cols) */}
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

          {/* Past Meetings Selector */}
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

            {/* Decisions & Executive Summary */}
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

            {/* Staged Antigravity MCP Actions (Requires Explicit Human Click) */}
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
    </div>
  );
};
