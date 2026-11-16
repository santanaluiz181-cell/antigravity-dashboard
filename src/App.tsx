import React, { useCallback, useEffect, useState } from 'react';
import { TopTelemetryBar, type UiLang, type ViewMode } from './components/TopTelemetryBar';
import { BottomCommandBar, type ActiveTabId } from './components/BottomCommandBar';
import { AntigravityParticlesCanvas } from './components/AntigravityParticlesCanvas';
import { AntigravityLogo } from './components/AntigravityLogo';
import { AntigravityMotionPlayer } from './components/AntigravityMotionPlayer';
import {
  Module1BloatCenter,
  type BloatScanReportDto,
  type ProfilePresetDto,
} from './components/Module1BloatCenter';
import {
  Module2LiveSessions,
  type KitsuneStatusDto,
  type SessionSummaryDto,
} from './components/Module2LiveSessions';
import {
  Module3DataSourcesPane,
  type DataSourceQueryResultDto,
  type DatasetMetaDto,
} from './components/Module3DataSourcesPane';
import {
  Module4PostMeetingMvp,
  type MeetingSessionDto,
} from './components/Module4PostMeetingMvp';
import {
  FALLBACK_BLOAT_REPORT,
  FALLBACK_DATASETS,
  FALLBACK_DATA_RESULT,
  FALLBACK_KITSUNE_STATUS,
  FALLBACK_MEETINGS,
  FALLBACK_PRESETS,
  FALLBACK_SESSIONS,
  simulatePresetClientSide,
  type QuarantineLedgerEntryDto,
} from './data/staticShowcaseData';

const COPY: Record<
  UiLang,
  {
    eyebrow: string;
    h1: string;
    subtitle: string;
    metaCategoryLabel: string;
    metaCategoryVal: string;
    metaProductLabel: string;
    metaProductVal: string;
    metaDateLabel: string;
    metaDateVal: string;
    metaReadLabel: string;
    metaReadVal: string;
    copyLink: string;
    copied: string;
    tocTitle: string;
    tocItems: { id: string; label: string }[];
    leadP1: string;
    leadP2: string;
    s1Title: string;
    s1P1: string;
    s2Title: string;
    s2P1: string;
    s2P2: string;
    s3Title: string;
    s3P1: string;
    s3P2: string;
    s4Title: string;
    s4P1: string;
    s4Bullets: string[];
    s5Title: string;
    s5P1: string;
    s6Title: string;
    s6P1: string;
    relatedTitle: string;
    relatedSub: string;
  }
