# Antigravity Control & Data Studio (反重力上下文与数据工作台)

[English](../README.md) | [简体中文](./README.zh-CN.md) | [Português](./README.pt-BR.md)

面向 Google Antigravity 的本地独立控制台：用于审计上下文 Token 预算、清理重复 Skill 与 MCP 服务膨胀、实时查看 Brain 会话日志、验证只读 SQLite 数据溯源，以及通过 GPU 语音转写执行会后任务审批。

本项目作为独立本地 Web 服务运行（后端 `Hono` 监听 `:4320`，前端 `Vite / React 19` 监听 `:5175`）。**绝不修改或注入** `~/.gemini/bin/agy.exe` 及任何官方 `.asar` 二进制文件，完全符合 Google Antigravity 服务条款（ToS 第 6 条），零封号风险。

---

## 为什么需要这个工具

当 `~/.gemini/config/skills` 与插件目录（如 `SuperAntigravityTJTO`、`science`）中存在同名重复 Skill，或 `GEMINI.md` / `AGENTS.md` 规则文件超过 250 行时，系统提示词索引会超出上下文预算上限。一旦超限，Antigravity 会静默剔除关键子代理（如 `browser`、`research`）与核心技能（如 `super-render`、`ultimate-research`）。

本工作台直接扫描本地磁盘文件，计算每一项规则、Skill 和 MCP 服务的真实 Token 占用，并支持一键将冗余项移入经过 SHA-256 校验的隔离区。

---

## 四大核心模块

### 1. 上下文与 Token 膨胀控制中心 (Context & Bloat Control)
* 扫描 `~/.gemini/config/skills`、`~/.gemini/config/plugins/*/skills`、`~/.gemini/antigravity/builtin/skills`、`GEMINI.md`、`AGENTS.md` 及 `mcp_config.json`。
* 标记超过 `250 行` 的臃肿提示词，自动识别全局目录与插件目录之间的重复 Skill 冲突。
* 提供一键预设切换（`Coding Lean`、`Frontend Craft`、`Journalism & TJTO`、`Video / B-Roll`、`Full Restore`）：每次切换前自动在 `backups/` 生成 SHA-256 备份快照，支持随时无损还原。

### 2. 实时会话、Kitsune 路由与十亿级上下文引擎 (Live Sessions & Context Engines)
* 实时解析 `~/.gemini/antigravity/brain/<id>/.system_generated/logs/transcript.jsonl` 会话轨迹与工具调用链。
* 探测本地守护进程状态：**Kitsune Router** (`127.0.0.1:4319`)、**claude-mem 持久记忆库** (`127.0.0.1:37777`) 与 **MJ Notch Companion** (`127.0.0.1:49211`)。
* 集成 `.graphify.json`（`Graphify + PonyTail` AST 语法树图谱）与 `PROJECT_MAP.md`（`Cartographer` 静态符号映射，减少 98.3% 盲扫 Token 消耗）。
* 内置沙盒预览器，直接渲染 `/generative_ui` 生成的本地 HTML 工件。

### 3. 交互式数据看板与只读 SQL 溯源面板 (Data + Sources Inspector)
* 支持拖拽本地 `.csv` 或 `.json` 文件，利用 Node v26 原生 `node:sqlite` (`DatabaseSync`) 自动建表并推断字段类型。
* 左侧渲染交互式图表与数据表；右侧 `Sources` 面板透明展示原始文件路径、字段 Schema、转换步骤与实际执行的 SQL 语句。
* 内置严格只读 SQL 守卫 (`assertReadOnlySelectSql`)：仅允许单条 `SELECT` 或 `WITH` 查询，任何 `DROP`、`DELETE`、`UPDATE` 或多语句注入均被直接拦截。

### 4. 会后任务执行器 (Post-Meeting Executor MVP)
* 无需脆弱的 WebRTC 会议机器人：上传会议音频后直接交由本地 `tools/gpu_asr.py` (`ggml_vulkan` GPU 硬件加速) 转写，或直接输入会议记录。
* 自动提取执行摘要、已确认决议与待办 MCP 动作卡片（写入 `claude-mem` 或 `sqlite`）。
* **人工点击审批门禁 (Human Approval Gate)**：所有生成的 MCP 动作默认锁定为 `PENDING_HUMAN_APPROVAL`，只有操作员手动点击 **Approve** 后才会真正执行并写入审计日志。

---

## 目录结构

```text
Antigravity Dashboard/
├── docs/
│   ├── README.zh-CN.md            # 简体中文文档
│   ├── README.pt-BR.md            # 葡萄牙语文档
│   └── assets/                    # 项目图标与架构图资源
├── backups/                       # mcp_config.json 快照与隔离区账本
├── server/
│   ├── index.ts                   # Hono API 服务端 (127.0.0.1:4320)
│   ├── paths.ts                   # Windows 路径规范化与官方二进制文件保护守卫
│   └── services/
│       ├── tokenScanner.ts        # Token 估算、超长提示词与重复 Skill 检测
│       ├── profileManager.ts      # 原子化隔离与一键预设切换
│       ├── transcriptReader.ts    # Brain JSONL 读取器与 Kitsune/claude-mem 探针
│       ├── sqliteInspector.ts     # Node 原生 SQLite 引擎与只读 SQL 校验器
│       └── meetingPipeline.ts     # Vulkan GPU 语音转写桥接与人工审批队列
├── src/
│   ├── App.tsx                    # 前端主视图容器
│   ├── styles/onyx.css            # 视觉变量与排版样式
│   └── components/                # 四大核心模块组件与底部命令栏
├── tests/
│   └── dashboard.test.ts          # Vitest 测试套件 (含安全拦截与变异断言)
├── .graphify.json                 # AST 依赖关系图 (20 个文件, 48 条边)
└── PROJECT_MAP.md                 # 代码库静态结构映射
```

---

## 快速开始

环境要求：**Node.js v22.5+**（已在 `v26.13.1` 原生 `node:sqlite` 下验证）与 **Python 3.12+**（可选，用于 `gpu_asr.py` Vulkan GPU 转写）。

```powershell
# 1. 安装依赖
npm install

# 2. 运行安全与单元测试 (Vitest)
npm test

# 3. 同时启动后端 API (:4320) 与前端界面 (:5175)
npm run dev
```

在浏览器中打开 `http://localhost:5175`。
