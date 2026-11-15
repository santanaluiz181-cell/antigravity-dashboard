import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { BACKUPS_DIR, DATA_PATHS } from '../paths.js';

export interface ColumnSchema {
  name: string;
  type: string;
  sampleValue: string;
}

export interface DataSourceQueryResult {
  datasetId: string;
  datasetName: string;
  sourceFormat: 'csv' | 'json' | 'sqlite';
  originPath: string;
  tableName: string;
  executedSql: string;
  executionMs: number;
  totalRowsInTable: number;
  returnedRowsCount: number;
  columns: ColumnSchema[];
  rows: Record<string, unknown>[];
  transformationsApplied: string[];
}

interface RegisteredDataset {
  id: string;
  name: string;
  format: 'csv' | 'json' | 'sqlite';
  originPath: string;
  tableName: string;
  transformations: string[];
  dbPath?: string; // If backed by external .db file
}

const memoryDb = new DatabaseSync(':memory:');
const datasets = new Map<string, RegisteredDataset>();

export function assertReadOnlySelectSql(sql: string): string {
  if (!sql || typeof sql !== 'string') {
    throw new Error('SQL_EMPTY: Query cannot be empty');
  }
  const trimmed = sql.trim().replace(/;+\s*$/, '');
  if (!trimmed) {
    throw new Error('SQL_EMPTY: Query cannot be empty');
  }
  // Forbid multiple statements separated by semicolon
  if (trimmed.includes(';')) {
    throw new Error('SQL_SECURITY_VIOLATION: Multiple SQL statements are prohibited');
  }
  const upper = trimmed.toUpperCase();
  if (!upper.startsWith('SELECT ') && !upper.startsWith('WITH ')) {
    throw new Error('SQL_SECURITY_VIOLATION: Only read-only SELECT or WITH queries are permitted');
  }
  const forbiddenTokens = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|ATTACH|DETACH|PRAGMA|REPLACE|VACUUM|TRUNCATE)\b/i;
  if (forbiddenTokens.test(trimmed)) {
    throw new Error('SQL_SECURITY_VIOLATION: Mutating or administrative SQL keywords are prohibited');
  }
  return trimmed;
}

export function sanitizeIdentifier(raw: string): string {
  const cleaned = raw
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^([0-9])/, '_$1')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
  return cleaned || 'col';
}

export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function inferSqlType(values: unknown[]): 'REAL' | 'INTEGER' | 'TEXT' {
  const nonNull = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonNull.length === 0) return 'TEXT';
  let allInt = true;
  let allNum = true;
  for (const v of nonNull) {
    const s = String(v).trim();
    const n = Number(s);
    if (!Number.isFinite(n) || s === '') {
      allInt = false;
      allNum = false;
      break;
    }
    if (!Number.isInteger(n)) {
      allInt = false;
    }
  }
  if (allInt) return 'INTEGER';
  if (allNum) return 'REAL';
  return 'TEXT';
}

