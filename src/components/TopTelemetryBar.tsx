import React from 'react';
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
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
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
  theme,
  onToggleTheme,
  onRefresh,
  isLoading,
}) => {
  const isOverBudget = utilizationPct >= 80 || duplicateCount > 0;

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md border-b border-[var(--agy-border)] bg-[var(--agy-canvas)]/90">
      <div className="agy-nav-progress" />
      <div className="max-w-[1560px] mx-auto px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left Brand + Vectorized Easel Logo */}
        <div className="flex items-center gap-3">
          <AntigravityLogo className="w-9 h-9 shrink-0 rounded-lg" />
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[15px] font-semibold tracking-tight text-[var(--agy-text-primary)]">
                Google Antigravity
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--agy-surface-elevated)] border border-[var(--agy-border)] text-[var(--agy-text-secondary)]">
                Dashboards &amp; Motion
              </span>
              <span
                title="Zero binary modification: agy.exe and official IDE binaries are untouched (ToS Section 6 Compliant)"
                className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#34a853]/10 border border-[#34a853]/30 text-[#34a853]"
              >
                <span className="google-symbol !text-[14px]" aria-hidden="true">
                  verified_user
                </span>
                ToS Section 6 Safe
              </span>
            </div>
          </div>
        </div>

        {/* Center Context Budget Telemetry Bar */}
        <div className="flex items-center gap-4 onyx-card px-3.5 py-1.5 !rounded-full">
          <div>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-[var(--agy-text-secondary)] font-medium">
                Context Index Budget
              </span>
              <span className="font-mono text-[var(--agy-text-primary)]">
                {indexTokens.toLocaleString()} / {budgetLimit.toLocaleString()} tok ({utilizationPct}%)
              </span>
            </div>
            <div className="w-44 h-1.5 bg-[var(--agy-canvas)] rounded-full overflow-hidden mt-1 border border-[var(--agy-border)]">
              <div
                className={`h-full transition-all duration-300 ${
                  isOverBudget ? 'bg-[#fbbc04]' : 'bg-[#3279f9]'
                }`}
                style={{ width: `${Math.min(100, utilizationPct)}%` }}
              />
            </div>
          </div>

          <div className="h-5 w-[1px] bg-[var(--agy-border)]" />

          <div className="flex items-center gap-2 text-xs">
            {duplicateCount > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fbbc04]/15 border border-[#fbbc04]/40 text-[#fbbc04] font-mono text-[11px]">
                <span className="google-symbol !text-[14px]" aria-hidden="true">
                  warning
                </span>
                {duplicateCount} Duplicates
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#34a853]/15 border border-[#34a853]/40 text-[#34a853] font-mono text-[11px]">
                0 Collisions
              </span>
            )}
            <span className="text-[11px] font-mono text-[var(--agy-text-secondary)] hidden lg:inline">
              {bloatedCount} &gt;250L
            </span>
          </div>
        </div>

        {/* Right Kitsune Pill + Theme Toggle + Remote + Refresh */}
        <div className="flex items-center gap-2">
          <div className="onyx-pill px-3 py-1 flex items-center gap-2 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                kitsuneReachable ? 'bg-[#34a853]' : 'bg-[#7e8594]'
              }`}
            />
            <span className="font-mono text-[11px] text-[var(--agy-text-primary)] truncate max-w-[130px]">
              {kitsuneProfile}
            </span>
          </div>

          <div className="onyx-pill px-2.5 py-1 hidden sm:flex items-center gap-1 text-[11px] font-mono text-[var(--agy-accent)]">
            <span>Preset: {activePresetId}</span>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="onyx-pill px-2.5 py-1 text-xs text-[var(--agy-text-primary)] flex items-center gap-1.5 hover:border-[#3279f9]"
          >
            <span className="google-symbol !text-[16px]" aria-hidden="true">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
            <span className="font-mono text-[11px] uppercase">{theme}</span>
          </button>

          <a
            href="https://antigravity.google/remote"
            target="_blank"
            rel="noreferrer"
            className="onyx-pill px-3 py-1 text-xs text-[var(--agy-text-primary)] flex items-center gap-1 hover:border-[#3279f9]"
          >
            <span>Remote</span>
            <span className="google-symbol !text-[14px]" aria-hidden="true">
              open_in_new
            </span>
          </a>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Rescan local Antigravity configuration"
            className="onyx-pill p-1.5 text-[var(--agy-text-secondary)] hover:text-[var(--agy-text-primary)] hover:border-[#3279f9]"
          >
            <span
              className={`google-symbol !text-[18px] ${isLoading ? 'animate-spin text-[#3279f9]' : ''}`}
              aria-hidden="true"
            >
              refresh
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
