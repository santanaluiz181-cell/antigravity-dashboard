import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  BACKUPS_DIR,
  DATA_PATHS,
  SAME_DRIVE_QUARANTINE_DIR,
  assertNeverTouchesOfficialBinaries,
  normalizeWinPath,
} from '../paths.js';
import { runFullBloatScan } from './tokenScanner.js';

export interface ProfilePreset {
  id: 'coding-lean' | 'frontend-craft' | 'journalism-tjto' | 'video-broll' | 'full-restore';
  name: string;
  tagline: string;
  badge: string;
  estimatedSavedIndexTokens: number;
  quarantineDuplicates: boolean;
  parkScienceSkills: boolean;
  keepSkillAllowlist?: string[];
  enabledMcpServers: string[];
}

export const PROFILE_PRESETS: ProfilePreset[] = [
  {
    id: 'coding-lean',
    name: 'Coding Lean',
    tagline: 'Quarantines duplicate skills + Science/Media bloat. Restores evicted browser & research subagents.',
    badge: 'RECOMMENDED (-64% Index Bloat)',
    estimatedSavedIndexTokens: 6800,
    quarantineDuplicates: true,
    parkScienceSkills: true,
    enabledMcpServers: ['claude-mem', 'everything', 'kitsune-router', 'playwright'],
  },
  {
    id: 'frontend-craft',
    name: 'Frontend Craft',
    tagline: 'Design systems, Stitch MCP, LottieFiles, Desigma, Playwright, and anti-slop UI skills only.',
    badge: 'UI / STITCH / MOTION',
    estimatedSavedIndexTokens: 5400,
    quarantineDuplicates: true,
    parkScienceSkills: true,
    enabledMcpServers: ['claude-mem', 'kitsune-router', 'playwright', 'super-antigravity-tjto_stitch', 'lottiefiles-creator'],
  },
  {
    id: 'journalism-tjto',
    name: 'Journalism & Gabinete TJTO',
    tagline: 'MJ Notch Companion, RAG pipeline, Gabinete Judiciário, Perplexity Sonar, LGPD, SQLite & Turnitout.',
    badge: 'MJ + EPROC + RAG',
    estimatedSavedIndexTokens: 5100,
    quarantineDuplicates: true,
    parkScienceSkills: true,
    enabledMcpServers: ['claude-mem', 'everything', 'kitsune-router', 'playwright', 'super-antigravity-tjto_sqlite'],
  },
  {
    id: 'video-broll',
    name: 'Video / B-Roll & DSP',
    tagline: 'SuperRender, Watch Video GPU, Earshot Audio DSP, Huashu Motion, Filmcraft Bridge & Lottie.',
    badge: 'GPU MEDIA STUDIO',
    estimatedSavedIndexTokens: 4900,
    quarantineDuplicates: true,
    parkScienceSkills: true,
    enabledMcpServers: ['claude-mem', 'kitsune-router', 'filmcraft-bridge', 'filmcraft-headless', 'lottiefiles-creator'],
  },
  {
    id: 'full-restore',
    name: 'Full Restore (Unquarantine All)',
    tagline: 'Restores every quarantined skill and enables all configured MCP servers from verified backups.',
    badge: 'RESTORE 100%',
    estimatedSavedIndexTokens: 0,
    quarantineDuplicates: false,
    parkScienceSkills: false,
    enabledMcpServers: ['*'],
  },
];

export interface QuarantineLedgerEntry {
  skillName: string;
  originalPath: string;
  quarantinePath: string;
  movedAt: string;
  reason: string;
}

export interface ProfileApplyResult {
  presetId: string;
  appliedAt: string;
  quarantinedCount: number;
  restoredCount: number;
  mcpToggledCount: number;
  backupSnapshotPath: string;
  activePresetId: string;
}

let activeProfileMutex = false;

async function withProfileLock<T>(fn: () => Promise<T> | T): Promise<T> {
  if (activeProfileMutex) {
    throw new Error('CONCURRENCY_LOCK: Profile switch already in progress');
  }
  activeProfileMutex = true;
  try {
    return await fn();
  } finally {
    activeProfileMutex = false;
  }
}

