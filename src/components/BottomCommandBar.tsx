import React from 'react';
import {
  Layers,
  Activity,
  Database,
  Mic,
  Search,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

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
  const navItems: { id: ActiveTabId; label: string; badge?: string; icon: React.ReactNode }[] = [
    {
      id: 'bloat',
      label: '1. Context & Bloat Control',
      badge: 'SKILLS / MCP',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'sessions',
      label: '2. Live Sessions & Kitsune',
      badge: 'BRAIN / :4319',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: 'datasources',
      label: '3. Data + Sources Pane',
      badge: 'SQL / CSV',
      icon: <Database className="w-4 h-4" />,
    },
    {
      id: 'meetings',
      label: '4. Post-Meeting Executor',
      badge: 'VULKAN ASR',
      icon: <Mic className="w-4 h-4" />,
    },
  ];

  return (
    <nav
      aria-label="Bottom Command and Filter Bar"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[96%] max-w-[1380px] bg-[#13161B]/95 backdrop-blur-xl border border-[#232832] rounded-2xl px-3.5 py-2 shadow-2xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Module Switcher Pills (Material 3 Bottom Bar Alignment) */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#1F2531] text-[#E6EAF0] border border-[#384254]'
                    : 'text-[#9BA3B0] hover:text-[#E6EAF0] hover:bg-[#181C23] border border-transparent'
                }`}
              >
                <span className={isActive ? 'text-[#8AB4F8]' : 'text-[#9BA3B0]'}>{item.icon}</span>
                <span className="whitespace-nowrap">{item.label}</span>
                {item.badge && (
                  <span className="hidden xl:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0B0D10] text-[#646D7A]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Center Command / Filter Input */}
        <div className="relative flex-1 min-w-[200px] max-w-[340px]">
          <Search className="w-3.5 h-3.5 text-[#646D7A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter skills, MCPs, transcripts, or SQL tables..."
            className="w-full bg-[#0B0D10] border border-[#232832] focus:border-[#8AB4F8] rounded-xl pl-8 pr-8 py-1.5 text-xs text-[#E6EAF0] placeholder-[#646D7A] outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#9BA3B0] hover:text-[#E6EAF0] cursor-pointer"
            >
              ESC
            </button>
          )}
        </div>

        {/* Right 1-Click Quick Profile Switcher */}
        <div className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => onQuickApplyPreset('coding-lean')}
            disabled={isApplyingPreset}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono border cursor-pointer transition-colors ${
              activePresetId === 'coding-lean'
                ? 'bg-[#8AB4F8]/15 border-[#8AB4F8]/50 text-[#8AB4F8]'
                : 'bg-[#0B0D10] border-[#232832] text-[#9BA3B0] hover:text-[#E6EAF0]'
            }`}
            title="1-Click: Quarantine duplicate skills & Science bloat so evicted subagents fit in budget"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Coding Lean
          </button>

          <button
            onClick={() => onQuickApplyPreset('full-restore')}
            disabled={isApplyingPreset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono bg-[#0B0D10] border border-[#232832] text-[#9BA3B0] hover:text-[#E6EAF0] cursor-pointer"
            title="Restore all quarantined skills and MCP servers from atomic backup"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore
          </button>
        </div>
      </div>
    </nav>
  );
};