export function ingestStructuredRecords(
  datasetName: string,
  format: 'csv' | 'json',
  records: Record<string, unknown>[],
  originLabel?: string
): DataSourceQueryResult {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('INGEST_EMPTY: Dataset contains zero records');
  }

  const id = `ds_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const tableName = sanitizeIdentifier(`tbl_${datasetName}_${id.slice(-4)}`);
  const rawKeys = Object.keys(records[0]);
  if (rawKeys.length === 0) {
    throw new Error('INGEST_SCHEMA_EMPTY: First record has no fields');
  }

  const colMap = rawKeys.map((rawKey, idx) => {
    const safeName = sanitizeIdentifier(rawKey) || `col_${idx}`;
    const sampleVals = records.slice(0, 50).map((r) => r[rawKey]);
    const sqlType = inferSqlType(sampleVals);
    return { rawKey, safeName, sqlType };
  });

  // Deduplicate column names if needed
  const seenCols = new Set<string>();
  for (const c of colMap) {
    let candidate = c.safeName;
    let suffix = 2;
    while (seenCols.has(candidate)) {
      candidate = `${c.safeName}_${suffix++}`;
    }
    c.safeName = candidate;
    seenCols.add(candidate);
  }

  const colDefs = colMap.map((c) => `"${c.safeName}" ${c.sqlType}`).join(', ');
  memoryDb.exec(`DROP TABLE IF EXISTS "${tableName}"; CREATE TABLE "${tableName}" (${colDefs});`);

  const placeholders = colMap.map(() => '?').join(', ');
  const insertStmt = memoryDb.prepare(`INSERT INTO "${tableName}" VALUES (${placeholders})`);

  for (const rec of records) {
    const rowVals = colMap.map((c) => {
      const val = rec[c.rawKey];
      if (val === undefined || val === null || val === '') return null;
      if (c.sqlType === 'INTEGER' || c.sqlType === 'REAL') {
        const num = Number(val);
        return Number.isFinite(num) ? num : null;
      }
      return typeof val === 'object' ? JSON.stringify(val) : String(val);
    });
    insertStmt.run(...rowVals);
  }

  const transformations = [
    `Normalized ${colMap.length} column identifiers to snake_case SQL-safe names`,
    `Inferred column types (${colMap.filter((c) => c.sqlType !== 'TEXT').length} numeric, ${colMap.filter((c) => c.sqlType === 'TEXT').length} text)`,
    `Loaded ${records.length} rows into in-memory SQLite table "${tableName}"`,
  ];

  const ds: RegisteredDataset = {
    id,
    name: datasetName,
    format,
    originPath: originLabel || `Uploaded ${format.toUpperCase()} (${datasetName})`,
    tableName,
    transformations,
  };
  datasets.set(id, ds);

  return executeDatasetQuery(id, `SELECT * FROM "${tableName}" LIMIT 250`);
}

export function ingestCsvContent(datasetName: string, csvText: string, originLabel?: string): DataSourceQueryResult {
  const cleaned = (csvText || '').replace(/^\uFEFF/, '').trim();
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV_INVALID: CSV must include header row and at least 1 data row');
  }
  const headers = parseCsvLine(lines[0]);
  const records: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      obj[h || `col_${idx}`] = vals[idx] ?? '';
    });
    records.push(obj);
  }
  return ingestStructuredRecords(datasetName, 'csv', records, originLabel);
}

export function executeDatasetQuery(datasetId: string, sql: string): DataSourceQueryResult {
  const ds = datasets.get(datasetId);
  if (!ds) {
    throw new Error(`DATASET_NOT_FOUND: Unknown datasetId "${datasetId}"`);
  }

  const safeSql = assertReadOnlySelectSql(sql);
  const start = performance.now();

  const db = ds.dbPath ? new DatabaseSync(ds.dbPath, { open: true }) : memoryDb;
  try {
    const rows = db.prepare(safeSql).all() as Record<string, unknown>[];
    const countRow = db
      .prepare(`SELECT COUNT(*) as cnt FROM "${ds.tableName}"`)
      .get() as { cnt: number };

    const sampleRow = rows[0] || {};
    const columns: ColumnSchema[] = Object.keys(sampleRow).map((k) => {
      const v = sampleRow[k];
      return {
        name: k,
        type: typeof v === 'number' ? (Number.isInteger(v) ? 'INTEGER' : 'REAL') : 'TEXT',
        sampleValue: v === null || v === undefined ? 'NULL' : String(v).slice(0, 60),
      };
    });

    return {
      datasetId: ds.id,
      datasetName: ds.name,
      sourceFormat: ds.format,
      originPath: ds.originPath,
      tableName: ds.tableName,
      executedSql: safeSql,
      executionMs: Number((performance.now() - start).toFixed(2)),
      totalRowsInTable: Number(countRow?.cnt ?? rows.length),
      returnedRowsCount: rows.length,
      columns,
      rows: rows.map((r) => ({ ...r })),
      transformationsApplied: ds.transformations,
    };
  } finally {
    if (ds.dbPath) {
      db.close();
    }
  }
}

export function listDatasets(): { id: string; name: string; format: string; tableName: string; originPath: string }[] {
  return Array.from(datasets.values()).map((d) => ({
    id: d.id,
    name: d.name,
    format: d.format,
    tableName: d.tableName,
    originPath: d.originPath,
  }));
}

export function ensureDefaultBootDataset(bloatItems: { name: string; category: string; estimatedTokens: number; descriptionTokens: number; lineCount: number; isDuplicate: boolean }[]): void {
  if (datasets.size > 0) return;
  const rows = bloatItems.map((item) => ({
    item_name: item.name,
    category: item.category,
    full_tokens: item.estimatedTokens,
    index_tokens: item.descriptionTokens,
    lines: item.lineCount,
    is_duplicate: item.isDuplicate ? 1 : 0,
  }));
  if (rows.length > 0) {
    ingestStructuredRecords(
      'antigravity_context_telemetry',
      'json',
      rows,
      `${DATA_PATHS.globalSkillsDir} + ${DATA_PATHS.tjtoSkillsDir}`
    );
  }

  // Also register conversation_summaries.db if present and has tables
  if (fs.existsSync(DATA_PATHS.conversationSummariesDb)) {
    try {
      const extDb = new DatabaseSync(DATA_PATHS.conversationSummariesDb, { open: true });
      const tables = extDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all() as { name: string }[];
      extDb.close();
      if (tables.length > 0) {
        const firstTable = sanitizeIdentifier(tables[0].name);
        const id = 'ds_antigravity_conversations_sqlite';
        datasets.set(id, {
          id,
          name: 'conversation_summaries.db (SQLite)',
          format: 'sqlite',
          originPath: DATA_PATHS.conversationSummariesDb,
          tableName: firstTable,
          dbPath: DATA_PATHS.conversationSummariesDb,
          transformations: [
            'Mounted native SQLite database ~/.gemini/antigravity/conversation_summaries.db',
            'Enforced strict read-only SELECT/WITH query guard',
          ],
        });
      }
    } catch {
      // ignore if locked
    }
  }

  // Save sample CSV in backups for 1-click user testing
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}