function ensureBackupDirs(): void {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  fs.mkdirSync(path.join(BACKUPS_DIR, 'mcp_snapshots'), { recursive: true });
  fs.mkdirSync( path.join(BACKUPS_DIR, 'quarantine_skills'), { recursive: true });
  fs.mkdirSync(SAME_DRIVE_QUARANTINE_DIR, { recursive: true });
  fs.mkdirSync(path.join(SAME_DRIVE_QUARANTINE_DIR, 'global_skills'), { recursive: true });
  fs.mkdirSync(path.join(SAME_DRIVE_QUARANTINE_DIR, 'science_skills'), { recursive: true });
}

function getLedgerPath(): string {
  ensureBackupDirs();
  return path.join(BACKUPS_DIR, 'quarantine_ledger.json');
}

function getActiveStatePath(): string {
  ensureBackupDirs();
  return path.join(BACKUPS_DIR, 'active_profile.json');
}

export function readQuarantineLedger(): QuarantineLedgerEntry[] {
  const ledgerPath = getLedgerPath();
  if (!fs.existsSync(ledgerPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(ledgerPath, 'utf-8')) as QuarantineLedgerEntry[];
  } catch {
    return [];
  }
}

function writeQuarantineLedger(entries: QuarantineLedgerEntry[]): void {
  const ledgerPath = getLedgerPath();
  assertNeverTouchesOfficialBinaries(ledgerPath);
  fs.writeFileSync(ledgerPath, JSON.stringify(entries, null, 2), 'utf-8');
}

export function getActiveProfileState(): { activePresetId: string; updatedAt: string | null } {
  const p = getActiveStatePath();
  if (!fs.existsSync(p)) {
    return { activePresetId: 'unoptimized', updatedAt: null };
  }
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return { activePresetId: 'unoptimized', updatedAt: null };
  }
}

function moveDirectoryAtomic(srcDir: string, destDir: string): void {
  assertNeverTouchesOfficialBinaries(srcDir);
  assertNeverTouchesOfficialBinaries(destDir);
  if (!fs.existsSync(srcDir)) return;

  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  try {
    if (fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true, force: true });
    }
    fs.renameSync(srcDir, destDir);
  } catch {
    // Fallback for cross-volume move (e.g. C: <-> E:)
    fs.cpSync(srcDir, destDir, { recursive: true, force: true });
    const srcSkillMd = path.join(srcDir, 'SKILL.md');
    const dstSkillMd = path.join(destDir, 'SKILL.md');
    if (fs.existsSync(srcSkillMd) && fs.existsSync(dstSkillMd)) {
      const h1 = crypto.createHash('sha256').update(fs.readFileSync(srcSkillMd)).digest('hex');
      const h2 = crypto.createHash('sha256').update(fs.readFileSync(dstSkillMd)).digest('hex');
      if (h1 !== h2) {
        throw new Error(`INTEGRITY_MISMATCH: Failed SHA-256 verification while copying ${srcDir}`);
      }
    }
    fs.rmSync(srcDir, { recursive: true, force: true });
  }
}

