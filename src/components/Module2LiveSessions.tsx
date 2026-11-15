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
}

export const Module2LiveSessions: React.FC<Module2Props> = ({
  sessions,
  kitsune,
  globalArtifacts,
  searchQuery,
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
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.steps)) {
          setSteps(data.steps);
        }
      })
      .catch(() => {})
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
    <div className="space-y-4 pb-24">
      {/* Top Kitsune Router :4319 + claude-mem :37777 + Graphify + Remote Bridge Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <div className="onyx-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9BA3B0] font-medium">Kitsune Router Bridge</span>
            <Radio
              className={`w-4 h-4 ${
                kitsune?.reachable ? 'text-[#81C995]' : 'text-[#9BA3B0]'
              }`}
            />
          </div>
          <div className="text-sm font-semibold font-mono text-[#E6EAF0] mt-1.5">
            {kitsune?.endpoint || 'http://127.0.0.1:4319'}
          </div>
          <div className="text-[11px] text-[#9BA3B0] mt-1 flex items-center justify-between">
            <span>Profile: {kitsune?.activeProfile || 'Gemini 4 Argon (Default)'}</span>
            <span className="font-mono text-[#8AB4F8]">{kitsune?.latencyMs ?? 0}ms</span>
          </div>
        </div>

        <div className="onyx-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9BA3B0] font-medium">claude-mem (:37777) &amp; Corpus</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#81C995]/15 text-[#81C995] border border-[#81C995]/30">
              {kitsune?.claudeMemReachable !== false ? 'ONLINE · HTTP 200' : 'OFFLINE'}
            </span>
          </div>
          <div className="text-sm font-semibold font-mono text-[#E6EAF0] mt-1.5">
            http://127.0.0.1:37777
          </div>
          <div className="text-[11px] text-[#9BA3B0] mt-1">
            Corpus: <code className="text-[#8AB4F8]">antigravity-dashboard-corpus</code>
          </div>
        </div>

        <div className="onyx-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9BA3B0] font-medium">Graphify AST + Billion-Context</span>
            <Cpu className="w-4 h-4 text-[#8AB4F8]" />
          </div>
          <div className="text-sm font-semibold font-mono text-[#81C995] mt-1.5">
            -{kitsune?.cartographerSavingsPct ?? 98.3}% Token Footprint
          </div>
          <div className="text-[11px] font-mono text-[#9BA3B0] mt-1">
            .graphify.json: {kitsune?.graphifyNodes ?? 20} files · {kitsune?.graphifyEdges ?? 48} AST edges
          </div>
        </div>

        <div className="onyx-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9BA3B0] font-medium">Antigravity Remote &amp; Notch</span>
            <ExternalLink className="w-4 h-4 text-[#8AB4F8]" />
          </div>
          <div className="flex items-center justify-between gap-2 mt-2">
            <a
              href="https://antigravity.google/remote"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#1F2531] hover:bg-[#283040] text-xs font-medium text-[#E6EAF0] flex items-center gap-1.5"
            >
              <span>antigravity.google/remote</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#8AB4F8]" />
            </a>
            <span className="text-[10px] font-mono text-[#9BA3B0]">
              Notch :49211
            </span>
          </div>
        </div>
      </div>

      {/* Main Split: Left Brain Sessions List | Center Transcript Timeline | Right Generative UI Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 4 cols: Brain Sessions */}
        <div className="onyx-card p-4 lg:col-span-4 flex flex-col max-h-[580px]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9BA3B0] mb-3 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#8AB4F8]" />
            Brain Trajectories (~/.gemini/antigravity/brain)
          </h3>
          <div className="space-y-2 overflow-y-auto pr-1">
            {filteredSessions.map((sess) => {
              const isSelected = sess.conversationId === selectedConvId;
              return (
                <button
                  key={sess.conversationId}
                  onClick={() => setSelectedConvId(sess.conversationId)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#181E29] border-[#8AB4F8]'
                      : 'bg-[#0B0D10] border-[#232832] hover:border-[#343C4A]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8AB4F8]">
                    <span>{sess.conversationId.slice(0, 13)}...</span>
                    <span className="text-[#646D7A]">
                      {new Date(sess.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-[#E6EAF0] mt-1 line-clamp-2 font-medium">
                    {sess.lastUserPrompt}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-[#9BA3B0]">
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
        <div className="onyx-card p-4 lg:col-span-5 flex flex-col max-h-[580px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9BA3B0] flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#8AB4F8]" />
              transcript.jsonl Step Stream ({steps.length})
            </h3>
            <span className="text-[11px] font-mono text-[#646D7A]">{selectedConvId.slice(0, 8)}</span>
          </div>

          {loadingSteps ? (
            <div className="text-xs text-[#9BA3B0] py-12 text-center">Reading transcript.jsonl...</div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto pr-1">
              {steps.map((st, i) => (
                <div
                  key={`${st.stepIndex}_${i}`}
                  className="bg-[#0B0D10] border border-[#232832] rounded-lg p-3 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#9BA3B0]">
                    <span className="px-1.5 py-0.5 rounded bg-[#13161B] text-[#8AB4F8]">
                      #{st.stepIndex} · {st.type}
                    </span>
                    <span>{st.source}</span>
                  </div>
                  {st.contentPreview && (
                    <p className="text-[#E6EAF0] mt-1.5 text-xs whitespace-pre-wrap break-words leading-relaxed">
                      {st.contentPreview}
                    </p>
                  )}
                  {st.toolCalls.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[#1B2028] flex flex-wrap gap-1.5">
                      {st.toolCalls.map((tc, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-[#13161B] border border-[#232832] font-mono text-[10px] text-[#81C995]"
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
        <div className="onyx-card p-4 lg:col-span-3 flex flex-col max-h-[580px]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9BA3B0] mb-3 flex items-center gap-2">
            <FileCode2 className="w-3.5 h-3.5 text-[#8AB4F8]" />
            /generative_ui Artifacts ({globalArtifacts.length})
          </h3>
          {globalArtifacts.length === 0 ? (
            <div className="text-xs text-[#646D7A] bg-[#0B0D10] border border-[#232832] rounded-lg p-4">
              No standalone <code className="text-[#9BA3B0]">.html</code> artifacts found in{' '}
              <code className="text-[#9BA3B0]">~/.gemini/antigravity/html_artifacts</code> yet.
            </div>
          ) : (
            <>
              <select
                value={selectedArtifactPath}
                onChange={(e) => setSelectedArtifactPath(e.target.value)}
                className="w-full bg-[#0B0D10] border border-[#232832] rounded-lg px-2.5 py-1.5 text-xs text-[#E6EAF0] mb-3"
              >
                {globalArtifacts.map((art) => (
                  <option key={art.fullPath} value={art.fullPath}>
                    {art.name}
                  </option>
                ))}
              </select>
              {selectedArtifactPath && (
                <div className="flex-1 bg-[#0B0D10] border border-[#232832] rounded-lg overflow-hidden flex flex-col">
                  <div className="px-2.5 py-1.5 border-b border-[#232832] flex items-center justify-between text-[10px] font-mono text-[#9BA3B0]">
                    <span className="truncate max-w-[160px]">{selectedArtifactPath}</span>
                    <a
                      href={`/api/sessions/artifact-preview?path=${encodeURIComponent(selectedArtifactPath)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#8AB4F8] flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Open
                    </a>
                  </div>
                  <iframe
                    title="Generative UI Artifact Sandbox"
                    sandbox="allow-scripts"
                    src={`/api/sessions/artifact-preview?path=${encodeURIComponent(selectedArtifactPath)}`}
                    className="w-full flex-1 min-h-[340px] bg-[#0B0D10]"
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
