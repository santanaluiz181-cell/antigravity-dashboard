import React, { useEffect, useState } from 'react';
import {
  Activity,
  ExternalLink,
  Eye,
  FileCode2,
  Radio,
  Terminal,
  Cpu,
} from 'lucide-react';
import { FALLBACK_STEPS } from '../data/staticShowcaseData';

export interface SessionSummaryDto {
  conversationId: string;
  transcriptPath: string;
  updatedAt: string;
  sizeBytes: number;
  stepCount: number;
  lastUserPrompt: string;
  subagentsInvoked: number;
  toolCallsCount: number;
  artifacts: { name: string; fullPath: string; type: 'html' | 'md' }[];
}

export interface TranscriptStepDto {
  stepIndex: number;
  source: string;
  type: string;
  status: string;
  createdAt: string;
  contentPreview: string;
  toolCalls: { name: string; summary: string }[];
  hasTruncatedFields: boolean;
}

export interface KitsuneStatusDto {
  reachable: boolean;
  endpoint: string;
  activeProfile: string;
  activeProvider: string;
  latencyMs: number;
  notchReachable: boolean;
  claudeMemReachable?: boolean;
  graphifyNodes?: number;
  graphifyEdges?: number;
  cartographerSavingsPct?: number;
  billionContextReady?: boolean;
}

interface Module2Props {
  sessions: SessionSummaryDto[];
  kitsune: KitsuneStatusDto | null;
  globalArtifacts: { name: string; fullPath: string; updatedAt: string }[];
  searchQuery: string;
  embedded?: boolean;
}

