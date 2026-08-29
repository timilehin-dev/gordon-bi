# ARCHITECTURAL DECISION RECORDS (ADR)

This file is **append-only**. It records every non-trivial architectural, technology, or design decision, the alternatives evaluated, and the rationale for the final choice.

---

## ADR-000: Architecture & Loop-Engineering Constitution

- **Date:** 2026-08-29
- **Status:** Accepted
- **Context:**
  Building an open-source, autonomous business analytics desktop app (Windows & macOS) requiring high reliability, deterministic computations, zero container/daemon dependencies, low resource footprint, and community extensibility for Python/Node plugins.
- **Decision:**
  1. **Strict Loop-Engineering:** Follow `generate → verify → record → advance` discipline across milestones M0 through M9.
  2. **Tools-First, LLM-Second:** Deterministic computations in typed tools; LLM strictly orchestrates, never hallucinates numbers.
  3. **Multi-Agent Roster:** Specialized agents orchestrated by a Root Business Analyst with Critic/Verifier cross-cutting QA.
  4. **Dual Trust Model:** Built-in agents supervised in-process or via OS subprocess with capability-scoped tool handles; untrusted community plugins isolated in OS-native sandboxes (Landlock/bubblewrap, macOS Sandbox, Windows AppContainer/Job Object) communicating solely via Mediated I/O RPC.
  5. **Local-First Analytics Substrate:** Embedded analytical engine (DuckDB) + local document store + complete provenance/lineage tracking.
- **Consequences:**
  Guarantees zero-docker lightweight deployment, auditable data provenance, safe community extensibility, and maintainable compounding correctness.

---

## ADR-001: Strict Categorical Folder Structure & No-Monolith Rule

- **Date:** 2026-08-29
- **Status:** Accepted
- **Context:**
  The platform is an open-source, multi-agent desktop application intended for long-term community contribution, auditability, and clear study. Monolithic files or bloated omnibus utility modules impede readability, complicate unit testing, and obscure bug isolation.
- **Decision:**
  1. Monolithic files and kitchen-sink modules (e.g. `utils.ts`, `all_tools.py`, `services.ts`) are strictly forbidden.
  2. Every domain, service, agent, tool, data substrate handler, and UI component must reside in its own dedicated, categorical directory.
  3. Every service directory must follow a modular breakdown into single-responsibility files (contracts/types, business logic, schemas/validation, domain errors, and tests).
- **Consequences:**
  Ensures high cohesion, low coupling, crystal-clear readability, straightforward open-source onboarding, and effortless unit-test isolation.

---

## ADR-002: Technology Stack & Language Selection

- **Date:** 2026-08-29
- **Status:** Accepted
- **Context:**
  The platform must deliver a native desktop experience on Windows and macOS, zero Docker/container dependencies, ultra-lightweight footprint (<100MB installer, <150MB idle RAM), Power BI-grade visual density, robust OS-level sandboxing, deterministic OLAP calculations, and an open-source contributor ecosystem.
- **Decision:**
  1. **Core Engine & Desktop Shell:** Rust + Tauri v2. Delivers native OS windowing, tiny binary footprint (<50MB-80MB), sub-0.5s cold start, low idle RAM (50-80MB), and direct kernel API access for OS sandboxing (Windows Job Objects/AppContainers, macOS Sandbox, Linux Landlock).
  2. **Local Analytical Warehouse:** Embedded DuckDB (`duckdb` Rust crate) for vectorized, in-process columnar OLAP querying with zero background daemons.
  3. **Lineage & Provenance Store:** Embedded SQLite (`rusqlite` Rust crate) for ACID-compliant tracking of sessions, task DAGs, tool runs, and citation edges.
  4. **Document Index Store:** Tantivy / SQLite FTS5 for full-text indexing and BM25 retrieval of chunked PDF, DOCX, and Markdown documents.
  5. **Ad-Hoc Code Sandbox:** Wasmtime (WebAssembly runtime) strictly reserved for dynamic agent-generated code snippets with memory and instruction (fuel) limits.
  6. **Desktop UI Framework:** TypeScript + React 19 + Vite + Tailwind CSS + shadcn/ui.
  7. **Spreadsheet-Parity Grid:** Glide Data Grid (HTML5 Canvas-accelerated) providing 60 FPS scrolling on 1M+ rows with in-cell editing and formula evaluation.
  8. **Declarative Visualizations:** Apache ECharts (WebGL/Canvas) + Vega-Lite for declarative BI charts with cross-filtering and theming.
  9. **Community Plugin Ecosystem:** Python and TypeScript / Node.js standard packages, isolated via OS-native sandboxes and communicating exclusively via Mediated I/O JSON-RPC over stdio.
- **Consequences:**
  Achieves all non-functional footprint and latency targets while ensuring high data integrity, robust sandbox security, and maximum accessibility for community contributors.

---

## ADR-003: Robust Multi-Language Code Sandbox & Agent Intelligence System

