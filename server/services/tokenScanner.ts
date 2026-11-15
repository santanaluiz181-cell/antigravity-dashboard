import fs from 'node:fs';
import path from 'node:path';
import { DATA_PATHS, normalizeWinPath } from '../paths.js';

export interface ScannedItem {
  id: string;
  name: string;
  category: 'skill-global' | 'skill-plugin-tjto' | 'skill-plugin-science' | 'skill-plugin-other' | 'skill-builtin' | 'rule' | 'mcp-server';
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

export interface BloatScanReport {
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
  items: ScannedItem[];
}

export const BLOAT_LINE_THRESHOLD = 250;
export const BLOAT_TOKEN_THRESHOLD = 3200;
export const SYSTEM_INDEX_BUDGET_TOKENS = 14000;

export function estimateTokensFromText(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const cleaned = text.replace(/^\uFEFF/, '');
  if (cleaned.length === 0) return 0;
  // Empirical hybrid estimator for Markdown/code/JSON prompts (~3.75 chars/token + punctuation weight)
  const words = cleaned.trim().split(/\s+/).filter(Boolean).length;
  const charBased = Math.ceil(cleaned.length / 3.8);
  const wordBased = Math.ceil(words * 1.35);
  return Math.max(1, Math.round((charBased + wordBased) / 2));
}

export function countLines(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const cleaned = text.replace(/^\uFEFF/, '');
  if (cleaned.length === 0) return 0;
  return cleaned.split(/\r?\n/).length;
}

export function extractFrontmatterDescription(markdown: string): string {
  if (!markdown) return '';
  const cleaned = markdown.replace(/^\uFEFF/, '');
  const match = cleaned.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    const firstParagraph = cleaned.split(/\r?\n/).find((l) => l.trim() && !l.startsWith('#'));
    return (firstParagraph || '').slice(0, 260).trim();
  }
  const block = match[1];
  const descLine = block.match(/description:\s*(.+)/i);
  if (descLine) {
    return descLine[1].replace(/^['"]|['"]$/g, '').trim();
  }
  return '';
}

function scanSkillFolder(
  dirPath: string,
  category: ScannedItem['category'],
  enabled = true
): ScannedItem[] {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results: ScannedItem[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillMdPath = path.join(dirPath, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) continue;

    try {
      const content = fs.readFileSync(skillMdPath, 'utf-8');
      const charCount = content.length;
      const lineCount = countLines(content);
      const estimatedTokens = estimateTokensFromText(content);
      const description = extractFrontmatterDescription(content);
      const descriptionTokens = estimateTokensFromText(`${entry.name} (${skillMdPath}): ${description}`);
      const bloatReasons: string[] = [];

      if (lineCount > BLOAT_LINE_THRESHOLD) {
        bloatReasons.push(`Exceeds ${BLOAT_LINE_THRESHOLD} lines (${lineCount} lines)`);
      }
      if (estimatedTokens > BLOAT_TOKEN_THRESHOLD) {
        bloatReasons.push(`Heavy full-load footprint (${estimatedTokens.toLocaleString()} tokens)`);
      }

      results.push({
        id: `${category}:${entry.name}`,
        name: entry.name,
        category,
        sourcePath: normalizeWinPath(skillMdPath),
        charCount,
        lineCount,
        estimatedTokens,
        descriptionTokens: Math.max(25, descriptionTokens),
        isBloated: bloatReasons.length > 0,
        bloatReasons,
        isDuplicate: false,
        enabled,
        description: description || `Skill ${entry.name}`,
      });
    } catch {
      // Skip unreadable file safely
    }
  }
  return results;
}

function scanRuleFiles(): ScannedItem[] {
  const rulesToScan = [
    { name: 'GEMINI.md (Global User Rule)', path: DATA_PATHS.geminiMd },
    { name: 'AGENTS.md (SuperAntigravityTJTO)', path: DATA_PATHS.tjtoRulesMd },
    { name: 'AGENTS.md (Science Plugin)', path: DATA_PATHS.scienceRulesMd },
  ];

  const items: ScannedItem[] = [];
  for (const rule of rulesToScan) {
    if (!fs.existsSync(rule.path)) continue;
    try {
      const content = fs.readFileSync(rule.path, 'utf-8');
      const charCount = content.length;
      const lineCount = countLines(content);
      const estimatedTokens = estimateTokensFromText(content);
      const bloatReasons: string[] = [];
      if (lineCount > BLOAT_LINE_THRESHOLD) {
        bloatReasons.push(`Rule file > ${BLOAT_LINE_THRESHOLD} lines (${lineCount} lines)`);
      }
      items.push({
        id: `rule:${rule.name}`,
        name: rule.name,
        category: 'rule',
        sourcePath: normalizeWinPath(rule.path),
        charCount,
        lineCount,
        estimatedTokens,
        descriptionTokens: estimatedTokens, // Rules are eagerly injected into every turn!
        isBloated: bloatReasons.length > 0,
        bloatReasons,
        isDuplicate: false,
        enabled: true,
        description: `Always-injected system rule (${lineCount} lines)`,
      });
    } catch {
      // ignore
    }
  }
  return items;
}

function scanMcpServers(): ScannedItem[] {
  const items: ScannedItem[] = [];
  const configPath = fs.existsSync(DATA_PATHS.antigravityMcpConfig)
    ? DATA_PATHS.antigravityMcpConfig
    : DATA_PATHS.configMcpConfig;

  if (!fs.existsSync(configPath)) return items;

  try {
    const raw = fs.readFileSync(configPath, 'utf-8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw) as { mcpServers?: Record<string, Record<string, unknown>> };
    const servers = parsed.mcpServers || {};

    for (const [serverName, cfg] of Object.entries(servers)) {
      const serialized = JSON.stringify(cfg, null, 2);
      const disabled = Boolean(cfg.disabled === true || cfg.enabled === false);

      // Check how many schema files exist in ~/.gemini/antigravity/mcp/<serverName>
      let toolCount = 0;
      let schemaChars = serialized.length;
      const schemaDir = path.join(DATA_PATHS.mcpSchemasDir, serverName);
      if (fs.existsSync(schemaDir)) {
        const files = fs.readdirSync(schemaDir).filter((f) => f.endsWith('.json'));
        toolCount = files.length;
        for (const f of files) {
          try {
            schemaChars += fs.statSync(path.join(schemaDir, f)).size;
          } catch {
            // ignore
          }
        }
      }

      const estimatedTokens = Math.max(40, Math.ceil(schemaChars / 4));
      const indexTokens = disabled ? 0 : Math.max(18, toolCount * 8 + 20);
      const bloatReasons: string[] = [];
      if (toolCount > 25) {
        bloatReasons.push(`Exposes ${toolCount} MCP tools in system index`);
      }

      items.push({
        id: `mcp:${serverName}`,
        name: serverName,
        category: 'mcp-server',
        sourcePath: normalizeWinPath(configPath),
        charCount: schemaChars,
        lineCount: toolCount || countLines(serialized),
        estimatedTokens,
        descriptionTokens: indexTokens,
        isBloated: bloatReasons.length > 0,
        bloatReasons,
        isDuplicate: false,
        enabled: !disabled,
        description: `MCP Server (${toolCount > 0 ? `${toolCount} tools` : 'configured in mcp_config.json'})`,
      });
    }
  } catch {
    // ignore malformed json
  }
  return items;
}

export function annotateDuplicates(items: ScannedItem[]): ScannedItem[] {
  const bySkillName = new Map<string, ScannedItem[]>();
  for (const item of items) {
    if (!item.category.startsWith('skill-')) continue;
    const key = item.name.toLowerCase().trim();
    const list = bySkillName.get(key) || [];
    list.push(item);
    bySkillName.set(key, list);
  }

  for (const [, group] of bySkillName.entries()) {
    if (group.length <= 1) continue;
    // Prefer keeping plugin or builtin canonical skill, flag global duplicate
    const canonical =
      group.find((g) => g.category === 'skill-plugin-tjto') ||
      group.find((g) => g.category === 'skill-builtin') ||
      group[0];

    for (const member of group) {
      if (member.id !== canonical.id) {
        member.isDuplicate = true;
        member.duplicateOf = canonical.sourcePath;
        member.isBloated = true;
        if (!member.bloatReasons.some((r) => r.includes('Duplicate skill'))) {
          member.bloatReasons.unshift(`Duplicate skill collision with ${canonical.category} (${canonical.name})`);
        }
      }
    }
  }

  return items;
}

export function runFullBloatScan(): BloatScanReport {
  const rawItems: ScannedItem[] = [
    ...scanRuleFiles(),
    ...scanSkillFolder(DATA_PATHS.globalSkillsDir, 'skill-global', true),
    ...scanSkillFolder(DATA_PATHS.tjtoSkillsDir, 'skill-plugin-tjto', true),
    ...scanSkillFolder(DATA_PATHS.scienceSkillsDir, 'skill-plugin-science', true),
    ...scanSkillFolder(DATA_PATHS.builtinSkillsDir, 'skill-builtin', true),
    ...scanMcpServers(),
  ];

  // Scan any additional plugins under config/plugins
  if (fs.existsSync(DATA_PATHS.pluginSkillsRoot)) {
    for (const entry of fs.readdirSync(DATA_PATHS.pluginSkillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'super-antigravity-tjto' || entry.name === 'science') continue;
      const otherSkillsDir = path.join(DATA_PATHS.pluginSkillsRoot, entry.name, 'skills');
      rawItems.push(...scanSkillFolder(otherSkillsDir, 'skill-plugin-other', true));
    }
  }

  const items = annotateDuplicates(rawItems);

  const breakdownByCategory: Record<string, { count: number; tokens: number; indexTokens: number }> = {};
  let totalFullLoadTokens = 0;
  let totalSystemPromptIndexTokens = 0;
  let activeItems = 0;
  let duplicateSkillsCount = 0;
  let bloatedPromptsCount = 0;

  for (const item of items) {
    if (!breakdownByCategory[item.category]) {
      breakdownByCategory[item.category] = { count: 0, tokens: 0, indexTokens: 0 };
    }
    breakdownByCategory[item.category].count += 1;
    breakdownByCategory[item.category].tokens += item.estimatedTokens;
    breakdownByCategory[item.category].indexTokens += item.enabled ? item.descriptionTokens : 0;

    if (item.enabled) {
      activeItems += 1;
      totalFullLoadTokens += item.estimatedTokens;
      totalSystemPromptIndexTokens += item.descriptionTokens;
    }
    if (item.isDuplicate) duplicateSkillsCount += 1;
    if (item.isBloated) bloatedPromptsCount += 1;
  }

  const budgetUtilizationPct = Math.min(
    100,
    Math.round((totalSystemPromptIndexTokens / SYSTEM_INDEX_BUDGET_TOKENS) * 100)
  );

  return {
    scannedAt: new Date().toISOString(),
    totalItems: items.length,
    activeItems,
    totalFullLoadTokens,
    totalSystemPromptIndexTokens,
    contextBudgetLimitTokens: SYSTEM_INDEX_BUDGET_TOKENS,
    budgetUtilizationPct,
    evictionRiskWarning: totalSystemPromptIndexTokens > SYSTEM_INDEX_BUDGET_TOKENS * 0.8 || duplicateSkillsCount > 0,
    duplicateSkillsCount,
    bloatedPromptsCount,
    breakdownByCategory,
    items: items.sort((a, b) => {
      if (a.isDuplicate !== b.isDuplicate) return a.isDuplicate ? -1 : 1;
      if (a.isBloated !== b.isBloated) return a.isBloated ? -1 : 1;
      return b.estimatedTokens - a.estimatedTokens;
    }),
  };
}
