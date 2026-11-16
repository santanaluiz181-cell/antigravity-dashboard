import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileWarning,
  FolderGit2,
  Layers,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export interface ScannedItemDto {
  id: string;
  name: string;
  category: string;
  sourcePath: string;
  charCount: number;
  lineCount: number;
  estimatedTokens: number;
  descriptionTokens: number;
  isBloated: boolean;
  bloatReasons: string[];
  isDuplicate: boolean;
  duplicateOf?: string;
  enabled: boolean;
  description: string;
}

export interface BloatScanReportDto {
  scannedAt: string;
  totalItems: number;
  activeItems: number;
  totalFullLoadTokens: number;
  totalSystemPromptIndexTokens: number;
  contextBudgetLimitTokens: number;
  budgetUtilizationPct: number;
  evictionRiskWarning: boolean;
  duplicateSkillsCount: number;
  bloatedPromptsCount: number;
  breakdownByCategory: Record<string, { count: number; tokens: number; indexTokens: number }>;
  items: ScannedItemDto[];
}

export interface ProfilePresetDto {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  estimatedSavedIndexTokens: number;
  enabledMcpServers: string[];
}

interface Module1Props {
  report: BloatScanReportDto | null;
  presets: ProfilePresetDto[];
  activePresetId: string;
  quarantineLedger: { skillName: string; originalPath: string; quarantinePath: string; movedAt: string; reason: string }[];
  searchQuery: string;
  onApplyPreset: (presetId: string) => void;
  isApplying: boolean;
  lastApplyFeedback: string | null;
  embedded?: boolean;
}

