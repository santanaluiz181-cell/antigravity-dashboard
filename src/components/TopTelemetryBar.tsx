import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Radio,
  ExternalLink,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { AntigravityLogo } from './AntigravityLogo';

interface TopTelemetryBarProps {
  indexTokens: number;
  budgetLimit: number;
  utilizationPct: number;
  duplicateCount: number;
  bloatedCount: number;
  activePresetId: string;
  kitsuneReachable: boolean;
  kitsuneProfile: string;
  onRefresh: () => void;
  isLoading: boolean;
}

export const TopTelemetryBar: React.FC<TopTelemetryBarProps> = ({
  indexTokens,
  budgetLimit,
  utilizationPct,
  duplicateCount,
  bloatedCount,
  activePresetId,
  kitsuneReachable,
  kitsuneProfile,
  onRefresh,
  isLoading,
}) => {
  const isOverBudget = utilizationPct >= 80 || duplicateCount > 0;

  return (
    <header className="sticky top-0 z-30 bg-[#0B0D10]/95 backdrop-blur-md border-b border-[#232832] px-5 py-2.5">
      <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left Brand + Official Press Slot */}
        <div className="flex items-center gap-3">
          <AntigravityLogo className="w-7 h-7 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-[#E6EAF0]">
                Google Antigravity
              </span>
              <span className="text-[11px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#181C23] border border-[#232832] text-[#9BA3B0]">
                Onyx Studio · Nov 2026
              </span>
              <span
                title="Zero binary modification: agy.exe and official IDE binaries are strictly untouched (ToS Section 6 Compliant)"
                className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#13161B] border border-[#232832] text-[#81C995]"
              >
                <ShieldCheck className="w-3 h-3" />
                ToS Safe (No Binary Patch)
              </span>
            </div>
            <p className="text-[11px] text-[#646D7A] hidden md:block">
              Local Context &amp; Token-Bloat Control · Live Brain Transcripts · SQL Sources Inspector · GPU Meeting Executor
            </p>
          </div>
        </div>

        {/* Center Context Budget Telemetry Bar */}
        <div className="flex items-center gap-4 bg-[#13161B] border border-[#232832] rounded-lg px-3.5 py-1.5">
          <div>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-[#9BA3B0] font-medium">System Index Budget</span>
              <span className="font-mono text-[#E6EAF0]">
                {indexTokens.toLocaleString()} / {budgetLimit.toLocaleString()} tok ({utilizationPct}%)
              </span>
            </div>
            <div className="w-48 h-1.5 bg-[#0B0D10] rounded-full overflow-hidden mt-1 border border-[#232832]">
              <div
                className={`h-full transition-all duration-300 ${
                  isOverBudget ? 'bg-[#F29900]' : 'bg-[#8AB4F8]'
                }`}
                style={{ width: `${Math.min(100, utilizationPct)}%` }}
              />
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[#232832]" />

          <div className="flex items-center gap-2 text-xs">
            {duplicateCount > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F29900]/10 border border-[#F29900]/30 text-[#F29900] font-mono text-[11px]">
                <AlertTriangle className="w-3 h-3" />
                {duplicateCount} Duplicates Evicting Subagents
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#81C995]/10 border border-[#81C995]/30 text-[#81C995] font-mono text-[11px]">
                0 Collisions
              </span>
            )}
            <span className="text-[11px] font-mono text-[#9BA3B0] hidden lg:inline">
              {bloatedCount} Prompts &gt;250L
            </span>
          </div>
        </div>

        {/* Right Kitsune Pill + Remote + Refresh */}
        <div className="flex items-center gap-2">
          <div className="onyx-pill px-2.5 py-1 flex items-center gap-2 text-xs">
            <Radio
              className={`w-3.5 h-3.5 ${
                kitsuneReachable ? 'text-[#81C995]' : 'text-[#9BA3B0]'
              }`}
            />
            <span className="text-[#9BA3B0] hidden xl:inline">Kitsune :4319</span>
            <span className="font-mono text-[11px] text-[#E6EAF0] truncate max-w-[140px]">
              {kitsuneProfile}
            </span>
          </div>

          <div className="onyx-pill px-2.5 py-1 hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-[#8AB4F8]">
            <Cpu className="w-3.5 h-3.5" />
            Preset: {activePresetId}
          </div>

          <a
            href="https://antigravity.google/remote"
            target="_blank"
            rel="noreferrer"
            className="onyx-card-interactive px-2.5 py-1 text-xs text-[#E6EAF0] flex items-center gap-1.5"
            title="Open official antigravity.google/remote"
          >
            <span>Remote</span>
            <ExternalLink className="w-3 h-3 text-[#9BA3B0]" />
          </a>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="onyx-card-interactive p-1.5 text-[#9BA3B0] hover:text-[#E6EAF0] cursor-pointer"
            title="Rescan ~/.gemini and refresh telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#8AB4F8]' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