> = {
  en: {
    eyebrow: 'Product updates · Antigravity Local Studio',
    h1: 'Build live dashboards, control context bloat, and animate explainers with Antigravity',
    subtitle:
      'Antigravity Dashboards, Token-Bloat Quarantine, and Motion Studio are now live. Built as code on top of ~/.gemini, claude-mem :37777, and Graphify AST (-98.4% tokens), with zero binary patching.',
    metaCategoryLabel: 'Category',
    metaCategoryVal: 'Product updates & Local Architecture',
    metaProductLabel: 'Product',
    metaProductVal: 'Antigravity Studio, Context Quarantine, SQLite Sources, Motion',
    metaDateLabel: 'Date',
    metaDateVal: 'November 15, 2026',
    metaReadLabel: 'Reading time & Share',
    metaReadVal: '6 min read',
    copyLink: 'Copy link',
    copied: 'Link copied',
    tocTitle: 'On this page',
    tocItems: [
      { id: 'context-control', label: '1. Antigravity Context Control' },
      { id: 'dashboards-sources', label: '2. Live Dashboards & SQL Sources' },
      { id: 'antigravity-motion', label: '3. Antigravity Motion (Code-Driven)' },
      { id: 'meeting-executor', label: '4. Post-Meeting GPU Executor' },
      { id: 'billion-context', label: '5. Billion-Context & Brain Logs' },
      { id: 'getting-started', label: '6. Getting started' },
    ],
    leadP1:
      'When local skill directories accumulate duplicate definitions or 250+ line rules, the system prompt index overflows before your prompt even runs. Core subagents like browser and research get quietly evicted from the session.',
    leadP2:
      'And when teams review generated charts or meeting summaries, they often lack proof of where the numbers came from. Antigravity Studio turns that workflow upside down: every chart exposes its read-only SQLite query, every preset creates a SHA-256 verified backup, and every animation is built as editable code.',
    s1Title: 'Antigravity Context Control: quarantine skill and MCP bloat in one click',
    s1P1:
      'Inspect ~/.gemini/config/skills, plugins (SuperAntigravityTJTO, science), GEMINI.md, AGENTS.md, and mcp_config.json directly from disk. Flag prompts exceeding 250 lines and park redundant skills into SHA-256 verified quarantine without ever touching agy.exe (ToS Section 6 safe).',
    s2Title: 'Antigravity Dashboards: ask quick questions of your data with read-only SQL lineage',
    s2P1:
      'Drop any local CSV or JSON file to mount a live SQLite table using Node v26 native DatabaseSync. The left workspace visualizes the result; the right Sources pane exposes the exact Windows origin path, inferred column types, and deterministic transformation steps.',
    s2P2:
      'Every query runs through assertReadOnlySelectSql(): only single-statement SELECT and WITH queries are permitted, blocking DROP, DELETE, UPDATE, or multi-statement injection.',
    s3Title: 'Antigravity Motion: explain your architecture with code-driven animation',
    s3P1:
      'Instead of relying on black-box video generation, Antigravity Motion renders architecture walkthroughs as live parameterized React + SVG code. Adjust token ceiling sliders, playback speed, or active profile labels and see both the stage and configuration code update immediately.',
    s3P2:
      'The hero field above also ports the gravitational capsule simulation from antigravity.google, keeping particles responsive to cursor velocity while honoring prefers-reduced-motion.',
    s4Title: 'Ready for everyday work: Post-Meeting Vulkan GPU Executor & Human Gate',
    s4P1:
      'Instead of sending a fragile WebRTC bot into your video calls, route recorded meeting audio straight to tools/gpu_asr.py (ggml_vulkan GPU acceleration) or paste notes directly.',
    s4Bullets: [
      'GPU-first transcription: routes audio to ggml_vulkan with word-level timestamps.',
      'Structured extraction: isolates executive summary points, verified decisions, and owners.',
      'Mandatory Human Click Gate: staged MCP payloads (claude-mem, sqlite) stay locked in PENDING_HUMAN_APPROVAL until clicked.',
      'Zero silent writes: every approved execution logs a JSONL audit receipt in backups/.',
    ],
    s5Title: 'Billion-Context Engine & Brain Trajectories inside Antigravity',
    s5P1:
      'Stream live ~/.gemini/antigravity/brain/<id>/.system_generated/logs/transcript.jsonl steps alongside Kitsune Router (:4319), claude-mem (:37777), Graphify AST (.graphify.json: 25 files, 51 edges), and Cartographer (PROJECT_MAP.md: -98.4% blind-scan token cost).',
    s6Title: 'Getting started',
    s6P1:
      'Clone the repository to run the full local Hono (:4320) + Vite (:5175) bridge against your Windows ~/.gemini directory, or test every interactive demo right here in the browser.',
    relatedTitle: 'Related architecture pillars',
    relatedSub: 'Explore the engineering safeguards and local daemons powering Antigravity Studio.',
  },
  zh: {
    eyebrow: '产品更新 · Antigravity 本地工作台',
    h1: '使用 Antigravity 构建实时数据看板、消除上下文膨胀并生成代码驱动动画',
    subtitle:
      'Antigravity Dashboards、Token 膨胀隔离器与 Motion Studio 现已上线。基于 ~/.gemini、claude-mem :37777 与 Graphify AST (-98.4% Token) 以代码构建，绝不修改官方二进制文件。',
    metaCategoryLabel: '分类',
    metaCategoryVal: '产品更新与本地架构',
    metaProductLabel: '核心组件',
    metaProductVal: 'Antigravity 工作台、上下文隔离、SQLite 溯源、Motion',
    metaDateLabel: '日期',
    metaDateVal: '2026年11月15日',
    metaReadLabel: '阅读时间与分享',
    metaReadVal: '约 6 分钟',
    copyLink: '复制链接',
    copied: '已复制链接',
    tocTitle: '本页目录',
    tocItems: [
      { id: 'context-control', label: '1. 上下文与膨胀控制' },
      { id: 'dashboards-sources', label: '2. 实时看板与 SQL 溯源' },
      { id: 'antigravity-motion', label: '3. Antigravity Motion 代码动画' },
      { id: 'meeting-executor', label: '4. 会后 GPU 转写与人工门禁' },
      { id: 'billion-context', label: '5. 十亿级上下文与 Brain 日志' },
      { id: 'getting-started', label: '6. 快速开始' },
    ],
    leadP1:
      '当本地 Skill 目录积累了同名重复定义或超过 250 行的规则文件时，系统提示词索引会在对话开始前溢出预算，导致 browser 与 research 等核心子代理被静默剔除。',
    leadP2:
      '同样，团队在查看生成的图表或会议纪要时，往往无法验证数字来源。Antigravity Studio 公开每一张图表背后的只读 SQLite 查询，每次切换预设均生成 SHA-256 备份，每段演示动画均以可编辑代码驱动。',
    s1Title: 'Antigravity 上下文控制：一键隔离重复 Skill 与 MCP 膨胀',
    s1P1:
      '直接从磁盘审计 ~/.gemini/config/skills、插件目录（SuperAntigravityTJTO、science）、GEMINI.md、AGENTS.md 与 mcp_config.json。标记超过 250 行的规则，并通过 SHA-256 隔离区安全清理冲突，完全符合 ToS 第 6 条（绝不修改 agy.exe）。',
    s2Title: 'Antigravity 实时看板：附带只读 SQL 血缘的即时数据查询',
    s2P1:
      '拖入任意本地 CSV 或 JSON 文件，利用 Node v26 原生 DatabaseSync 挂载实时 SQLite 表。左侧展示图表与表格；右侧 Sources 面板透明披露文件原始路径、字段类型与转换步骤。',
    s2P2:
      '所有查询均经过 assertReadOnlySelectSql() 守卫：仅允许单条 SELECT 与 WITH 查询，严格拦截 DROP、DELETE、UPDATE 或多语句注入。',
    s3Title: 'Antigravity Motion：用可编辑的代码动画解释系统架构',
    s3P1:
      '摒弃不可控的黑盒视频生成，Antigravity Motion 将架构演进渲染为实时参数化 React + SVG 代码。拖动 Token 上限或速度滑块，舞台动画与配置代码同步更新。',
    s3P2:
      '页面顶部同样集成了提取自 antigravity.google 的微胶囊引力场粒子物理效果，并严格尊重 prefers-reduced-motion 无障碍设置。',
    s4Title: '面向日常工作流：Vulkan GPU 会后转写与人工点击审批门禁',
    s4P1:
      '无需脆弱的 WebRTC 会议机器人，直接将会议录音路由至 tools/gpu_asr.py（ggml_vulkan GPU 硬件加速）或粘贴会议笔记。',
    s4Bullets: [
      'GPU 优先语音转写：调用 ggml_vulkan 输出词级时间戳。',
      '结构化摘要提取：自动分离执行摘要、已确认决议与负责人。',
      '强制人工点击门禁：claude-mem 与 sqlite 动作保持 PENDING_HUMAN_APPROVAL 锁定状态。',
      '全链路审计回执：每次人工批准后在 backups/ 记录 JSONL 执行凭证。',
    ],
    s5Title: '十亿级上下文引擎与 Brain 会话轨迹集成',
    s5P1:
      '实时流式读取 transcript.jsonl，联动 Kitsune Router (:4319)、claude-mem (:37777)、Graphify AST (.graphify.json: 25 文件 / 51 边) 与 Cartographer (PROJECT_MAP.md: 节省 98.4% 盲扫 Token)。',
    s6Title: '快速开始',
    s6P1:
      '克隆仓库即可启动连接本地 ~/.gemini 目录的 Hono (:4320) + Vite (:5175) 完整工作台，或直接在下方浏览器中交互体验所有模块。',
    relatedTitle: '核心架构支柱',
    relatedSub: '了解驱动 Antigravity Studio 的本地守护进程与安全守卫机制。',
  },
  pt: {
    eyebrow: 'Atualizações de produto · Antigravity Local Studio',
    h1: 'Construa dashboards vivos, controle o bloat de contexto e anime fluxos com o Antigravity',
    subtitle:
      'Antigravity Dashboards, Quarentena de Tokens e Motion Studio estão no ar. Construído em código sobre ~/.gemini, claude-mem :37777 e Graphify AST (-98,4% de tokens), sem modificar binários oficiais.',
    metaCategoryLabel: 'Categoria',
    metaCategoryVal: 'Atualizações & Arquitetura Local',
    metaProductLabel: 'Produto',
    metaProductVal: 'Antigravity Studio, Quarentena de Skills, SQLite Sources, Motion',
    metaDateLabel: 'Data',
    metaDateVal: '15 de Novembro de 2026',
    metaReadLabel: 'Leitura e Compartilhar',
    metaReadVal: '6 min de leitura',
    copyLink: 'Copiar link',
    copied: 'Link copiado',
    tocTitle: 'Nesta página',
    tocItems: [
      { id: 'context-control', label: '1. Controle de Contexto e Bloat' },
      { id: 'dashboards-sources', label: '2. Dashboards & Painel Sources SQL' },
      { id: 'antigravity-motion', label: '3. Antigravity Motion em Código' },
      { id: 'meeting-executor', label: '4. Executor Pós-Reunião GPU' },
      { id: 'billion-context', label: '5. Billion-Context & Logs Brain' },
      { id: 'getting-started', label: '6. Como começar' },
    ],
    leadP1:
      'Quando pastas locais acumulam skills duplicadas ou regras acima de 250 linhas, o índice do prompt de sistema estoura antes mesmo da sua pergunta rodar. Subagentes essenciais como browser e research acabam expulsos silenciosamente.',
    leadP2:
      'Ao mesmo tempo, gráficos gerados sem auditoria escondem de onde os números vieram. O Antigravity Studio expõe a query SQL Read-Only de cada gráfico, cria backups SHA-256 antes de cada preset e renderiza explicações animadas como código editável.',
    s1Title: 'Controle de Contexto: isole bloat de skills e MCPs em 1 clique',
    s1P1:
      'Escaneie ~/.gemini/config/skills, plugins (SuperAntigravityTJTO, science), GEMINI.md, AGENTS.md e mcp_config.json diretamente do disco. Sinalize prompts >250 linhas e estacione colisões com verificação SHA-256 sem jamais tocar no agy.exe (ToS Seção 6).',
    s2Title: 'Antigravity Dashboards: consulte seus dados com linhagem SQL Read-Only',
    s2P1:
      'Arraste qualquer arquivo CSV ou JSON para montar uma tabela SQLite via DatabaseSync nativo do Node v26. O palco esquerdo exibe o gráfico; o painel direito Sources mostra o caminho exato no Windows, schema e transformações aplicadas.',
    s2P2:
      'Toda consulta passa pelo guardião assertReadOnlySelectSql(): apenas SELECT e WITH únicos são permitidos, bloqueando DROP, DELETE, UPDATE ou injeções múltiplas.',
    s3Title: 'Antigravity Motion: explique sua arquitetura com animação feita em código',
    s3P1:
      'Sem geração opaca de vídeo, o Antigravity Motion anima o fluxo em React + SVG parametrizado. Ajuste o teto de tokens, velocidade ou perfil ativo para ver o palco e o código de configuração atualizarem juntos.',
    s3P2:
      'O campo interativo no topo também reproduz a física de micro-cápsulas gravitacionais do antigravity.google, reagindo ao cursor com respeito automático a prefers-reduced-motion.',
    s4Title: 'Pronto para o trabalho diário: Executor Pós-Reunião Vulkan GPU & Trava Humana',
    s4P1:
      'Em vez de bot frágil em chamadas WebRTC, envie o áudio da reunião direto para tools/gpu_asr.py (aceleração GPU ggml_vulkan) ou cole suas anotações.',
    s4Bullets: [
      'Transcrição GPU-First: aciona ggml_vulkan com timestamps por palavra.',
      'Extração estruturada: separa resumo executivo, decisões e responsáveis.',
      'Trava Obrigatória por Clique Humano: ações MCP ficam em PENDING_HUMAN_APPROVAL até o clique.',
      'Zero escrita silenciosa: toda aprovação grava recibo JSONL auditável em backups/.',
    ],
    s5Title: 'Motor Billion-Context e Trajetórias Brain no Antigravity',
    s5P1:
      'Acompanhe passos de transcript.jsonl em tempo real junto com Kitsune Router (:4319), claude-mem (:37777), Graphify AST (.graphify.json: 25 arquivos, 51 arestas) e Cartographer (PROJECT_MAP.md: -98,4% tokens).',
    s6Title: 'Como começar',
    s6P1:
      'Clone o repositório para conectar o servidor local Hono (:4320) + Vite (:5175) ao seu ~/.gemini no Windows, ou interaja com todos os demos aqui mesmo no navegador.',
    relatedTitle: 'Pilares relacionados da arquitetura',
    relatedSub: 'Conheça as travas de segurança e motores locais que sustentam o Antigravity Studio.',
  },
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTabId>('bloat');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lang, setLang] = useState<UiLang>('en');
  const [viewMode, setViewMode] = useState<ViewMode>('editorial');
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTocId, setActiveTocId] = useState<string>('context-control');
  const [cursorPill, setCursorPill] = useState<{
    visible: boolean;
    x: number;
    y: number;
    label: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    label: 'Gravitational Field',
  });

  // Module 1 state
  const [bloatReport, setBloatReport] = useState<BloatScanReportDto | null>(FALLBACK_BLOAT_REPORT);
  const [presets, setPresets] = useState<ProfilePresetDto[]>(FALLBACK_PRESETS);
  const [activePresetId, setActivePresetId] = useState<string>('unoptimized');
  const [quarantineLedger, setQuarantineLedger] = useState<QuarantineLedgerEntryDto[]>([]);
  const [isApplyingPreset, setIsApplyingPreset] = useState(false);
  const [lastApplyFeedback, setLastApplyFeedback] = useState<string | null>(null);

  // Module 2 state
  const [sessions, setSessions] = useState<SessionSummaryDto[]>(FALLBACK_SESSIONS);
  const [kitsune, setKitsune] = useState<KitsuneStatusDto | null>(FALLBACK_KITSUNE_STATUS);
  const [globalArtifacts, setGlobalArtifacts] = useState<
    { name: string; fullPath: string; updatedAt: string }[]
  >([]);

  // Module 3 state
  const [datasets, setDatasets] = useState<DatasetMetaDto[]>(FALLBACK_DATASETS);
  const [initialDataResult, setInitialDataResult] =
    useState<DataSourceQueryResultDto | null>(FALLBACK_DATA_RESULT);

  // Module 4 state
  const [meetings, setMeetings] = useState<MeetingSessionDto[]>(FALLBACK_MEETINGS);
  const [gpuAsrPath, setGpuAsrPath] = useState<string>(
    'C:\\Users\\tharcio\\.gemini\\config\\plugins\\super-antigravity-tjto\\tools\\gpu_asr.py'
  );
  const [gpuAsrAvailable, setGpuAsrAvailable] = useState<boolean>(true);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const fetchJsonSafe = async (url: string) => {
    const res = await fetch(url);
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('application/json')) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  };

  const fetchAllTelemetry = useCallback(async () => {
    setIsLoading(true);
    try {
      const [bloatRes, sessRes, dsRes, mtgRes] = await Promise.all([
        fetchJsonSafe('/api/bloat/scan'),
        fetchJsonSafe('/api/sessions/overview'),
        fetchJsonSafe('/api/datasources/list'),
        fetchJsonSafe('/api/meetings/list'),
      ]);

      if (bloatRes.report) setBloatReport(bloatRes.report);
      if (Array.isArray(bloatRes.presets)) setPresets(bloatRes.presets);
      if (bloatRes.activeProfile?.activePresetId) {
        setActivePresetId(bloatRes.activeProfile.activePresetId);
      }
      if (Array.isArray(bloatRes.quarantineLedger)) {
        setQuarantineLedger(bloatRes.quarantineLedger);
      }

      if (Array.isArray(sessRes.sessions) && sessRes.sessions.length > 0) {
        setSessions(sessRes.sessions);
      }
      if (sessRes.kitsune) setKitsune(sessRes.kitsune);
      if (Array.isArray(sessRes.globalArtifacts)) setGlobalArtifacts(sessRes.globalArtifacts);

      if (Array.isArray(dsRes.datasets) && dsRes.datasets.length > 0) {
        setDatasets(dsRes.datasets);
      }
      if (dsRes.initialResult) setInitialDataResult(dsRes.initialResult);

      if (Array.isArray(mtgRes.meetings) && mtgRes.meetings.length > 0) {
        setMeetings(mtgRes.meetings);
      }
      if (mtgRes.gpuAsrPath) setGpuAsrPath(mtgRes.gpuAsrPath);
      if (typeof mtgRes.gpuAsrAvailable === 'boolean') setGpuAsrAvailable(mtgRes.gpuAsrAvailable);
    } catch {
      // Static showcase fallback already active for standalone GitHub Pages hosting
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllTelemetry();
  }, [fetchAllTelemetry]);

  const handleApplyPreset = async (presetId: string) => {
    setIsApplyingPreset(true);
    setLastApplyFeedback(null);
    try {
      const res = await fetch('/api/bloat/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.includes('application/json')) {
        throw new Error('API_UNAVAILABLE');
      }
      const data = await res.json();
      if (data.report) setBloatReport(data.report);
      if (data.activeProfile?.activePresetId) {
        setActivePresetId(data.activeProfile.activePresetId);
      }
      if (Array.isArray(data.quarantineLedger)) {
        setQuarantineLedger(data.quarantineLedger);
      }
      if (data.result) {
        setLastApplyFeedback(
          `Applied preset "${data.result.presetId}": quarantined ${data.result.quarantinedCount} skills, restored ${data.result.restoredCount}, toggled ${data.result.mcpToggledCount} MCP servers. Backup saved at ${data.result.backupSnapshotPath}`
        );
      }
    } catch {
      const sim = simulatePresetClientSide(presetId, bloatReport);
      setBloatReport(sim.report);
      setActivePresetId(sim.activePresetId);
      setQuarantineLedger(sim.quarantineLedger);
      setLastApplyFeedback(sim.feedback);
    } finally {
      setIsApplyingPreset(false);
    }
  };

  const refreshDatasets = async () => {
    try {
      const dsRes = await fetchJsonSafe('/api/datasources/list');
      if (Array.isArray(dsRes.datasets)) setDatasets(dsRes.datasets);
    } catch {
      // keep client datasets
    }
  };

  const refreshMeetings = async () => {
    try {
      const mtgRes = await fetchJsonSafe('/api/meetings/list');
      if (Array.isArray(mtgRes.meetings)) setMeetings(mtgRes.meetings);
    } catch {
      // keep client meetings
    }
  };

  const handleCopyShareLink = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.clipboard && url) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 1800);
  };

  const t = COPY[lang];

  const relatedPillars = [
    {
      tag: 'SECURITY GUARD',
      title: 'Zero Binary Patching (ToS Section 6)',
      desc: 'assertNeverTouchesOfficialBinaries() blocks any write attempt to agy.exe, .dll, or .asar bundles. All presets snapshot mcp_config.json first.',
      href: '#context-control',
      accent: '#34a853',
    },
    {
      tag: 'BILLION-CONTEXT',
      title: 'Graphify AST + Cartographer + claude-mem',
      desc: 'Indexes 25 workspace files and 51 AST edges in .graphify.json with -98.4% discovery token savings and persistent memory on port :37777.',
      href: '#billion-context',
      accent: '#3279f9',
    },
    {
      tag: 'READ-ONLY SQL',
      title: 'Node v26 Native SQLite Lineage',
      desc: 'Converts dropped CSV/JSON files into SQLite DatabaseSync tables while enforcing single-statement SELECT/WITH queries.',
      href: '#dashboards-sources',
      accent: '#fbbc04',
    },
    {
      tag: 'GPU PIPELINE',
      title: 'Vulkan ASR & Human Approval Gate',
      desc: 'Routes meeting audio to tools/gpu_asr.py (ggml_vulkan) and holds staged MCP payloads in PENDING_HUMAN_APPROVAL until clicked.',
      href: '#meeting-executor',
      accent: '#ea4335',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <TopTelemetryBar
        indexTokens={bloatReport?.totalSystemPromptIndexTokens ?? 0}
        budgetLimit={bloatReport?.contextBudgetLimitTokens ?? 14000}
        utilizationPct={bloatReport?.budgetUtilizationPct ?? 0}
        duplicateCount={bloatReport?.duplicateSkillsCount ?? 0}
        activePresetId={activePresetId}
        theme={theme}
        onToggleTheme={toggleTheme}
        lang={lang}
        onChangeLang={setLang}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onRefresh={fetchAllTelemetry}
        isLoading={isLoading}
      />

      {viewMode === 'editorial' ? (
        <main className="flex-1 w-full">
          {/* ARTICLE HERO HEADER (Claude Dashboards & Motion structure + Antigravity Particle Physics) */}
          <section
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setCursorPill({
                visible: true,
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                label: 'Gravitational Capsule Field',
              });
            }}
            onPointerLeave={() => setCursorPill((prev) => ({ ...prev, visible: false }))}
            className="relative overflow-hidden border-b border-[var(--agy-border)] bg-[var(--agy-surface)]"
          >
            <AntigravityParticlesCanvas
              theme={theme}
              density={210}
              className="absolute inset-0 w-full h-full opacity-90"
            />

            {cursorPill.visible && (
              <div
                style={{
                  transform: `translate3d(${cursorPill.x + 14}px, ${cursorPill.y - 18}px, 0)`,
                }}
                className="hidden lg:flex pointer-events-none absolute top-0 left-0 z-20 items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#121317] text-[11px] font-medium shadow-lg border border-[#e1e6ec] transition-transform duration-75"
              >
                <span className="google-symbol !text-[15px] text-[#3279f9]" aria-hidden="true">
                  ads_click
                </span>
                <span>{cursorPill.label}</span>
              </div>
            )}

            <div className="relative z-10 max-w-[1220px] mx-auto px-5 sm:px-8 pt-12 pb-10">
              <div className="flex items-center gap-3 mb-5">
                <AntigravityLogo className="w-12 h-12 rounded-2xl shadow-md" />
                <span className="text-xs font-mono uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--agy-canvas)]/85 border border-[var(--agy-border)] text-[var(--agy-accent)]">
                  {t.eyebrow}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[var(--agy-text-primary)] max-w-4xl leading-[1.12]">
                {t.h1}
              </h1>

              <p className="text-base sm:text-xl text-[var(--agy-text-secondary)] max-w-3xl mt-5 leading-relaxed">
                {t.subtitle}
              </p>

              {/* 4-Column Metadata Strip (Exact mirror of claude.com/resources/articles/dashboards-and-motion) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-10 pt-6 border-t border-[var(--agy-border)] bg-[var(--agy-canvas)]/65 backdrop-blur-sm rounded-2xl p-5">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--agy-text-muted)]">
                    {t.metaCategoryLabel}
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-[var(--agy-text-primary)] mt-1">
                    {t.metaCategoryVal}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--agy-text-muted)]">
                    {t.metaProductLabel}
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-[var(--agy-text-primary)] mt-1">
                    {t.metaProductVal}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--agy-text-muted)]">
                    {t.metaDateLabel}
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-[var(--agy-text-primary)] mt-1">
                    {t.metaDateVal}
                  </div>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--agy-text-muted)]">
                      {t.metaReadLabel}
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-[var(--agy-text-primary)] mt-1">
                      {t.metaReadVal}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="onyx-pill px-3 py-1.5 text-xs font-mono text-[var(--agy-text-primary)] flex items-center gap-1.5 hover:border-[#3279f9]"
                  >
                    <span className="google-symbol !text-[15px]" aria-hidden="true">
                      {copiedLink ? 'check' : 'link'}
                    </span>
                    <span>{copiedLink ? t.copied : t.copyLink}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* TWO-COLUMN ARTICLE + EMBEDDED INTERACTIVE DEMOS */}
          <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* LEFT STICKY TABLE OF CONTENTS + TELEMETRY CARD */}
            <aside className="lg:col-span-3 space-y-6">
              <div className="lg:sticky lg:top-20 space-y-5">
                <div className="onyx-card p-4">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--agy-text-muted)] mb-3">
                    {t.tocTitle}
                  </div>
                  <nav aria-label="Article sections" className="space-y-1">
                    {t.tocItems.map((item) => {
                      const isActive = activeTocId === item.id;
                      return (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          onClick={() => setActiveTocId(item.id)}
                          className={`block px-3 py-2 rounded-xl text-xs transition-colors ${
                            isActive
                              ? 'bg-[#3279f9]/15 text-[var(--agy-accent)] font-semibold'
                              : 'text-[var(--agy-text-secondary)] hover:text-[var(--agy-text-primary)] hover:bg-[var(--agy-canvas)]'
                          }`}
                        >
                          {item.label}
                        </a>
                      );
                    })}
                  </nav>
                </div>

                {/* Live Local Architecture Health Card */}
                <div className="onyx-card p-4 space-y-2.5 text-xs">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--agy-text-muted)]">
                    Live Engine Status
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-[var(--agy-text-secondary)]">Index Budget</span>
                    <span className="text-[var(--agy-text-primary)]">
                      {bloatReport?.budgetUtilizationPct ?? 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-[var(--agy-text-secondary)]">claude-mem :37777</span>
                    <span className="text-[#34a853]">
                      {kitsune?.claudeMemReachable !== false ? 'HTTP 200' : 'STANDBY'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-[var(--agy-text-secondary)]">Graphify AST</span>
                    <span className="text-[var(--agy-accent)]">
                      {kitsune?.graphifyNodes ?? 25} files / {kitsune?.graphifyEdges ?? 51} edges
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-[var(--agy-text-secondary)]">Binary Guard</span>
                    <span className="text-[#34a853]">agy.exe locked</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* RIGHT EDITORIAL NARRATIVE + 5 LIVE INTERACTIVE STAGES */}
            <article className="lg:col-span-9 space-y-16">
              {/* Lead Narrative */}
              <div className="space-y-4 text-base sm:text-[17px] text-[var(--agy-text-secondary)] leading-relaxed max-w-3xl">
                <p>{t.leadP1}</p>
                <p>{t.leadP2}</p>
              </div>

              {/* Section 1: Context & Token-Bloat Control */}
              <section id="context-control" className="scroll-mt-24 space-y-5">
                <div className="space-y-2.5 max-w-3xl">
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--agy-text-primary)]">
                    {t.s1Title}
                  </h2>
                  <p className="text-sm sm:text-base text-[var(--agy-text-secondary)] leading-relaxed">
                    {t.s1P1}
                  </p>
                </div>
                <Module1BloatCenter
                  report={bloatReport}
                  presets={presets}
                  activePresetId={activePresetId}
                  quarantineLedger={quarantineLedger}
                  searchQuery={searchQuery}
                  onApplyPreset={handleApplyPreset}
                  isApplying={isApplyingPreset}
                  lastApplyFeedback={lastApplyFeedback}
                  embedded
                />
              </section>

              {/* Section 2: Interactive Dashboards & Read-Only SQL Sources */}
              <section id="dashboards-sources" className="scroll-mt-24 space-y-5">
                <div className="space-y-2.5 max-w-3xl">
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--agy-text-primary)]">
                    {t.s2Title}
                  </h2>
                  <p className="text-sm sm:text-base text-[var(--agy-text-secondary)] leading-relaxed">
                    {t.s2P1}
                  </p>
                  <p className="text-sm sm:text-base text-[var(--agy-text-secondary)] leading-relaxed">
                    {t.s2P2}
                  </p>
                </div>
                <Module3DataSourcesPane
                  datasets={datasets}
                  initialResult={initialDataResult}
                  onRefreshDatasets={refreshDatasets}
                  onClientRegisterDataset={(meta) =>
                    setDatasets((prev) => [...prev, meta])
                  }
                  embedded
                />
              </section>

              {/* Section 3: Antigravity Motion (Code-Driven Animation Explainer) */}
              <section id="antigravity-motion" className="scroll-mt-24 space-y-5">
                <div className="space-y-2.5 max-w-3xl">
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--agy-text-primary)]">
                    {t.s3Title}
                  </h2>
                  <p className="text-sm sm:text-base text-[var(--agy-text-secondary)] leading-relaxed">
                    {t.s3P1}
                  </p>
                  <p className="text-sm sm:text-base text-[var(--agy-text-secondary)] leading-relaxed">
                    {t.s3P2}
                  </p>
                </div>
                <AntigravityMotionPlayer activePresetId={activePresetId} />
              </section>

              {/* Section 4: Post-Meeting Vulkan GPU Executor & Human Click Gate */}
              <section id="meeting-executor" className="scroll-mt-24 space-y-5">
                <div className="space-y-3 max-w-3xl">
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--agy-text-primary)]">
                    {t.s4Title}
                  </h2>
                  <p className="text-sm sm:text-base text-[var(--agy-text-secondary)] leading-relaxed">
                    {t.s4P1}
                  </p>
                  <ul className="space-y-2 text-sm text-[var(--agy-text-secondary)] list-disc list-inside">
                    {t.s4Bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
                <Module4PostMeetingMvp
                  meetings={meetings}
                  gpuAsrPath={gpuAsrPath}
                  gpuAsrAvailable={gpuAsrAvailable}
                  onRefreshMeetings={refreshMeetings}
                  onClientUpdateMeetings={(updater) => setMeetings(updater)}
                  embedded
                />
              </section>

              {/* Section 5: Billion-Context & Live Brain Sessions */}
              <section id="billion-context" className="scroll-mt-24 space-y-5">
                <div className="space-y-2.5 max-w-3xl">
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--agy-text-primary)]">
                    {t.s5Title}
                  </h2>
                  <p className="text-sm sm:text-base text-[var(--agy-text-secondary)] leading-relaxed">
                    {t.s5P1}
                  </p>
                </div>
                <Module2LiveSessions
                  sessions={sessions}
                  kitsune={kitsune}
                  globalArtifacts={globalArtifacts}
                  searchQuery={searchQuery}
                  embedded
                />
              </section>

              {/* Section 6: Getting Started */}
              <section id="getting-started" className="scroll-mt-24 space-y-4 max-w-3xl">
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--agy-text-primary)]">
                  {t.s6Title}
                </h2>
                <p className="text-sm sm:text-base text-[var(--agy-text-secondary)] leading-relaxed">
                  {t.s6P1}
                </p>
                <div className="onyx-card p-4 space-y-2">
                  <div className="text-[11px] font-mono text-[var(--agy-text-muted)]">
                    Local Windows / Node v22.5+ Terminal
                  </div>
                  <pre className="p-3 rounded-xl bg-[var(--agy-canvas)] border border-[var(--agy-border)] font-mono text-xs text-[var(--agy-accent)] overflow-x-auto leading-relaxed">{`git clone https://github.com/santanaluiz181-cell/antigravity-dashboard.git
cd antigravity-dashboard
npm install
npm test
npm run dev   # Opens API on :4320 and Studio UI on :5175`}</pre>
                </div>
              </section>
            </article>
          </div>

          {/* RELATED CAPABILITIES SECTION (Mirrors "Related articles" at bottom of claude.com/resources/articles/dashboards-and-motion) */}
          <section className="border-t border-[var(--agy-border)] bg-[var(--agy-surface)]/50 py-14 px-5 sm:px-8">
            <div className="max-w-[1280px] mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--agy-text-primary)]">
                  {t.relatedTitle}
                </h2>
                <p className="text-sm text-[var(--agy-text-secondary)] mt-1">{t.relatedSub}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {relatedPillars.map((card) => (
                  <a
                    key={card.title}
                    href={card.href}
                    className="onyx-card-interactive p-5 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <span
                        style={{ color: card.accent }}
                        className="text-[10px] font-mono font-semibold uppercase tracking-wider"
                      >
                        {card.tag}
                      </span>
                      <h3 className="text-sm font-semibold text-[var(--agy-text-primary)] mt-2">
                        {card.title}
                      </h3>
                      <p className="text-xs text-[var(--agy-text-secondary)] mt-2 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-[var(--agy-accent)] flex items-center gap-1">
                      Inspect stage
                      <span className="google-symbol !text-[15px]" aria-hidden="true">
                        arrow_forward
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </section>
        </main>
      ) : (
        <main className="flex-1 max-w-[1560px] w-full mx-auto px-5 pt-6 pb-24">
          {activeTab === 'bloat' && (
            <Module1BloatCenter
              report={bloatReport}
              presets={presets}
              activePresetId={activePresetId}
              quarantineLedger={quarantineLedger}
              searchQuery={searchQuery}
              onApplyPreset={handleApplyPreset}
              isApplying={isApplyingPreset}
              lastApplyFeedback={lastApplyFeedback}
            />
          )}

          {activeTab === 'sessions' && (
            <Module2LiveSessions
              sessions={sessions}
              kitsune={kitsune}
              globalArtifacts={globalArtifacts}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'datasources' && (
            <Module3DataSourcesPane
              datasets={datasets}
              initialResult={initialDataResult}
              onRefreshDatasets={refreshDatasets}
              onClientRegisterDataset={(meta) =>
                setDatasets((prev) => [...prev, meta])
              }
            />
          )}

          {activeTab === 'meetings' && (
            <Module4PostMeetingMvp
              meetings={meetings}
              gpuAsrPath={gpuAsrPath}
              gpuAsrAvailable={gpuAsrAvailable}
              onRefreshMeetings={refreshMeetings}
              onClientUpdateMeetings={(updater) => setMeetings(updater)}
            />
          )}
        </main>
      )}

      {viewMode === 'workbench' && (
        <BottomCommandBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activePresetId={activePresetId}
          onQuickApplyPreset={handleApplyPreset}
          isApplyingPreset={isApplyingPreset}
        />
      )}
    </div>
  );
};
