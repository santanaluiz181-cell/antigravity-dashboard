import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Code2,
  Database,
  Play,
  Upload,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export interface ColumnSchemaDto {
  name: string;
  type: string;
  sampleValue: string;
}

export interface DataSourceQueryResultDto {
  datasetId: string;
  datasetName: string;
  sourceFormat: 'csv' | 'json' | 'sqlite';
  originPath: string;
  tableName: string;
  executedSql: string;
  executionMs: number;
  totalRowsInTable: number;
  returnedRowsCount: number;
  columns: ColumnSchemaDto[];
  rows: Record<string, unknown>[];
  transformationsApplied: string[];
}

export interface DatasetMetaDto {
  id: string;
  name: string;
  format: string;
  tableName: string;
  originPath: string;
}

interface Module3Props {
  datasets: DatasetMetaDto[];
  initialResult: DataSourceQueryResultDto | null;
  onRefreshDatasets: () => void;
}

export const Module3DataSourcesPane: React.FC<Module3Props> = ({
  datasets,
  initialResult,
  onRefreshDatasets,
}) => {
  const [currentResult, setCurrentResult] = useState<DataSourceQueryResultDto | null>(initialResult);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(initialResult?.datasetId || '');
  const [sqlInput, setSqlInput] = useState<string>(initialResult?.executedSql || '');
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [metricCol, setMetricCol] = useState<string>('');
  const [labelCol, setLabelCol] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (initialResult && !currentResult) {
      setCurrentResult(initialResult);
      setSelectedDatasetId(initialResult.datasetId);
      setSqlInput(initialResult.executedSql);
    }
  }, [initialResult, currentResult]);

  useEffect(() => {
    if (!currentResult || currentResult.columns.length === 0) return;
    const textCol = currentResult.columns.find((c) => c.type === 'TEXT')?.name || currentResult.columns[0].name;
    const numCol =
      currentResult.columns.find((c) => c.type === 'INTEGER' || c.type === 'REAL')?.name ||
      currentResult.columns[Math.min(1, currentResult.columns.length - 1)].name;
    setLabelCol(textCol);
    setMetricCol(numCol);
  }, [currentResult]);

  const handleRunSql = async (datasetIdToRun = selectedDatasetId, queryToRun = sqlInput) => {
    setSqlError(null);
    try {
      const res = await fetch('/api/datasources/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId: datasetIdToRun, sql: queryToRun }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setSqlError(data.error || 'SQL query error');
        return;
      }
      setCurrentResult(data.result);
      setSqlInput(data.result.executedSql);
    } catch (err) {
      setSqlError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSelectDataset = (dsId: string) => {
    setSelectedDatasetId(dsId);
    const meta = datasets.find((d) => d.id === dsId);
    if (meta) {
      const defaultQuery = `SELECT * FROM "${meta.tableName}" LIMIT 100`;
      setSqlInput(defaultQuery);
      handleRunSql(dsId, defaultQuery);
    }
  };

  const handleFileUpload = async (file: File) => {
    setSqlError(null);
    const text = await file.text();
    const isJson = file.name.toLowerCase().endsWith('.json');
    const res = await fetch('/api/datasources/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: file.name.replace(/\.[^.]+$/, ''),
        format: isJson ? 'json' : 'csv',
        content: text,
        originLabel: `Local File Drop: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      setSqlError(data.error || 'Failed to ingest file');
      return;
    }
    onRefreshDatasets();
    setCurrentResult(data.result);
    setSelectedDatasetId(data.result.datasetId);
    setSqlInput(data.result.executedSql);
  };

  const topChartRows = (currentResult?.rows || []).slice(0, 12);
  const maxMetricVal = Math.max(
    1,
    ...topChartRows.map((r) => {
      const n = Number(r[metricCol]);
      return Number.isFinite(n) ? n : 0;
    })
  );

  return (
    <div className="space-y-4 pb-24">
      {/* Top Dataset Selector + File Dropzone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="onyx-card p-4 lg:col-span-7 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9BA3B0] flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-[#8AB4F8]" />
              Mounted Local Data Sources ({datasets.length})
            </h3>
            <p className="text-xs text-[#9BA3B0] mt-1">
              Drop any <code className="text-[#E6EAF0]">.csv</code> or <code className="text-[#E6EAF0]">.json</code> file to convert into an in-memory SQLite table with live SQL + Sources lineage.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {datasets.map((ds) => (
              <button
                key={ds.id}
                onClick={() => handleSelectDataset(ds.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono border cursor-pointer transition-colors ${
                  selectedDatasetId === ds.id
                    ? 'bg-[#181E29] border-[#8AB4F8] text-[#E6EAF0]'
                    : 'bg-[#0B0D10] border-[#232832] text-[#9BA3B0] hover:text-[#E6EAF0]'
                }`}
              >
                {ds.name} ({ds.format.toUpperCase()})
              </button>
            ))}
          </div>
        </div>

        {/* Drag-and-drop CSV/JSON ingest */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFileUpload(f);
          }}
          className={`onyx-card-interactive p-4 lg:col-span-5 flex flex-col items-center justify-center text-center cursor-pointer border-dashed ${
            isDragging ? 'border-[#8AB4F8] bg-[#181E29]' : ''
          }`}
        >
          <Upload className="w-5 h-5 text-[#8AB4F8] mb-1.5" />
          <span className="text-xs font-medium text-[#E6EAF0]">
            Drop local CSV or JSON file here (or click to browse)
          </span>
          <span className="text-[11px] font-mono text-[#646D7A] mt-0.5">
            Auto-indexed in native Node v26 SQLite engine
          </span>
          <input
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
            }}
          />
        </label>
      </div>

      {/* Split Workspace: LEFT Interactive Chart + Grid (7 cols) | RIGHT Transparent "Sources" Inspector (5 cols) */}
      {currentResult && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT PANE: Interactive Chart & Data Grid */}
          <div className="onyx-card p-4 lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#232832] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#E6EAF0] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#8AB4F8]" />
                  {currentResult.datasetName} — Live Visualization
                </h3>
                <span className="text-[11px] font-mono text-[#646D7A]">
                  Showing {currentResult.returnedRowsCount} of {currentResult.totalRowsInTable} rows ·{' '}
                  {currentResult.executionMs} ms
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <label className="text-[#9BA3B0] font-mono text-[11px]">X:</label>
                <select
                  value={labelCol}
                  onChange={(e) => setLabelCol(e.target.value)}
                  className="bg-[#0B0D10] border border-[#232832] rounded px-2 py-1 text-xs text-[#E6EAF0]"
                >
                  {currentResult.columns.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <label className="text-[#9BA3B0] font-mono text-[11px]">Y:</label>
                <select
                  value={metricCol}
                  onChange={(e) => setMetricCol(e.target.value)}
                  className="bg-[#0B0D10] border border-[#232832] rounded px-2 py-1 text-xs text-[#E6EAF0]"
                >
                  {currentResult.columns.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Horizontal Bar Chart */}
            <div className="space-y-2 bg-[#0B0D10] border border-[#232832] rounded-lg p-3.5">
              {topChartRows.map((row, idx) => {
                const label = String(row[labelCol] ?? `Row ${idx + 1}`);
                const val = Number(row[metricCol]) || 0;
                const pct = Math.min(100, Math.max(2, Math.round((val / maxMetricVal) * 100)));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-[#E6EAF0] truncate max-w-[280px]">{label}</span>
                      <span className="text-[#8AB4F8]">{val.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-[#13161B] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#8AB4F8] rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto border border-[#232832] rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#0B0D10] text-[#9BA3B0] font-mono text-[11px] sticky top-0 border-b border-[#232832]">
                  <tr>
                    {currentResult.columns.map((col) => (
                      <th key={col.name} className="py-2 px-3">
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232832]">
                  {currentResult.rows.slice(0, 60).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#171B22]">
                      {currentResult.columns.map((col) => (
                        <td key={col.name} className="py-2 px-3 font-mono text-[11px] text-[#E6EAF0]">
                          {String(row[col.name] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT PANE: Transparent "Sources" & Transformation Inspector (Claude Dashboards Pattern) */}
          <div className="onyx-card p-4 lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#232832] pb-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8AB4F8] flex items-center gap-2">
                  <Code2 className="w-4 h-4" />
                  Sources &amp; Query Lineage Inspector
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D10] border border-[#232832] text-[#81C995]">
                  READ-ONLY SQL GUARD
                </span>
              </div>

              {/* Origin Path */}
              <div className="bg-[#0B0D10] border border-[#232832] rounded-lg p-3">
                <div className="text-[10px] font-mono uppercase text-[#646D7A]">Verified Data Origin</div>
                <div className="text-xs font-mono text-[#E6EAF0] mt-1 break-all">
                  {currentResult.originPath}
                </div>
                <div className="text-[11px] font-mono text-[#9BA3B0] mt-1">
                  SQLite Table: <code className="text-[#8AB4F8]">{currentResult.tableName}</code>
                </div>
              </div>

              {/* Live SQL Query Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-mono text-[#9BA3B0]">
                    Active Transformation Query (SELECT / WITH only)
                  </label>
                  <button
                    onClick={() => handleRunSql()}
                    className="px-2.5 py-1 rounded bg-[#8AB4F8] text-[#0B0D10] font-semibold text-[11px] flex items-center gap-1 cursor-pointer hover:bg-[#A3C5FA]"
                  >
                    <Play className="w-3 h-3" /> Run SQL
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={sqlInput}
                  onChange={(e) => setSqlInput(e.target.value)}
                  className="w-full bg-[#0B0D10] border border-[#232832] focus:border-[#8AB4F8] rounded-lg p-2.5 font-mono text-xs text-[#E6EAF0] outline-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <button
                    onClick={() => {
                      const q = `SELECT category, COUNT(*) as items, SUM(index_tokens) as total_index_tokens, SUM(full_tokens) as total_full_tokens FROM "${currentResult.tableName}" GROUP BY category ORDER BY total_index_tokens DESC`;
                      setSqlInput(q);
                      handleRunSql(selectedDatasetId, q);
                    }}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D10] border border-[#232832] text-[#9BA3B0] hover:text-[#E6EAF0] cursor-pointer"
                  >
                    Group by Category
                  </button>
                  <button
                    onClick={() => {
                      const q = `SELECT item_name, category, lines, full_tokens FROM "${currentResult.tableName}" WHERE lines > 250 ORDER BY lines DESC`;
                      setSqlInput(q);
                      handleRunSql(selectedDatasetId, q);
                    }}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D10] border border-[#232832] text-[#9BA3B0] hover:text-[#E6EAF0] cursor-pointer"
                  >
                    Filter &gt;250 Lines
                  </button>
                </div>
                {sqlError && (
                  <div className="mt-2 p-2.5 rounded bg-[#F28B82]/10 border border-[#F28B82]/30 text-xs text-[#F28B82] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{sqlError}</span>
                  </div>
                )}
              </div>

              {/* Transformation Pipeline Steps */}
              <div>
                <div className="text-[11px] font-mono text-[#9BA3B0] mb-1.5">
                  Deterministic Transformation Steps
                </div>
                <div className="space-y-1.5">
                  {currentResult.transformationsApplied.map((step, idx) => (
                    <div
                      key={idx}
                      className="bg-[#0B0D10] border border-[#232832] rounded px-2.5 py-1.5 text-[11px] text-[#E6EAF0] flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#81C995] shrink-0" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inferred Schema Table */}
              <div>
                <div className="text-[11px] font-mono text-[#9BA3B0] mb-1.5">
                  Schema &amp; Type Inference ({currentResult.columns.length} cols)
                </div>
                <div className="bg-[#0B0D10] border border-[#232832] rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="border-b border-[#232832] text-[#646D7A]">
                      <tr>
                        <th className="py-1.5 px-2.5">Column</th>
                        <th className="py-1.5 px-2.5">SQLite Type</th>
                        <th className="py-1.5 px-2.5">Sample</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1B2028]">
                      {currentResult.columns.map((c) => (
                        <tr key={c.name}>
                          <td className="py-1.5 px-2.5 text-[#E6EAF0]">{c.name}</td>
                          <td className="py-1.5 px-2.5 text-[#8AB4F8]">{c.type}</td>
                          <td className="py-1.5 px-2.5 text-[#9BA3B0] truncate max-w-[140px]">
                            {c.sampleValue}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
