import { describe, it, expect } from 'vitest';
import path from 'node:path';
import {
  DATA_PATHS,
  assertNeverTouchesOfficialBinaries,
  isAllowedReadPath,
} from '../server/paths.js';
import {
  annotateDuplicates,
  countLines,
  estimateTokensFromText,
  extractFrontmatterDescription,
  runFullBloatScan,
  type ScannedItem,
} from '../server/services/tokenScanner.js';
import {
  assertReadOnlySelectSql,
  executeDatasetQuery,
  ingestCsvContent,
} from '../server/services/sqliteInspector.js';
import {
  approveOrRejectStagedAction,
  extractStructuredMeetingIntelligence,
} from '../server/services/meetingPipeline.js';

describe('Antigravity Dashboard — Uncle Bob & ToS Section 6 Verification Suite', () => {
  it('BLOCKS any modification attempt on agy.exe or executable binaries (Negative/Security Assertion)', () => {
    expect(() => assertNeverTouchesOfficialBinaries(DATA_PATHS.forbiddenBinaries[0])).toThrow(
      /SECURITY_VIOLATION/
    );
    expect(() => assertNeverTouchesOfficialBinaries('C:\\Program Files\\Antigravity\\app.asar')).toThrow(
      /SECURITY_VIOLATION/
    );
    expect(() => assertNeverTouchesOfficialBinaries('C:\\Users\\tharcio\\patch.dll')).toThrow(
      /SECURITY_VIOLATION/
    );
    // Positive assertion: allows backup JSON
    expect(() =>
      assertNeverTouchesOfficialBinaries('e:\\Downloads_C\\Antigravity Dashboard\\backups\\test.json')
    ).not.toThrow();
  });

  it('BLOCKS path traversal outside ~/.gemini and workspace in read guard (Negative Assertion)', () => {
    expect(isAllowedReadPath('C:\\Windows\\System32\\drivers\\etc\\hosts')).toBe(false);
    expect(isAllowedReadPath('')).toBe(false);
    expect(isAllowedReadPath(path.join(DATA_PATHS.brainDir, 'sample.html'))).toBe(true);
  });

  it('accurately counts lines, strips UTF-8 BOM, and flags duplicate skills (Mutation Check)', () => {
    expect(estimateTokensFromText('')).toBe(0);
    expect(countLines('\uFEFFline1\nline2\nline3')).toBe(3);

    const md = '---\nname: caveman\ndescription: "Token reduction protocol"\n---\n# Body';
    expect(extractFrontmatterDescription(md)).toBe('Token reduction protocol');

    const mockItems: ScannedItem[] = [
      {
        id: 'skill-global:caveman',
        name: 'caveman',
        category: 'skill-global',
        sourcePath: 'C:\\Users\\tharcio\\.gemini\\config\\skills\\caveman\\SKILL.md',
        charCount: 1200,
        lineCount: 45,
        estimatedTokens: 310,
        descriptionTokens: 40,
        isBloated: false,
        bloatReasons: [],
        isDuplicate: false,
        enabled: true,
        description: 'Caveman global',
      },
      {
        id: 'skill-plugin-tjto:caveman',
        name: 'caveman',
        category: 'skill-plugin-tjto',
        sourcePath: 'C:\\Users\\tharcio\\.gemini\\config\\plugins\\super-antigravity-tjto\\skills\\caveman\\SKILL.md',
        charCount: 1200,
        lineCount: 45,
        estimatedTokens: 310,
        descriptionTokens: 40,
        isBloated: false,
        bloatReasons: [],
        isDuplicate: false,
        enabled: true,
        description: 'Caveman plugin',
      },
    ];

    const annotated = annotateDuplicates(mockItems);
    const globalItem = annotated.find((i) => i.category === 'skill-global')!;
    const pluginItem = annotated.find((i) => i.category === 'skill-plugin-tjto')!;
    expect(globalItem.isDuplicate).toBe(true);
    expect(pluginItem.isDuplicate).toBe(false);
  });

  it('scans live ~/.gemini environment and detects skills & rules', () => {
    const report = runFullBloatScan();
    expect(report.totalItems).toBeGreaterThan(5);
    expect(report.totalSystemPromptIndexTokens).toBeGreaterThan(100);
  });

  it('enforces read-only SELECT/WITH in SQL Sources Inspector and blocks SQL injection/mutation', () => {
    expect(() => assertReadOnlySelectSql('DROP TABLE users')).toThrow(/SQL_SECURITY_VIOLATION/);
    expect(() => assertReadOnlySelectSql('SELECT * FROM t; DELETE FROM t')).toThrow(
      /SQL_SECURITY_VIOLATION/
    );
    expect(() => assertReadOnlySelectSql('UPDATE tbl SET x = 1')).toThrow(/SQL_SECURITY_VIOLATION/);
    expect(assertReadOnlySelectSql('SELECT * FROM "tbl" LIMIT 10;')).toBe(
      'SELECT * FROM "tbl" LIMIT 10'
    );

    const csv = 'skill,tokens,lines\ncaveman,320,48\nwatch-video,890,275';
    const ingested = ingestCsvContent('unit_test_metrics', csv, 'unit-test.csv');
    expect(ingested.totalRowsInTable).toBe(2);
    expect(ingested.rows[1].tokens).toBe(890);

    const filtered = executeDatasetQuery(
      ingested.datasetId,
      `SELECT skill, lines FROM "${ingested.tableName}" WHERE lines > 250`
    );
    expect(filtered.returnedRowsCount).toBe(1);
    expect(filtered.rows[0].skill).toBe('watch-video');
  });

  it('locks staged meeting MCP actions behind explicit human approval gate', () => {
    const mtg = extractStructuredMeetingIntelligence(
      'Unit Test Sync',
      'Decidimos usar SQLite nativo. Tarefa: atualizar documentação de arquitetura.',
      'ggml_vulkan'
    );
    expect(mtg.stagedActions.length).toBeGreaterThan(0);
    const firstAction = mtg.stagedActions[0];
    expect(firstAction.status).toBe('PENDING_HUMAN_APPROVAL');

    const approved = approveOrRejectStagedAction(mtg.meetingId, firstAction.actionId, 'APPROVE');
    expect(approved.status).toBe('APPROVED_AND_EXECUTED');
    expect(approved.executionReceipt).toContain('Dispatched');
  });
});
