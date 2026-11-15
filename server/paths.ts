import path from 'node:path';
import os from 'node:os';

export const USER_HOME = os.homedir();
export const GEMINI_ROOT = path.join(USER_HOME, '.gemini');
export const ANTIGRAVITY_DIR = path.join(GEMINI_ROOT, 'antigravity');
export const CONFIG_DIR = path.join(GEMINI_ROOT, 'config');
export const WORKSPACE_ROOT = path.resolve(process.cwd());
export const BACKUPS_DIR = path.join(WORKSPACE_ROOT, 'backups');
export const SAME_DRIVE_QUARANTINE_DIR = path.join(GEMINI_ROOT, 'backups', 'antigravity-dashboard-quarantine');

export const DATA_PATHS = {
  globalSkillsDir: path.join(CONFIG_DIR, 'skills'),
  pluginSkillsRoot: path.join(CONFIG_DIR, 'plugins'),
  tjtoPluginDir: path.join(CONFIG_DIR, 'plugins', 'super-antigravity-tjto'),
  tjtoSkillsDir: path.join(CONFIG_DIR, 'plugins', 'super-antigravity-tjto', 'skills'),
  scienceSkillsDir: path.join(CONFIG_DIR, 'plugins', 'science', 'skills'),
  builtinSkillsDir: path.join(ANTIGRAVITY_DIR, 'builtin', 'skills'),
  geminiMd: path.join(GEMINI_ROOT, 'GEMINI.md'),
  tjtoRulesMd: path.join(CONFIG_DIR, 'plugins', 'super-antigravity-tjto', 'rules', 'AGENTS.md'),
  scienceRulesMd: path.join(CONFIG_DIR, 'plugins', 'science', 'rules', 'AGENTS.md'),
  antigravityMcpConfig: path.join(ANTIGRAVITY_DIR, 'mcp_config.json'),
  configMcpConfig: path.join(CONFIG_DIR, 'mcp_config.json'),
  mcpSchemasDir: path.join(ANTIGRAVITY_DIR, 'mcp'),
  brainDir: path.join(ANTIGRAVITY_DIR, 'brain'),
  htmlArtifactsDir: path.join(ANTIGRAVITY_DIR, 'html_artifacts'),
  conversationSummariesDb: path.join(ANTIGRAVITY_DIR, 'conversation_summaries.db'),
  skillsManifestJson: path.join(CONFIG_DIR, 'plugins', 'super-antigravity-tjto', 'skills_manifest.json'),
  gpuAsrScript: path.join(CONFIG_DIR, 'plugins', 'super-antigravity-tjto', 'tools', 'gpu_asr.py'),
  skillsPrunerScript: path.join(CONFIG_DIR, 'plugins', 'super-antigravity-tjto', 'tools', 'skills_pruner.py'),
  forbiddenBinaries: [
    path.join(GEMINI_ROOT, 'bin', 'agy.exe'),
    path.join(ANTIGRAVITY_DIR, 'bin'),
  ],
} as const;

export function normalizeWinPath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Invalid empty path');
  }
  const cleaned = inputPath.replace(/\0/g, '').trim();
  return path.resolve(cleaned);
}

export function assertNeverTouchesOfficialBinaries(targetPath: string): void {
  const resolved = normalizeWinPath(targetPath).toLowerCase();
  for (const forbidden of DATA_PATHS.forbiddenBinaries) {
    const fNorm = normalizeWinPath(forbidden).toLowerCase();
    if (resolved === fNorm || resolved.startsWith(fNorm + path.sep)) {
      throw new Error(`SECURITY_VIOLATION: Modification of official Antigravity binary path is strictly prohibited (${targetPath})`);
    }
  }
  if (resolved.endsWith('.exe') || resolved.endsWith('.dll') || resolved.endsWith('.asar')) {
    throw new Error(`SECURITY_VIOLATION: Binary/executable modification is forbidden by ToS Section 6 guard (${targetPath})`);
  }
}

export function isAllowedReadPath(targetPath: string): boolean {
  try {
    const resolved = normalizeWinPath(targetPath).toLowerCase();
    const allowedRoots = [
      normalizeWinPath(GEMINI_ROOT).toLowerCase(),
      normalizeWinPath(WORKSPACE_ROOT).toLowerCase(),
    ];
    return allowedRoots.some((root) => resolved === root || resolved.startsWith(root + path.sep));
  } catch {
    return false;
  }
}