export async function applyProfilePreset(presetId: ProfilePreset['id']): Promise<ProfileApplyResult> {
  return withProfileLock(() => {
    ensureBackupDirs();
    const preset = PROFILE_PRESETS.find((p) => p.id === presetId);
    if (!preset) {
      throw new Error(`Unknown preset id: ${presetId}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let ledger = readQuarantineLedger();
    let quarantinedCount = 0;
    let restoredCount = 0;
    let mcpToggledCount = 0;

    // 1. If Full Restore, move everything in ledger back to originalPath
    if (preset.id === 'full-restore') {
      const remaining: QuarantineLedgerEntry[] = [];
      for (const entry of ledger) {
        if (fs.existsSync(entry.quarantinePath)) {
          moveDirectoryAtomic(entry.quarantinePath, entry.originalPath);
          restoredCount += 1;
        } else if (!fs.existsSync(entry.originalPath)) {
          remaining.push(entry);
        }
      }
      ledger = remaining;
      writeQuarantineLedger(ledger);
    } else {
      // 2. Quarantine duplicate global skills that collide with SuperAntigravityTJTO or Builtin skills
      if (preset.quarantineDuplicates) {
        const scan = runFullBloatScan();
        const duplicates = scan.items.filter(
          (i) => i.isDuplicate && i.category === 'skill-global'
        );

        for (const dup of duplicates) {
          const skillFolder = path.dirname(dup.sourcePath);
          const qDest = path.join(SAME_DRIVE_QUARANTINE_DIR, 'global_skills', dup.name);
          const workspaceMirror = path.join(BACKUPS_DIR, 'quarantine_skills', 'global_skills', dup.name);

          if (fs.existsSync(skillFolder)) {
            fs.cpSync(skillFolder, workspaceMirror, { recursive: true, force: true });
            moveDirectoryAtomic(skillFolder, qDest);
            quarantinedCount += 1;
            ledger = ledger.filter((e) => e.originalPath !== skillFolder);
            ledger.push({
              skillName: dup.name,
              originalPath: normalizeWinPath(skillFolder),
              quarantinePath: normalizeWinPath(qDest),
              movedAt: new Date().toISOString(),
              reason: `Duplicate of ${dup.duplicateOf || 'plugin skill'}`,
            });
          }
        }
      }

      // 3. Optionally park heavy Science skills when in Coding/Frontend/Journalism/Video mode
      if (preset.parkScienceSkills && fs.existsSync(DATA_PATHS.scienceSkillsDir)) {
        const entries = fs.readdirSync(DATA_PATHS.scienceSkillsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const skillFolder = path.join(DATA_PATHS.scienceSkillsDir, entry.name);
          const qDest = path.join(SAME_DRIVE_QUARANTINE_DIR, 'science_skills', entry.name);
          if (fs.existsSync(path.join(skillFolder, 'SKILL.md'))) {
            moveDirectoryAtomic(skillFolder, qDest);
            quarantinedCount += 1;
            ledger = ledger.filter((e) => e.originalPath !== skillFolder);
            ledger.push({
              skillName: `science:${entry.name}`,
              originalPath: normalizeWinPath(skillFolder),
              quarantinePath: normalizeWinPath(qDest),
              movedAt: new Date().toISOString(),
              reason: `Parked by preset ${preset.name}`,
            });
          }
        }
      }

      writeQuarantineLedger(ledger);
    }

    // 4. Snapshot and toggle MCP servers in mcp_config.json safely
    const mcpTargets = [DATA_PATHS.antigravityMcpConfig, DATA_PATHS.configMcpConfig].filter((p) =>
      fs.existsSync(p)
    );
    let backupSnapshotPath = path.join(BACKUPS_DIR, 'mcp_snapshots', `mcp_snapshot_${timestamp}.json`);

    for (const mcpPath of mcpTargets) {
      assertNeverTouchesOfficialBinaries(mcpPath);
      const raw = fs.readFileSync(mcpPath, 'utf-8').replace(/^\uFEFF/, '');
      const snapshotFile = path.join(
        BACKUPS_DIR,
        'mcp_snapshots',
        `${path.basename(path.dirname(mcpPath))}_mcp_config_${timestamp}.json`
      );
      fs.writeFileSync(snapshotFile, raw, 'utf-8');
      backupSnapshotPath = snapshotFile;

      try {
        const parsed = JSON.parse(raw) as { mcpServers?: Record<string, Record<string, unknown>> };
        if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
          for (const [srvName, srvCfg] of Object.entries(parsed.mcpServers)) {
            const shouldEnable =
              preset.enabledMcpServers.includes('*') ||
              preset.enabledMcpServers.includes(srvName) ||
              preset.enabledMcpServers.some((allowed) => srvName.includes(allowed));

            const currentlyDisabled = Boolean(srvCfg.disabled === true);
            if (shouldEnable && currentlyDisabled) {
              delete srvCfg.disabled;
              mcpToggledCount += 1;
            } else if (!shouldEnable && !currentlyDisabled) {
              srvCfg.disabled = true;
              mcpToggledCount += 1;
            }
          }
          fs.writeFileSync(mcpPath, JSON.stringify(parsed, null, 2), 'utf-8');
        }
      } catch {
        // Keep untouched if malformed
      }
    }

    const appliedAt = new Date().toISOString();
    fs.writeFileSync(
      getActiveStatePath(),
      JSON.stringify({ activePresetId: preset.id, updatedAt: appliedAt }, null, 2),
      'utf-8'
    );

    return {
      presetId: preset.id,
      appliedAt,
      quarantinedCount,
      restoredCount,
      mcpToggledCount,
      backupSnapshotPath,
      activePresetId: preset.id,
    };
  });
}
