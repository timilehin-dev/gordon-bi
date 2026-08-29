# 🦅 Gordon: Autonomous Desktop Analytics Platform

> **The Open-Source, Local-First, Agent-Centric Business Intelligence & Analytics Engine.**  
> *Zero Docker. Zero Background Daemons. 100% Click-Through Lineage & Deterministic Verification.*

---

## ⚡ Overview

**Gordon** is an enterprise-grade autonomous desktop analytics engine designed to transform raw tabular data, unstructured business documents (PDF, DOCX, Markdown), and enterprise SaaS/database sources into verified, executive-ready predictive reports, interactive visual dashboards, and econometric models with **0% hallucination risk**.

Unlike legacy BI tools (Power BI, Excel, Tableau) that require tedious manual modeling, or cloud AI assistants (Julius AI) that send your data to third-party servers, Gordon runs **100% on-device** using an in-process vectorized DuckDB OLAP engine, SQLite ACID lineage graph, and an autonomous multi-agent orchestration loop.

---

## 🚀 Key Capabilities

### 1. 🤖 Autonomous Multi-Agent Orchestration
- **Root Business Analyst:** Decomposes natural-language business goals into dynamic Directed Acyclic Graphs (DAGs).
- **Adversarial Critic / QA Verifier:** Every numerical assertion and forecast is audited against raw tool execution records in the Lineage Store before presentation.
- **Specialized Agent Roster:** Data Engineering, Time-Series Forecasting (ARIMA/ETS), Anomaly & Change-Point Detection, Trend/Driver Attribution, NL-to-SQL, Visualization, and Narrative Insight Generation.

### 2. 📊 Power BI-Grade Desktop Shell
- **60 FPS Virtualized Grid:** Spreadsheet-parity data grid with live formula bar (`SUM`, `AVERAGE`, `COUNT`, arithmetic) and the *"Promote to Transformation Step"* engine.
- **Drag-and-Drop Responsive Canvas:** 12-column dashboard layout with Apache ECharts visual cards and dynamic cross-filtering.
- **100% Click-Through Lineage Explorer:** Click any citation in a generated narrative to inspect its exact source table, DAG task, tool execution ID, Critic QA verification stamp, and execution latency.
- **BYOK Key Vault:** Bring-Your-Own-Key support (Gemini, Claude, GPT-4o, Local Ollama) with physical in-memory zeroing upon session completion.

### 3. 📈 Full-Stack Business Analytics & Econometrics
- **Econometrics Suite:** Granger Causality ($F$-test), Engle-Granger Cointegration (ADF test), GARCH(1,1) Volatility & 95%/99% VaR/CVaR, and Hodrick-Prescott (HP) Filter.
- **Fundamental & SaaS Valuation:** Multi-period DCF Valuation with Gordon Growth terminal value, DuPont 3/5-way ROE, Altman Z-Score distress classification, SaaS Unit Economics (MRR Waterfall, NDR, LTV/CAC, Rule of 40), and Cash Conversion Cycle.
- **Optimization & What-If:** Simplex LP tableau solver, Zero-Eval safe Goal Seek root-finder, and Price Elasticity yield optimizer.
- **Statistical Testing & AutoML:** Welch/Paired t-tests, One-Way ANOVA, Mann-Whitney U, Chi-Square (Yates' correction), MLE Distribution Fitting (Normal, Lognormal, Exponential, Poisson), Bayesian A/B testing, and cross-validated AutoML model leaderboard.

### 4. 📦 Single-File `.gordon` Workspace Archives
- Save, export, and share complete projects in a single compressed `.gordon` bundle with SHA-256 cryptographic integrity verification.

### 5. 🎙️ Real-Time Executive Voice Assistant (Gemini Live API)
- Real-time bidirectional voice streaming over WebSockets using `gemini-3.1-flash-live-preview` with live waveform visualizer.

### 6. 🛡️ Sandboxed Community Extensibility
- Run untrusted community plugins safely under OS-native sandboxes (Windows Job Objects, macOS Seatbelt, Linux Landlock/Bubblewrap) with Mediated JSON-RPC.
- Official SDKs for **TypeScript/Node** (`@gordon/node-plugin-sdk`) and **Python** (`gordon-plugin-sdk`).

---

## 🏗️ Architecture & Monorepo Structure

Gordon enforces the **Strict No-Monolith Rule (ADR-001)**: every package and domain module is decomposed into dedicated, single-responsibility files (`types.ts`, `errors.ts`, implementation logic, and unit tests).

```text
gordon/
├── apps/
│   └── desktop-ui/            # React 19 + TypeScript desktop shell & canvas
├── packages/
│   ├── shared-types/          # Shared interfaces & agent schemas
│   ├── data-substrate/        # DuckDB OLAP, SQLite Lineage, Ingestion, DAX Engine
│   ├── tool-registry/         # Deterministic analytical & econometrics tools
│   ├── agent-supervisor/      # In-process worker pool & subprocess supervisor
│   ├── sandbox-runtime/       # OS sandboxes (Windows/macOS/Linux) & Mediated RPC
│   ├── core-engine/           # Orchestrator, Sub-agents, Voice, Bundler, Benchmarks
│   ├── node-plugin-sdk/       # TypeScript/Node plugin authoring SDK
│   └── python-plugin-sdk/     # Python plugin authoring SDK
├── tests/
│   └── integration/           # 26 automated acceptance test suites (M0–M15)
└── .github/
    └── workflows/             # Cross-platform CI/CD release matrix
```

---

## 💻 Quick Start & Development

### Prerequisites
- **Node.js**: v20+
- **Rust Toolchain**: Stable (for Tauri native compilation)

### Installation
```bash
# Clone the repository
git clone https://github.com/timilehin-dev/gordon-bi.git
cd gordon-bi

# Install dependencies
npm install

# Run TypeScript typecheck across monorepo
npm run lint

# Run all 26 automated unit & integration test suites
npx tsx --test packages/**/tests/*.test.ts tests/integration/*.test.ts

# Start Desktop UI in development mode
npm run dev --workspace=apps/desktop-ui
```

---

## 🔒 Security & Privacy Guarantees

- **100% Local-First Execution:** Your data never leaves your computer unless you explicitly configure an LLM provider key in BYOK Settings.
- **Zero Background Daemons:** Gordon terminates completely when the application window is closed.
- **Memory Buffer Zeroing:** Heap buffers holding sensitive credentials are explicitly zeroed out (`Buffer.fill(0)`).
- **Adversarial Critic QA Gate:** Generates zero hallucinated metrics or unsourced narrative claims.

---

## 📄 License

Apache 2.0 / MIT License.