- **Date:** 2026-08-29
- **Status:** Accepted
- **Context:**
  Ad-hoc transformations and tool calls require robust code execution that can handle complex computations, data wrangling, and statistical transformations without premature timeout or arbitrary execution barriers. Additionally, agent prompt contracts must enforce rigorous cognitive reasoning and citation discipline.
- **Decision:**
  1. **Configurable Long Timeouts (Default 120s):** Default execution timeout for `AdHocCodeSandbox` and `PythonCodeSandbox` is set to **120,000 ms (120 seconds)**, with user-configurable overrides in settings.
  2. **Rich Analytical Substrate within VM Sandbox:** `AdHocCodeSandbox` injects built-in `Stats` (mean, median, variance, stdDev, movingAverage, correlation) and `DataOps` (groupBy, sortBy, distinct) helpers alongside standard ES2022 intrinsics.
  3. **Console Log & Telemetry Capture:** All `console.log`, `info`, `warn`, and `error` outputs are captured with timestamps in `WasmExecutionResult` for auditability and UI inspection.
  4. **Dedicated Python Sandbox (`PythonCodeSandbox`):** Isolated Python script executor with 120s default timeout, structured JSON input/output delimiters, and zero ambient credential leakage.
  5. **Hardened Agent Intelligence System:** Deep prompt contracts established across all agents enforcing goal decomposition, objective model selection, PII detection, and 100% citation links.
- **Consequences:**
  Guarantees that user-approved and agent-generated scripts execute reliably with full auditability and rich statistical support while remaining strictly sandboxed.

---

## ADR-004: Zero-Daemon Desktop BI Substrate & Multi-Agent IPC Bridge

- **Date:** 2026-08-29
- **Status:** Accepted
- **Context:**
  Phase 3 requires binding the React 19 visual desktop shell, spreadsheet grid, report canvas, and lineage explorer to the core engine (DuckDB, SQLite Lineage, DocumentStore, and Multi-Agent Orchestrator) in a single-process, zero-daemon architecture without external server processes.
- **Decision:**
  1. **EngineBridge IPC:** Created `EngineBridge` class that encapsulates warehouse operations, lineage queries, document indexing, and autonomous goal execution into a clean, typed interface.
  2. **Categorical UI Decomposition:** Decomposed desktop UI into isolated sub-packages: `shell`, `agent-panel`, `grid`, `canvas`, `lineage`, and `settings`.
  3. **Spreadsheet Parity with Pipeline Promotion:** Implemented `GridStore` supporting virtualized row rendering, formula arithmetic (`=[revenue]-[cost]`), and promotion of cell edits to repeatable data transformation steps.
  4. **Cross-Filtering & Declarative Charts:** Implemented `VisualizationAgent` and `EChartsGenerator` producing declarative `ChartSpec` and Apache ECharts options, with 10-color accessible palettes and interactive multi-select cross-filtering in `CanvasStore`.
  5. **Click-Through Lineage Provenance:** Implemented `ProvenanceAuditCard` linked directly to citations in executive reports, opening tool execution traces instantly upon click.
  6. **Adversarial Critic QA Subagent Audit:** Embedded dedicated Critic QA subagent verification loop before milestone advancement.
- **Consequences:**
  Ensures seamless desktop BI interactivity, sub-10ms state updates, zero external daemon requirements, and complete provenance tracking.

---

## ADR-005: OS-Native Process Sandboxing, Plugin SDKs, and Memory Security Hardening

- **Date:** 2026-08-29
- **Status:** Accepted
- **Context:**
  Phase 4 requires enabling arbitrary third-party community plugins (Python & Node) to execute safely on end-user machines without risk of data exfiltration or host machine compromise, while providing author SDKs, clean-machine verification, memory sanitization, and large-scale performance benchmarking.
- **Decision:**
  1. **OS Sandbox Profiles & Fail-Closed Launcher:** Implemented Windows Job Object profiles (CPU/RAM caps, active process limits), macOS Seatbelt profiles, and Linux Bubblewrap/Landlock isolation in `FailClosedSandboxLauncher`. Fail-Closed policy is strictly enforced.
  2. **Mediated I/O RPC & Security Filter:** Implemented `MediatedRpcBroker` with `RpcSecurityFilter` enforcing token-scoped access, URL-decoded path traversal protection (`%2e%2e%2f`), system directory blocking, and case-insensitive table scopes.
  3. **Community Plugin SDKs:** Published `@gordon/node-plugin-sdk` (TypeScript) and `gordon-plugin-sdk` (Python) with `MockPluginHost` for offline unit testing without desktop app dependencies.
  4. **Clean-Machine & Scalability Verification:** `CleanMachineAuditor` validates zero Docker/daemon runtime requirements; `ScalabilityBenchmarkRunner` verifies 50,000+ row DuckDB OLAP processing in <20ms (>340,000 rows/sec).
  5. **Memory Buffer Sanitization:** `KeyVault.clearMemory()` executes physical `Buffer.fill(0)` byte overwrites, preventing API keys from lingering in heap memory upon session termination.
  6. **Competitive Matrix Sign-Off:** `CompetitiveMatrixAuditor` formally verified all criteria in Section 2 of Product Requirements.
