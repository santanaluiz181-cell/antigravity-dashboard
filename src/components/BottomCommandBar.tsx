import React from 'react';

export type ActiveTabId = 'bloat' | 'sessions' | 'datasources' | 'meetings';

interface BottomCommandBarProps {
  activeTab: ActiveTabId;
  onSelectTab: (tab: ActiveTabId) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activePresetId: string;
  onQuickApplyPreset: (presetId: string) => void;
  isApplyingPreset: boolean;
}

export const BottomCommandBar: React.FC<BottomCommandBarProps> = ({
  activeTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  activePresetId,
  onQuickApplyPreset,
  isApplyingPreset,
}) => {
  const navItems: { id: ActiveTabId; label: string; symbol: string }[] = [
    {
      id: 'bloat',
      label: '01. Context & Bloat',
      symbol: 'tune',
    },
    {
      id: 'sessions',
      label: '02. Brain & Billion-Context',
      symbol: 'hub',
    },
    {
      id: 'datasources',
      label: '03. Dashboards & Sources',
      symbol: 'database',
    },
    {
      id: 'meetings',
      label: '04. Meeting Executor',
      symbol: 'graphic_eq',
    },
  ];

  return (
    <nav
      aria-label="Workspace Module and Filter Dock"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[96%] max-w-[1380px] bg-[var(--agy-surface)]/95 backdrop-blur-xl border border-[var(--agy-border)] rounded-full px-3.5 py-2 shadow-2xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Module Switcher Pills (Antigravity Slider Control Style) */}
        <div className="flex items-center gap-1 overflow-x-auto bg-[var(--agy-canvas)] p-1 rounded-full border border-[var(--agy-border)]">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#3279f9] text-white'
                    : 'text-[var(--agy-text-secondary)] hover:text-[var(--agy-text-primary)]'
                }`}
              >
                <span className="google-symbol !text-[16px]" aria-hidden="true">
                  {item.symbol}
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Center Command / Filter Input */}
        <div className="relative flex-1 min-w-[200px] max-w-[340px]">
          <span
            className="google-symbol !text-[16px] text-[var(--agy-text-muted)] absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          >
            search
          </span>
          <label htmlFor="global-command-filter" className="sr-only">
            Filter skills, MCP servers, transcripts, or SQL tables
          </label>
          <input
            id="global-command-filter"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter skills, MCPs, transcripts, or SQL..."
            className="w-full bg-[var(--agy-canvas)] border border-[var(--agy-border)] focus:border-[#3279f9] rounded-full pl-9 pr-10 py-1.5 text-xs font-mono text-[var(--agy-text-primary)] placeholder-[var(--agy-text-muted)] outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[var(--agy-text-secondary)] hover:text-[var(--agy-text-primary)]"
            >
              ESC
            </button>
          )}
        </div>

        {/* Right 1-Click Quick Profile Switcher */}
        <div className="hidden md:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onQuickApplyPreset('coding-lean')}
            disabled={isApplyingPreset}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono border transition-colors ${
              activePresetId === 'coding-lean'
                ? 'bg-[#3279f9]/15 border-[#3279f9] text-[var(--agy-accent)]'
                : 'bg-[var(--agy-canvas)] border-[var(--agy-border)] text-[var(--agy-text-secondary)] hover:text-[var(--agy-text-primary)]'
            }`}
          >
            <span className="google-symbol !text-[15px]" aria-hidden="true">
              bolt
            </span>
            Coding Lean
          </button>

          <button
            type="button"
            onClick={() => onQuickApplyPreset('full-restore')}
            disabled={isApplyingPreset}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-mono bg-[var(--agy-canvas)] border border-[var(--agy-border)] text-[var(--agy-text-secondary)] hover:text-[var(--agy-text-primary)]"
          >
            <span className="google-symbol !text-[15px]" aria-hidden="true">
              restore
            </span>
            Restore
          </button>
        </div>
      </div>
    </nav>
  );
};
