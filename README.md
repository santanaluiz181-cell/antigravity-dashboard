# Antigravity Control & Data Studio

[English](./README.md) | [简体中文](./docs/README.zh-CN.md) | [Português](./docs/README.pt-BR.md)

Local workbench for inspecting Google Antigravity context budgets, skill and MCP server footprint, live session transcripts, read-only SQLite data lineage, and GPU-backed post-meeting action staging.

Built as an external local web server (`Hono` on `:4320` + `Vite / React 19` on `:5175`). It never patches or modifies `~/.gemini/bin/agy.exe` or any `.asar` bundle (compliant with Google Antigravity Terms of Service, Section 6).

---

## Why This Exists

When `~/.gemini/config/skills` and plugin folders (`SuperAntigravityTJTO`, `science`) accumulate duplicate skill definitions or 250+ line rule files, the system prompt index overflows its token budget. Once that ceiling is crossed, Antigravity silently drops core subagents (`browser`, `research`) and skills (`super-render`, `ultimate-research`) from the active session.

This studio measures that footprint directly from disk and lets you park redundant skills into SHA-256 verified quarantine folders in one click.

---

## Core Modules

### 1. Context & Token-Bloat Control
* Scans `~/.gemini/config/skills`, `~/.gemini/config/plugins/*/skills`, `~/.gemini/antigravity/builtin/skills`, `GEMINI.md`, `AGENTS.md`, and `mcp_config.json`.
* Flags prompts exceeding `250 lines` and highlights exact duplicate skill collisions between global config and plugins.
* Switches profiles (`Coding Lean`, `Frontend Craft`, `Journalism & TJTO`, `Video / B-Roll`, `Full Restore`) by creating a timestamped backup in `backups/` before moving duplicate folders or toggling MCP servers.

### 2. Live Brain Sessions, Kitsune & Context Engines
* Streams step logs from `~/.gemini/antigravity/brain/<id>/.system_generated/logs/transcript.jsonl`.
* Probes local ports for **Kitsune Router** (`127.0.0.1:4319`), **claude-mem** (`127.0.0.1:37777`), and **MJ Notch Companion** (`127.0.0.1:49211`).
* Reads `.graphify.json` (`Graphify + PonyTail` AST index) and `PROJECT_MAP.md` (`Cartographer` structural map, reducing blind discovery token cost by 98.3%).
* Previews local `/generative_ui` HTML artifacts inside a sandboxed frame.

### 3. Data Workbench & Read-Only SQL Sources Pane
* Accepts local `.csv` and `.json` files via drag-and-drop and loads them into Node v26 native `node:sqlite` (`DatabaseSync`).
* Left view renders the chart and table; right `Sources` inspector exposes the exact origin path, schema types, transformation steps, and SQL query.
* Enforces a strict read-only SQL gate (`assertReadOnlySelectSql`): only single-statement `SELECT` and `WITH` queries can run.

### 4. Post-Meeting Action Executor
* Routes uploaded meeting audio to `tools/gpu_asr.py` (`ggml_vulkan` GPU transcription) or accepts raw meeting notes.
* Extracts summary bullets, decisions, and staged MCP payloads (`claude-mem`, `sqlite`).
* **Human Approval Gate**: staged MCP payloads stay locked in `PENDING_HUMAN_APPROVAL` until an operator explicitly clicks **Approve** or **Reject**.

---

## Project Layout

```text
Antigravity Dashboard/
├── docs/
│   ├── README.zh-CN.md            # Simplified Chinese documentation
│   ├── README.pt-BR.md            # Portuguese documentation
│   └── assets/                    # Brand mark and architecture diagrams
├── backups/                       # SHA-256 MCP snapshots and skill quarantine ledger
├── server/
│   ├── index.ts                   # Hono API server (127.0.0.1:4320)
│   ├── paths.ts                   # Windows path resolver + ToS binary guard
│   └── services/
│       ├── tokenScanner.ts        # Token & duplicate skill scanner
│       ├── profileManager.ts      # Atomic quarantine and preset switcher
│       ├── transcriptReader.ts    # Brain JSONL reader + Kitsune/claude-mem probes
│       ├── sqliteInspector.ts     # Native node:sqlite engine + read-only guard
│       └── meetingPipeline.ts     # Vulkan GPU ASR bridge + human approval queue
├── src/
│   ├── App.tsx                    # Workspace shell
│   ├── styles/onyx.css            # Surface and typography tokens
│   └── components/                # Module views and command bar
├── tests/
│   └── dashboard.test.ts          # Vitest suite (security + mutation assertions)
├── .graphify.json                 # AST dependency graph (20 files, 48 edges)
└── PROJECT_MAP.md                 # Static symbol map
```

---

## Quickstart

Requires **Node.js v22.5+** (tested on `v26.13.1` with built-in `node:sqlite`) and **Python 3.12+** (optional, for `gpu_asr.py` Vulkan transcription).

```powershell
# Install packages
npm install

# Run security and unit tests (Vitest)
npm test

# Start API (:4320) and Web UI (:5175)
npm run dev
```

Open `http://localhost:5175` in your browser.