export const Module2LiveSessions: React.FC<Module2Props> = ({
  sessions,
  kitsune,
  globalArtifacts,
  searchQuery,
  embedded = false,
}) => {
  const [selectedConvId, setSelectedConvId] = useState<string>(sessions[0]?.conversationId || '');
  const [steps, setSteps] = useState<TranscriptStepDto[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [selectedArtifactPath, setSelectedArtifactPath] = useState<string>(
    globalArtifacts[0]?.fullPath || ''
  );

  useEffect(() => {
    if (!selectedConvId && sessions.length > 0) {
      setSelectedConvId(sessions[0].conversationId);
    }
  }, [sessions, selectedConvId]);

  useEffect(() => {
    if (!selectedConvId) return;
    setLoadingSteps(true);
    fetch(`/api/sessions/${encodeURIComponent(selectedConvId)}/transcript`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('Non-JSON response');
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data.steps) && data.steps.length > 0) {
          setSteps(data.steps);
        } else {
          setSteps(
            FALLBACK_STEPS[selectedConvId] ||
              FALLBACK_STEPS['f2d1700e-0ef0-4436-9cc2-0c91848d09b7'] ||
              []
          );
        }
      })
      .catch(() => {
        setSteps(
          FALLBACK_STEPS[selectedConvId] ||
            FALLBACK_STEPS['f2d1700e-0ef0-4436-9cc2-0c91848d09b7'] ||
            []
        );
      })
      .finally(() => setLoadingSteps(false));
  }, [selectedConvId]);

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.conversationId.toLowerCase().includes(q) ||
      s.lastUserPrompt.toLowerCase().includes(q)
    );
  });

  return (
    <div className={`space-y-4 ${embedded ? 'pb-4' : 'pb-24'}`}>
      {/* Top Kitsune Router :4319 + claude-mem :37777 + Graphify + Remote Bridge Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <div className="onyx-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--agy-text-secondary)] font-medium">Kitsune Router Bridge</span>
            <Radio
              className={`w-4 h-4 ${
                kitsune?.reachable ? 'text-[#34a853]' : 'text-[var(--agy-text-muted)]'
              }`}
            />
          </div>
          <div className="text-sm font-semibold font-mono text-[var(--agy-text-primary)] mt-1.5">
            {kitsune?.endpoint || 'http://127.0.0.1:4319'}
          </div>
          <div className="text-[11px] text-[var(--agy-text-secondary)] mt-1 flex items-center justify-between">
            <span>Profile: {kitsune?.activeProfile || 'Gemini 4 Argon (Default)'}</span>
            <span className="font-mono text-[var(--agy-accent)]">{kitsune?.latencyMs ?? 0}ms</span>
          </div>
        </div>

        <div className="onyx-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--agy-text-secondary)] font-medium">claude-mem (:37777) &amp; Corpus</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#34a853]/15 text-[#34a853] border border-[#34a853]/30">
              {kitsune?.claudeMemReachable !== false ? 'ONLINE · HTTP 200' : 'OFFLINE'}
            </span>
          </div>
          <div className="text-sm font-semibold font-mono text-[var(--agy-text-primary)] mt-1.5">
            http://127.0.0.1:37777
          </div>
          <div className="text-[11px] text-[var(--agy-text-secondary)] mt-1">
            Corpus: <code className="text-[var(--agy-accent)]">antigravity-dashboard-corpus</code>
          </div>
        </div>

        <div className="onyx-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--agy-text-secondary)] font-medium">Graphify AST + Billion-Context</span>
            <Cpu className="w-4 h-4 text-[var(--agy-accent)]" />
          </div>
          <div className="text-sm font-semibold font-mono text-[#34a853] mt-1.5">
            -{kitsune?.cartographerSavingsPct ?? 98.4}% Token Footprint
          </div>
          <div className="text-[11px] font-mono text-[var(--agy-text-secondary)] mt-1">
            .graphify.json: {kitsune?.graphifyNodes ?? 25} files · {kitsune?.graphifyEdges ?? 51} AST edges
          </div>
        </div>

        <div className="onyx-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--agy-text-secondary)] font-medium">Antigravity Remote &amp; Notch</span>
            <ExternalLink className="w-4 h-4 text-[var(--agy-accent)]" />
          </div>
          <div className="flex items-center justify-between gap-2 mt-2">
            <a
              href="https://antigravity.google/remote"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[var(--agy-surface-elevated)] hover:border-[#3279f9] border border-[var(--agy-border)] text-xs font-medium text-[var(--agy-text-primary)] flex items-center gap-1.5"
            >
              <span>antigravity.google/remote</span>
              <ExternalLink className="w-3.5 h-3.5 text-[var(--agy-accent)]" />
            </a>
            <span className="text-[10px] font-mono text-[var(--agy-text-secondary)]">
              Notch :49211
            </span>
          </div>
        </div>
      </div>

      {/* Main Split: Left Brain Sessions List | Center Transcript Timeline | Right Generative UI Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 4 cols: Brain Sessions */}
        <div className="onyx-card p-4 lg:col-span-4 flex flex-col max-h-[540px]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--agy-text-secondary)] mb-3 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[var(--agy-accent)]" />
            Brain Trajectories (~/.gemini/antigravity/brain)
          </h3>
          <div className="space-y-2 overflow-y-auto pr-1">
            {filteredSessions.map((sess) => {
              const isSelected = sess.conversationId === selectedConvId;
              return (
                <button
                  key={sess.conversationId}
                  type="button"
                  onClick={() => setSelectedConvId(sess.conversationId)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    isSelected
                      ? 'bg-[var(--agy-surface-elevated)] border-[#3279f9]'
                      : 'bg-[var(--agy-canvas)] border-[var(--agy-border)] hover:border-[#3279f9]/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--agy-accent)]">
                    <span>{sess.conversationId.slice(0, 13)}...</span>
                    <span className="text-[var(--agy-text-muted)]">
                      {new Date(sess.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--agy-text-primary)] mt-1 line-clamp-2 font-medium">
                    {sess.lastUserPrompt}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-[var(--agy-text-secondary)]">
                    <span>{sess.stepCount} steps</span>
                    <span>{sess.toolCallsCount} tools</span>
                    <span>{sess.subagentsInvoked} subagents</span>
                    <span>{(sess.sizeBytes / 1024).toFixed(1)} KB</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center 5 cols: Live transcript.jsonl Inspector */}
        <div className="onyx-card p-4 lg:col-span-5 flex flex-col max-h-[540px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--agy-text-secondary)] flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[var(--agy-accent)]" />
              transcript.jsonl Step Stream ({steps.length})
            </h3>
            <span className="text-[11px] font-mono text-[var(--agy-text-muted)]">{selectedConvId.slice(0, 8)}</span>
          </div>

          {loadingSteps ? (
            <div className="text-xs text-[var(--agy-text-secondary)] py-12 text-center">Reading transcript.jsonl...</div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto pr-1">
              {steps.map((st, i) => (
                <div
                  key={`${st.stepIndex}_${i}`}
                  className="bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-xl p-3 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-[var(--agy-text-secondary)]">
                    <span className="px-1.5 py-0.5 rounded bg-[var(--agy-surface)] text-[var(--agy-accent)]">
                      #{st.stepIndex} · {st.type}
                    </span>
                    <span>{st.source}</span>
                  </div>
                  {st.contentPreview && (
                    <p className="text-[var(--agy-text-primary)] mt-1.5 text-xs whitespace-pre-wrap break-words leading-relaxed">
                      {st.contentPreview}
                    </p>
                  )}
                  {st.toolCalls.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[var(--agy-border-subtle)] flex flex-wrap gap-1.5">
                      {st.toolCalls.map((tc, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-[var(--agy-surface)] border border-[var(--agy-border)] font-mono text-[10px] text-[#34a853]"
                        >
                          {tc.name}({tc.summary})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 3 cols: /generative_ui HTML Artifact Previewer */}
        <div className="onyx-card p-4 lg:col-span-3 flex flex-col max-h-[540px]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--agy-text-secondary)] mb-3 flex items-center gap-2">
            <FileCode2 className="w-3.5 h-3.5 text-[var(--agy-accent)]" />
            /generative_ui Artifacts ({globalArtifacts.length})
          </h3>
          {globalArtifacts.length === 0 ? (
            <div className="text-xs text-[var(--agy-text-secondary)] bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-xl p-4 leading-relaxed">
              Local <code className="text-[var(--agy-accent)]">.html</code> widgets from{' '}
              <code className="text-[var(--agy-text-primary)]">~/.gemini/antigravity/html_artifacts</code> render inside this sandbox when the local Hono daemon (:4320) is attached.
            </div>
          ) : (
            <>
              <select
                value={selectedArtifactPath}
                onChange={(e) => setSelectedArtifactPath(e.target.value)}
                className="w-full bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--agy-text-primary)] mb-3"
              >
                {globalArtifacts.map((art) => (
                  <option key={art.fullPath} value={art.fullPath}>
                    {art.name}
                  </option>
                ))}
              </select>
              {selectedArtifactPath && (
                <div className="flex-1 bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-xl overflow-hidden flex flex-col">
                  <div className="px-2.5 py-1.5 border-b border-[var(--agy-border)] flex items-center justify-between text-[10px] font-mono text-[var(--agy-text-secondary)]">
                    <span className="truncate max-w-[160px]">{selectedArtifactPath}</span>
                    <a
                      href={`/api/sessions/artifact-preview?path=${encodeURIComponent(selectedArtifactPath)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--agy-accent)] flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Open
                    </a>
                  </div>
                  <iframe
                    title="Generative UI Artifact Sandbox"
                    sandbox="allow-scripts"
                    src={`/api/sessions/artifact-preview?path=${encodeURIComponent(selectedArtifactPath)}`}
                    className="w-full flex-1 min-h-[300px] bg-[var(--agy-canvas)]"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
