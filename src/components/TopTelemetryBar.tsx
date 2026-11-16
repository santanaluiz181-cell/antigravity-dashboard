import React from 'react';
import { AntigravityLogo } from './AntigravityLogo';

export type UiLang = 'en' | 'zh' | 'pt';
export type ViewMode = 'editorial' | 'workbench';

interface TopTelemetryBarProps {
  indexTokens: number;
  budgetLimit: number;
  utilizationPct: number;
  duplicateCount: number;
  activePresetId: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  lang: UiLang;
  onChangeLang: (lang: UiLang) => void;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const TopTelemetryBar: React.FC<TopTelemetryBarProps> = ({
  indexTokens,
  budgetLimit,
  utilizationPct,
  duplicateCount,
  activePresetId,
  theme,
  onToggleTheme,
  lang,
  onChangeLang,
  viewMode,
  onChangeViewMode,
  onRefresh,
  isLoading,
}) => {
  const isOverBudget = utilizationPct >= 80 || duplicateCount > 0;

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md border-b border-[var(--agy-border)] bg-[var(--agy-canvas)]/92">
      <div className="agy-nav-progress" />
      <div className="max-w-[1440px] mx-auto px-5 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left Brand + Vectorized Easel Logo */}
        <div className="flex items-center gap-3">
          <AntigravityLogo className="w-8 h-8 shrink-0 rounded-lg" />
          <div className="flex items-center gap-2.5">
            <span className="text-[15px] font-semibold tracking-tight text-[var(--agy-text-primary)]">
              Antigravity
            </span>
            <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--agy-surface)] border border-[var(--agy-border)] text-[var(--agy-text-secondary)]">
              Dashboards &amp; Motion
            </span>
            <span
              title="Zero binary modification: agy.exe and official IDE binaries are untouched (ToS Section 6 Compliant)"
              className="hidden lg:inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#34a853]/10 border border-[#34a853]/30 text-[#34a853]"
            >
              <span className="google-symbol !text-[14px]" aria-hidden="true">
                verified_user
              </span>
              ToS Sec 6 Safe
            </span>
          </div>
        </div>

        {/* Center View Mode Switcher + Context Budget Meter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center p-0.5 rounded-full bg-[var(--agy-surface)] border border-[var(--agy-border)] text-[11px] font-mono">
            <button
              type="button"
              onClick={() => onChangeViewMode('editorial')}
              className={`px-3 py-1 rounded-full transition-colors ${
                viewMode === 'editorial'
                  ? 'bg-[#3279f9] text-white'
                  : 'text-[var(--agy-text-secondary)] hover:text-[var(--agy-text-primary)]'
              }`}
            >
              Article &amp; Live Demos
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode('workbench')}
              className={`px-3 py-1 rounded-full transition-colors ${
                viewMode === 'workbench'
                  ? 'bg-[#3279f9] text-white'
                  : 'text-[var(--agy-text-secondary)] hover:text-[var(--agy-text-primary)]'
              }`}
            >
              Focused Workbench
            </button>
          </div>

          <div className="hidden xl:flex items-center gap-3 onyx-pill px-3.5 py-1 text-[11px]">
            <span className="text-[var(--agy-text-secondary)] font-medium">Budget</span>
            <div className="w-24 h-1.5 bg-[var(--agy-canvas)] rounded-full overflow-hidden border border-[var(--agy-border)]">
              <div
                className={`h-full transition-all duration-300 ${
                  isOverBudget ? 'bg-[#fbbc04]' : 'bg-[#3279f9]'
                }`}
                style={{ width: `${Math.min(100, utilizationPct)}%` }}
              />
            </div>
            <span className="font-mono text-[var(--agy-text-primary)]">
              {indexTokens.toLocaleString()}/{budgetLimit.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Right Language Switcher (EN | 中文 | PT) + Theme + GitHub + Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-full bg-[var(--agy-surface)] border border-[var(--agy-border)] text-[11px] font-mono">
            {(
              [
                { id: 'en', label: 'EN' },
                { id: 'zh', label: '中文' },
                { id: 'pt', label: 'PT' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeLang(item.id)}
                className={`px-2 py-0.5 rounded-full transition-colors ${
                  lang === item.id
                    ? 'bg-[var(--agy-surface-elevated)] text-[var(--agy-accent)] font-semibold'
                    : 'text-[var(--agy-text-secondary)] hover:text-[var(--agy-text-primary)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <span className="onyx-pill px-2.5 py-1 hidden md:inline-flex items-center text-[11px] font-mono text-[var(--agy-accent)]">
            {activePresetId}
          </span>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="onyx-pill px-2.5 py-1 text-xs text-[var(--agy-text-primary)] flex items-center gap-1 hover:border-[#3279f9]"
          >
            <span className="google-symbol !text-[15px]" aria-hidden="true">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
            <span className="font-mono text-[10px] uppercase hidden sm:inline">{theme}</span>
          </button>

          <a
            href="https://github.com/santanaluiz181-cell/antigravity-dashboard"
            target="_blank"
            rel="noreferrer"
            className="onyx-pill px-3 py-1 text-xs text-[var(--agy-text-primary)] flex items-center gap-1 hover:border-[#3279f9]"
          >
            <span>GitHub</span>
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
              className={`google-symbol !text-[17px] ${isLoading ? 'animate-spin text-[#3279f9]' : ''}`}
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