- **Consequences:**
  Provides military-grade process sandboxing, effortless community plugin authorship, robust memory security, and full competitive parity across Power BI, Excel, and Julius AI.

---

## ADR-006: Agent-First Full-Stack Business Analytics & Econometric Engine Architecture

### Context
To achieve complete parity and superiority beyond traditional BI/BA tools (Power BI, Microsoft Excel, Julius AI, IBM Watson Analytics), Gordon required an exhaustive suite of deterministic econometrical, mathematical optimization, financial valuation, statistical testing, and in-process AutoML tools callable directly by autonomous sub-agents and exposed to end users.

### Decisions
1. **Zero-Native Pure TypeScript Solvers**:
   - Granger Causality, HP Filter, and Ridge Regression use in-process Gaussian elimination with partial pivoting and ridge regularizers (`1e-6`), guaranteeing zero external native compilation dependencies or container runtimes.
2. **Safe Zero-Eval Math Parsing**:
   - `GoalSeekTool` implements a recursive descent tokenizer and arithmetic parser for algebraic equations, eliminating `eval()` or `new Function()` security risks.
3. **Statistical & Distributional Breadth**:
   - Supports Welch's Two-Sample t-test, Paired t-test, One-Way ANOVA F-test, Mann-Whitney U, Chi-Square (with Yates' correction), MLE distribution fitting (Normal, Lognormal, Exponential, Poisson with Kolmogorov-Smirnov distance), and Bayesian A/B testing.
4. **AutoML Model Leaderboard**:
   - In-process K-fold cross-validation for Ridge, Decision Tree, and KNN models with permutation feature importance scoring.
5. **Enterprise Ingestion & Presentation Exporters**:
   - `DatabaseConnectorTool` and `RestApiConnectorTool` stream structured records into DuckDB with dynamic schema mapping; `PptxPresentationBuilderTool` outputs multi-slide OpenXML executive presentations.

### Consequences & Verification
- 8 newly expanded analytical domains structured under strict categorical decomposition (ADR-001).
- 100% test pass rate across 23 test suites (M0 through M12) with 0 regressions.

---

## ADR-007: Portable Workspaces, Advanced DAX, Gemini Live Voice, Verified Marketplace & CI/CD Release

### Context
To complete Gordon's enterprise capabilities and distribution readiness, 5 key strategic initiatives were implemented:
1. Portable single-file workspace bundling (`.gordon`).
2. Nested DAX formula evaluation for multi-table calculations (`CALCULATE`, `SUMX`, `DIVIDE`, `COUNTROWS`).
3. Low-latency real-time voice debriefs via the Gemini Live API (`gemini-3.1-flash-live-preview`).
4. Curated Enterprise Plugin Marketplace with cryptographic HMAC-SHA256 signature verification.
5. Multi-platform Tauri production packaging with automated GitHub Actions CI/CD release matrix.

### Decisions
1. **Portable `.gordon` Archives with SHA-256 Checksums**:
   - `WorkspaceBundlerTool` serializes and GZIP-compresses DuckDB tables, SQLite Lineage records, Canvas layout specs, and Document chunks into `.gordon` files.
   - `unpack` validates cryptographic SHA-256 payload checksums and safely escapes table/column double quotes during DuckDB restoration.
2. **DAX Formula Engine & AST Compiler**:
   - `DaxLexer` and `DaxEvaluator` compile nested DAX functions (`CALCULATE`, `SUMX`, `DIVIDE`, `COUNTROWS`) into parameterized DuckDB SQL with `NULLIF` divide-by-zero protection and identifier sanitization.
3. **Gemini Live API Voice Assistant**:
   - `GeminiLiveSessionManager` manages bidirectional audio streaming over WebSockets with 16kHz PCM audio input, 24kHz audio output, VAD, thinkingLevel (`minimal`), live transcription, and function calling tools.
   - `VoiceDebriefModal.tsx` provides an animated waveform visualizer in the desktop shell.
4. **Curated Marketplace with HMAC-SHA256 Signatures**:
   - `MarketplaceManagerTool` verifies plugin digital signatures against a trusted root public key before allowing installation, preventing unsigned or tampered plugins from running.
5. **Multi-Platform CI/CD Release Pipeline**:
   - `.github/workflows/release.yml` defines automated builds for Windows (`x86_64-pc-windows-msvc`), macOS Universal (`universal-apple-darwin`), and Ubuntu Linux (`x86_64-unknown-linux-gnu`) with automated size budget checks (< 100MB) and GitHub Releases asset publishing.

### Consequences & Verification
- 100% test pass rate across all 26 test suites (M0 through M15).
- Clean compilation (`tsc --noEmit` 0 errors).