export const Module1BloatCenter: React.FC<Module1Props> = ({
  report,
  presets,
  activePresetId,
  quarantineLedger,
  searchQuery,
  onApplyPreset,
  isApplying,
  lastApplyFeedback,
  embedded = false,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'duplicates' | 'bloated' | 'mcp' | 'rules'>('all');

  if (!report) {
    return (
      <div className="onyx-card p-8 text-center text-sm text-[var(--agy-text-secondary)]">
        Scanning <code className="text-[var(--agy-text-primary)]">~/.gemini/config</code> and{' '}
        <code className="text-[var(--agy-text-primary)]">~/.gemini/antigravity</code> footprint...
      </div>
    );
  }

  const filteredItems = report.items.filter((item) => {
    if (filterMode === 'duplicates' && !item.isDuplicate) return false;
    if (filterMode === 'bloated' && !item.isBloated) return false;
    if (filterMode === 'mcp' && item.category !== 'mcp-server') return false;
    if (filterMode === 'rules' && item.category !== 'rule') return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.sourcePath.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });

  const categoryLabels: Record<string, string> = {
    'rule': 'Always-On Rules (GEMINI.md / AGENTS.md)',
    'skill-global': 'Global Skills (~/.gemini/config/skills)',
    'skill-plugin-tjto': 'Plugin: SuperAntigravityTJTO',
    'skill-plugin-science': 'Plugin: Science / Bioinformatics',
    'skill-builtin': 'Builtin Antigravity Skills',
    'mcp-server': 'MCP Servers (mcp_config.json)',
    'skill-plugin-other': 'Other Installed Plugins',
  };

  return (
    <div className={`space-y-5 ${embedded ? 'pb-4' : 'pb-24'}`}>
      {/* Top Diagnostic Banner if Eviction Risk Detected */}
      {report.evictionRiskWarning && (
        <div className="onyx-card border-[#fbbc04]/40 bg-[#fbbc04]/5 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#fbbc04] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-[var(--agy-text-primary)]">
                Context Budget Overflow Detected ({report.duplicateSkillsCount} Duplicate Skills + Science Footprint)
              </h2>
              <p className="text-xs text-[var(--agy-text-secondary)] mt-0.5">
                Identical skills exist in both <code className="text-[var(--agy-text-primary)]">~/.gemini/config/skills</code> and{' '}
                <code className="text-[var(--agy-text-primary)]">plugins/super-antigravity-tjto/skills</code>. This causes Antigravity to evict{' '}
                <code className="text-[#fbbc04]">browser</code>, <code className="text-[#fbbc04]">research</code>,{' '}
                <code className="text-[#fbbc04]">super-render</code>, and <code className="text-[#fbbc04]">ultimate-research</code> from the active session.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onApplyPreset('coding-lean')}
            disabled={isApplying}
            className="shrink-0 px-4 py-2 rounded-full bg-[#3279f9] text-white font-semibold text-xs hover:opacity-95 transition-opacity"
          >
            {isApplying ? 'Applying Atomic Preset...' : 'Fix Now: Apply "Coding Lean"'}
          </button>
        </div>
      )}

      {lastApplyFeedback && (
        <div className="onyx-card border-[#34a853]/40 bg-[#34a853]/10 px-4 py-2.5 flex items-center justify-between text-xs text-[#34a853]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{lastApplyFeedback}</span>
          </div>
          <span className="font-mono text-[11px] text-[var(--agy-text-secondary)]">SHA-256 Verified Backup</span>
        </div>
      )}

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="onyx-card p-4">
          <div className="text-xs text-[var(--agy-text-secondary)] flex items-center justify-between">
            <span>System Prompt Index Footprint</span>
            <Layers className="w-4 h-4 text-[var(--agy-accent)]" />
          </div>
          <div className="text-2xl font-semibold mt-1.5 font-mono text-[var(--agy-text-primary)]">
            {report.totalSystemPromptIndexTokens.toLocaleString()}{' '}
            <span className="text-xs font-normal text-[var(--agy-text-muted)]">tokens</span>
          </div>
          <div className="text-[11px] text-[var(--agy-text-secondary)] mt-1">
            Injected on every turn across {report.activeItems} active items
          </div>
        </div>

        <div className="onyx-card p-4">
          <div className="text-xs text-[var(--agy-text-secondary)] flex items-center justify-between">
            <span>Full On-Demand Skill Load</span>
            <FolderGit2 className="w-4 h-4 text-[var(--agy-text-secondary)]" />
          </div>
          <div className="text-2xl font-semibold mt-1.5 font-mono text-[var(--agy-text-primary)]">
            {report.totalFullLoadTokens.toLocaleString()}{' '}
            <span className="text-xs font-normal text-[var(--agy-text-muted)]">tokens</span>
          </div>
          <div className="text-[11px] text-[var(--agy-text-secondary)] mt-1">
            Total <code className="text-[var(--agy-text-primary)]">SKILL.md</code> + rules + MCP schemas
          </div>
        </div>

        <div className="onyx-card p-4">
          <div className="text-xs text-[var(--agy-text-secondary)] flex items-center justify-between">
            <span>Redundant Skill Collisions</span>
            <Copy className="w-4 h-4 text-[#fbbc04]" />
          </div>
          <div className="text-2xl font-semibold mt-1.5 font-mono text-[#fbbc04]">
            {report.duplicateSkillsCount}
          </div>
          <div className="text-[11px] text-[var(--agy-text-secondary)] mt-1">
            Global vs Plugin double-registrations
          </div>
        </div>

        <div className="onyx-card p-4">
          <div className="text-xs text-[var(--agy-text-secondary)] flex items-center justify-between">
            <span>Bloated Prompts (&gt;250 Lines)</span>
            <FileWarning className="w-4 h-4 text-[#ea4335]" />
          </div>
          <div className="text-2xl font-semibold mt-1.5 font-mono text-[#ea4335]">
            {report.bloatedPromptsCount}
          </div>
          <div className="text-[11px] text-[var(--agy-text-secondary)] mt-1">
            Candidates for Caveman / Harness compression
          </div>
        </div>
      </div>

      {/* 1-Click Profile Presets Row */}
      <div className="onyx-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--agy-text-primary)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--agy-accent)]" />
              1-Click Context &amp; MCP Profile Presets
            </h3>
            <p className="text-xs text-[var(--agy-text-secondary)]">
              Atomically snapshots <code className="text-[var(--agy-text-primary)]">mcp_config.json</code> and parks redundant skills in{' '}
              <code className="text-[var(--agy-text-primary)]">backups/quarantine_skills</code>. Zero binary modification.
            </p>
          </div>
          <span className="text-xs font-mono text-[var(--agy-text-secondary)]">
            Quarantined Skills: <strong className="text-[var(--agy-text-primary)]">{quarantineLedger.length}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {presets.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <div
                key={preset.id}
                className={`onyx-card-interactive p-3.5 flex flex-col justify-between ${
                  isSelected ? 'border-[#3279f9] bg-[var(--agy-surface-elevated)]' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--agy-text-primary)]">{preset.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--agy-canvas)] border border-[var(--agy-border)] text-[var(--agy-accent)]">
                      {preset.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--agy-text-secondary)] mt-2 leading-relaxed">{preset.tagline}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[var(--agy-border)] flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-[var(--agy-text-muted)] truncate">
                    MCPs: {preset.enabledMcpServers.join(', ')}
                  </span>
                  <button
                    type="button"
                    onClick={() => onApplyPreset(preset.id)}
                    disabled={isApplying}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                      isSelected
                        ? 'bg-[#3279f9] text-white'
                        : 'bg-[var(--agy-canvas)] border border-[var(--agy-border)] text-[var(--agy-text-primary)] hover:border-[#3279f9]'
                    }`}
                  >
                    {isSelected ? 'Active' : 'Activate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Footprint Breakdown + Detailed Inspector Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Category Breakdown */}
        <div className="onyx-card p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--agy-text-secondary)]">
            Token Footprint By Source Layer
          </h3>
          <div className="space-y-2.5">
            {Object.entries(report.breakdownByCategory).map(([cat, stats]) => {
              const pct = Math.min(
                100,
                Math.round((stats.indexTokens / Math.max(1, report.totalSystemPromptIndexTokens)) * 100)
              );
              return (
                <div key={cat} className="bg-[var(--agy-canvas)] border border-[var(--agy-border)] rounded-xl p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--agy-text-primary)]">
                      {categoryLabels[cat] || cat}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--agy-text-secondary)]">
                      {stats.count} items · {stats.indexTokens.toLocaleString()} idx tok
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--agy-surface)] rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-[#3279f9]"
                      style={{ width: `${Math.max(3, pct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-[var(--agy-text-muted)] mt-1">
                    <span>Index Share: {pct}%</span>
                    <span>Full Body: {stats.tokens.toLocaleString()} tok</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Cols: Skill, Rule & MCP Inspector Table */}
        <div className="onyx-card p-4 lg:col-span-2 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--agy-text-secondary)]">
              Audited Skills, Rules &amp; MCP Servers ({filteredItems.length})
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: `All (${report.items.length})` },
                  { id: 'duplicates', label: `Duplicates (${report.duplicateSkillsCount})` },
                  { id: 'bloated', label: `Bloated >250L (${report.bloatedPromptsCount})` },
                  { id: 'mcp', label: 'MCP Servers' },
                  { id: 'rules', label: 'Rules' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-mono ${
                    filterMode === tab.id
                      ? 'bg-[#3279f9] text-white'
                      : 'bg-[var(--agy-canvas)] text-[var(--agy-text-secondary)] border border-[var(--agy-border)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-[var(--agy-border)] rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[var(--agy-canvas)] text-[var(--agy-text-secondary)] font-mono text-[11px] sticky top-0 z-10 border-b border-[var(--agy-border)]">
                <tr>
                  <th className="py-2.5 px-3">Name &amp; Diagnostics</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Lines</th>
                  <th className="py-2.5 px-3 text-right">Index Tok</th>
                  <th className="py-2.5 px-3 text-right">Full Tok</th>
                  <th className="py-2.5 px-3">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--agy-border)]">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--agy-surface-elevated)] transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-[var(--agy-text-primary)] flex items-center gap-1.5">
                        <span>{item.name}</span>
                        {item.isDuplicate && (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[#fbbc04]/15 text-[#fbbc04] border border-[#fbbc04]/30">
                            DUPLICATE
                          </span>
                        )}
                        {item.lineCount > 250 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[#ea4335]/15 text-[#ea4335] border border-[#ea4335]/30">
                            &gt;250L
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-[var(--agy-text-muted)] truncate max-w-[380px]">
                        {item.sourcePath}
                      </div>
                      {item.bloatReasons.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.bloatReasons.map((reason, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 text-[10px] text-[#fbbc04]"
                            >
                              <ShieldAlert className="w-3 h-3" />
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--agy-text-secondary)]">
                      {item.category}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono ${
                        item.lineCount > 250 ? 'text-[#ea4335] font-semibold' : 'text-[var(--agy-text-secondary)]'
                      }`}
                    >
                      {item.lineCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[var(--agy-accent)]">
                      {item.descriptionTokens.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[var(--agy-text-primary)]">
                      {item.estimatedTokens.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      {item.enabled ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#34a853]/15 text-[#34a853]">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[var(--agy-canvas)] border border-[var(--agy-border)] text-[var(--agy-text-secondary)]">
                          PARKED
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
