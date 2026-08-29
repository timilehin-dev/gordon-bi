# PRODUCT OWNER BRIEF: [PROJECT NAME]
### An Open-Source, Agent-First, Autonomous Business Analytics Desktop App (Windows/macOS, Docker-free, Lightweight Footprint)

---

## 0. ROLE AND OPERATING MODE

You are the **lead AI engineer** on a long-running, multi-milestone build. I am the **product owner**. This document is your spec, your constitution, and your loop-engineering contract. It does not get "completed" in one sitting — treat it as a persistent project you check into at the start of every session.

**You must operate in a loop-engineering discipline, not a one-shot generation discipline:**

1. At the start of the project (and at the start of every session thereafter), read `PROGRESS.md` and `DECISIONS.md` before writing any code.
2. Break the entire build into **sequential milestones** (see §7). Never attempt to jump ahead to a later milestone while an earlier one has open verification failures.
3. For every milestone: **generate → verify → record → advance.** You act as both generator and verifier — write the code, then adversarially test it as if you didn't write it, then log the outcome, then only then move on.
4. Maintain these living documents at the repo root, updated every session, never left stale:
   - `PROGRESS.md` — what's done, what's in flight, what's blocked, and why.
   - `DECISIONS.md` — every non-trivial architectural or design decision, the alternatives considered, and why this one won. Append-only; never rewrite history.
   - `AGENTS.md` — a living map of every agent/sub-agent in the system, its responsibilities, its tool access, and its prompt contract.
   - `WORKLOG.md` — a running session log (what you attempted, what broke, what you fixed) so continuity survives a context reset.
5. If a milestone's verification fails, you do not proceed to the next milestone. You fix, re-verify, or explicitly flag the blocker to me with a proposed resolution.
6. Never silently downgrade scope. If something in this brief turns out to be infeasible, technically wrong, or in conflict with something else in the brief, stop and raise it — in `DECISIONS.md` and to me directly — rather than quietly building a lesser version.

This is a marathon build. Optimize for **compounding correctness** (each milestone makes the next one easier and safer to build on), not for the appearance of speed.

---

## 1. THE PRODUCT VISION (WHY THIS EXISTS)

Today, doing real business analytics means stitching together tools that were never designed to talk to each other: Excel for ad-hoc modeling, Power BI for dashboards, a notebook or Julius-AI-style chat tool for one-off statistical questions, and a human analyst gluing all of it together with judgment and elbow grease.

**The thesis of this product:** an analyst's actual job is not "build a chart" — it's *ingest → question → reason → verify → communicate*. That whole loop can be run by a coordinated team of specialized agents, provided the agents are backed by real, deterministic, inspectable tools rather than asked to "just figure it out" in free text.

We are building the autonomous version of that whole loop as a **single, lightweight, native Windows/macOS desktop application** — install one binary, bring **only your own LLM API key(s)**, and get everything else: ingestion of essentially any business document or data source, storage, statistical and ML tooling, multi-agent orchestration, visualization, and reporting.

**The product is not "a chatbot that can also open files."** It is a **tools-and-skills-first analytics engine that happens to be operated by LLM agents, wrapped in a Power BI–grade desktop experience.** The LLM's job is to select, sequence, and reason about tool calls — never to hallucinate numbers, never to "eyeball" a trend in prose when a deterministic computation is available. Every number in every output must be traceable to a tool call, not to model narration.

### 1.1 Distribution & runtime decision (locked)

- **Desktop app only, for Windows and macOS.** This is the single user-facing surface. No separate CLI/TUI/API product to maintain or document for end users.
- **No Docker, no container runtime dependency, no daemon of any kind.** The app must install and run like a normal lightweight desktop application (think OpenWork-style footprint) — no "please install Docker Desktop first," no background container orchestration, no multi-gigabyte base images.
- **Built-in agents run as in-process components or lightweight OS subprocesses, supervised directly by the desktop app.** The orchestrator (the "Root Business Analyst" agent) is the process/thread supervisor for every built-in sub-agent. Isolation and safety come from **scoped tool access enforced by the registry**, since this is code the project itself controls — see §3.1.
- **Third-party community plugins are a different trust tier, and are treated as untrusted code by construction, in whatever language they're written in (Python, Node, etc. — no WASM requirement).** Because this is open source and community contribution is core to the vision, plugin authors must be free to write normal Python/Node packages. Untrusted-code safety is achieved through **OS-native process sandboxing plus mediated I/O**, not through a compilation-target restriction — see §3.1 and §3.2.
- **Community distribution is plugin packages, not container images.** A contributor publishes a versioned package implementing the documented agent/tool contract; the desktop app's plugin loader discovers, sandboxes, and loads it after the user reviews and approves its requested capabilities. No Docker Hub step required for either the core app or community agents.

### 1.2 Design philosophy (non-negotiable)

- **Tools/skills first, LLM second.** Every analytical capability (forecasting, anomaly detection, correlation, cohort analysis, SQL generation, chart generation) is implemented as a deterministic, testable tool/skill with a typed interface. The LLM orchestrates; it does not compute.
- **Multi-agent, not mono-agent.** A root business-analyst (coordinator) agent decomposes a business question into sub-tasks and delegates to specialized sub-agents (see §4). No single monolithic prompt is asked to "do the analysis."
- **Least-privilege by default, enforced structurally, not by instruction.** Each sub-agent — built-in or plugin — is granted only the specific tools/capabilities it needs. An agent that never needs filesystem writes should be structurally unable to perform them, whether that's via registry scoping (built-in agents) or OS sandbox profile plus mediated I/O (plugins).
- **Autonomous by default, steerable on demand.** The system should be able to take any ingested data and a business goal and run the full ingest → analyze → report loop with zero further human input — while still exposing every intermediate step for a human to inspect, pause, redirect, or override from within the app.
- **Bring-your-own-key, zero platform lock-in.** No proprietary model hosting. Users configure their own provider keys (Anthropic, OpenAI, local/open-weight via Ollama, etc.) inside the app's settings. The platform must degrade gracefully across model tiers.
- **Ingest almost anything.** CSV, XLSX, JSON, Markdown, PDF, and DOCX must all be first-class ingestible sources out of the box — not just tabular data. Unstructured/semi-structured documents must be parsed, chunked, and made queryable alongside structured data.
- **Power BI-grade design language, not "AI tool" design language.** Dense, information-first, ribbon/pane-based navigation, a real theming system (light/dark, brand palette), drag-to-arrange report canvases, native-feeling data grids/visuals — not a chat bubble with a canvas bolted on. Chat/agent interaction is a **dockable panel within** the BI experience, not the entire experience.
- **Open source, community-extensible, still lightweight and still low-friction to contribute to.** Plugin authors should be able to write ordinary Python/Node code, not learn a new compilation target, to contribute an agent or connector.

---

## 2. COMPETITIVE TARGET (WHAT "BEATS" MEANS, CONCRETELY)

Treat "beat Power BI + Julius AI + Excel" as a literal feature checklist you are accountable to. For each row, you must be able to point to the specific milestone and component that delivers it:

| Capability class | Incumbent | What we must match or exceed |
|---|---|---|
| Interactive report canvas, pinned visuals, cross-filtering, drill-through | Power BI | Native desktop report canvas with linked visuals, slicers, drill-down/through, bookmarks |
| Data modeling (relationships, measures, calculated columns) | Power BI / Excel | A real semantic layer: typed schema, declared relationships, a formula/measure language, computed columns |
| Ad-hoc natural-language statistical Q&A | Julius AI | Chat-driven analysis panel backed by real tool calls (not narrated guesses), with visible reasoning trace and re-runnable tool calls |
| Spreadsheet-style ad-hoc modeling | Excel | An embedded, formula-capable grid view over any dataset, with the ability to promote a manual edit into a reusable, versioned transformation step |
| Autonomous forecasting / anomaly detection / trend analysis | (none of the three do this unattended) | Sub-agents that run these analyses unattended, on a schedule or on data-arrival, and proactively surface findings inside the app |
| Ingest unstructured business documents | (none of the three do this natively alongside tabular data) | Native parsing of PDF/DOCX/Markdown into queryable, citable content, cross-referenced with structured data in the same analysis |
| Data connectivity | Power BI connectors / Excel Power Query | File-based ingestion (CSV/XLSX/JSON/Markdown/PDF/DOCX) plus MCP-based connectors for databases and APIs, all reachable from within the desktop app |
| Report/output artifacts | Power BI reports / Excel workbooks | Structured report generation (PDF/HTML/Markdown), reusable SQL, and a shareable dashboard bundle exported from the desktop app |
| Governance/auditability | Power BI lineage view | Full lineage: every visual and every number traceable back through the tool calls and transformation steps that produced it |
| Install footprint & friction | (all three are heavy or subscription-gated) | Single lightweight native installer, no external runtime dependency, works fully offline except for the user's own LLM API calls |
| Community extensibility, safely | (proprietary in all three) | Any Python/Node plugin package can be installed and sandboxed without a container runtime, with clear, reviewable capability requests |

If, at any milestone review, a capability in this table is not yet demonstrably true, that is a blocking gap — record it in `PROGRESS.md` as **not done**, not as "partially addressed."

---

## 3. SYSTEM ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Desktop App (Windows/macOS)                       │
│  Power-BI-style shell: ribbon · nav pane · report canvas · fields pane │
│  Dockable agent panel: chat · live task graph · tool-call trace       │
│  Local semantic layer browser · spreadsheet-parity grid · settings     │
│  Plugin management pane (capability review, install/enable/revoke)    │
└───────────────────────────────┬────────────────────────────────────────┘
                                │  (in-process calls / native IPC — no daemon)
┌───────────────────────────────▼────────────────────────────────────────┐
│              Orchestrator ("Root Business Analyst" agent)             │
│  decomposes goals → delegates to built-in agents & plugin agents      │
│  owns the run graph, retries, human checkpoints, lineage recording     │
│  enforces per-agent capability scopes (§3.1) and plugin sandboxing (§3.2) │
└──┬───────────┬───────────┬───────────┬───────────┬────────────────────┘
   │           │           │           │           │
┌──▼───────┐ ┌─▼─────────┐ ┌▼──────────┐ ┌▼──────────┐ ┌▼─────────────┐
│ Data      │ │ Semantic  │ │ Forecast- │ │ Anomaly   │ │ Insight /    │
│ Engineer- │ │ Layer /   │ │ ing Agent │ │ Detection │ │ Narrative    │
│ ing Agent │ │ Modeling  │ │           │ │ Agent     │ │ Agent        │
│(built-in) │ │ Agent     │ │(built-in) │ │(built-in) │ │ (built-in)   │
└──┬────────┘ └─────┬─────┘ └─────┬─────┘ └────┬──────┘ └─────┬────────┘
   │                │              │             │              │
   │      ┌─────────┴──────────────┴─────────────┴──────────────┘
   │      │
   │  ┌───▼─────────────────────────────────────────────────────┐
   │  │   Plugin Agents/Connectors (community, untrusted)         │
   │  │   each in its own OS-sandboxed subprocess (§3.2),          │
   │  │   talks to host ONLY via mediated RPC — no direct FS/net  │
   │  └────────────────────────────────────────────────────────┘
   │
┌──▼───────────────────────────────────────────────────────────────────┐
│                     Tool / Skill Registry                              │
│  deterministic, typed, independently testable                          │
│  (parsers, stats, ML, SQL, chart-spec, transforms, doc-extraction...)  │
└───────────────────────────────┬────────────────────────────────────────┘
                                │
┌───────────────────────────────▼────────────────────────────────────────┐
│                  Data & Execution Substrate                            │
│  local embedded warehouse (e.g. DuckDB) · document store for           │
│  unstructured content · embedded sandbox for arbitrary code exec       │
│  (WASM runtime, reserved for ad-hoc generated snippets — see §3.2)     │
│  · run/lineage store                                                    │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.1 Native Runtime for Built-In Agents

Built-in agents (the ones the project ships and controls) are trusted code, and get the lighter-weight treatment:

1. **Agent definitions as a typed config, not a Docker Agent YAML.** Define each built-in sub-agent (root Business Analyst orchestrator, plus the four MVP sub-agents: Data Engineering, Forecasting, Anomaly Detection, Insight Generation) in a lightweight, versioned config format describing: its prompt contract, its allowed tool set, and its execution mode (in-process module vs. isolated subprocess).
2. **Execution mode chosen per agent, not uniformly.** Lightweight, pure-function-style agents (e.g., a stats-only Forecasting agent) run **in-process** as async tasks/worker threads for minimal overhead. Agents that touch the filesystem or could be resource-hungry (e.g., Data Engineering parsing a large PDF) run as a **supervised OS subprocess** with resource limits (CPU/memory caps, timeout, restart policy) for crash isolation, without a container.
3. **Capability-scoped toolsets, enforced by the registry.** The Tool/Skill Registry issues each built-in agent a scoped handle exposing only its permitted tools — this is sufficient for trusted, project-controlled code; it is *not* treated as sufficient for untrusted third-party code (see §3.2).
4. **MCP servers for external data sources** (databases, APIs) run as regular local processes the orchestrator manages (start/stop/health-check).
5. **Example configs, sample-data test runs, and documentation** for this agent config format ship with the repo so contributors understand the built-in agent shape even before writing a plugin.

### 3.2 Untrusted Plugin Sandboxing: OS-Native Process Isolation + Mediated I/O

This is the mechanism that lets the platform accept plain **Python or Node plugin packages** from the community — no WASM/WASI compilation requirement — while still treating them as untrusted code by default:

1. **Every plugin runs as its own OS process, under a platform-native sandbox profile — never in-process, never with ambient host privileges.** Use the sandboxing primitive native to each OS rather than a container runtime:
   - **Linux:** Landlock (or bubblewrap as a fallback) to restrict filesystem and network access at the kernel level.
   - **macOS:** the built-in Sandbox (`sandbox-exec` profiles / App Sandbox-style restriction).
   - **Windows:** AppContainer or a restricted Job Object.
   These are OS features, not installable runtimes — no daemon, no extra download, footprint stays light.
2. **The sandbox profile denies filesystem and network access by default.** A plugin process gets, at most, a scratch temp directory it can't escape and no direct network sockets — regardless of what its Python/Node code tries to do.
3. **Mediated I/O is the second, independent layer.** Even where OS sandboxing has gaps, the plugin's *only useful* way to read data, write results, or reach external systems is by calling back into the orchestrator over a narrow RPC channel (stdin/stdout or a local socket, structurally identical to how MCP tool calls already work). The plugin never receives raw filesystem paths to the user's real data or a live network handle — it receives structured requests/responses brokered by the host, the same pattern used to sandbox browser extensions and editor extensions. This means even a plugin that finds a way around the OS sandbox still has nothing directly useful to reach.
4. **A capability manifest, reviewed and approved by the user before install.** Every plugin ships a manifest declaring exactly which tools, data scopes, or connectors it needs. The desktop app surfaces this plainly at install time (§6) and lets the user revoke it later. This is the product-level consent layer sitting on top of the two enforcement layers above.
5. **An optional "verified" tier, later, without weakening the default tier.** Reviewed/signed plugins can eventually be granted a relaxed profile if the project verifies them — but the unverified/default path must remain fully sandboxed regardless of how convenient a plugin author claims their code is.
6. **The embedded WASM/code-exec sandbox is kept, but narrowed to its original purpose:** ad-hoc, agent-generated code snippets (e.g., a custom transform an agent writes at runtime) still go through a lightweight embedded WASM runtime, since that code has no package/manifest at all and needs the strictest possible boundary. Plugin packages use the OS-sandbox-plus-RPC model instead, since they're install-time artifacts the user can review, not throwaway generated code.

Key architectural commitments you must make explicit in `DECISIONS.md`:

- **Desktop shell technology** — propose and justify (e.g., Tauri, given its smaller binary size and lower memory footprint vs. Electron) with explicit tradeoffs for Windows/macOS packaging, auto-update, and native-feel data grids/visuals.
- **In-process vs. subprocess decision rule for built-in agents** — a documented rule (not ad hoc per-agent judgment) based on trust boundary and resource profile.
- **Per-OS sandbox implementation plan for plugins** — Landlock/bubblewrap, macOS Sandbox, Windows AppContainer/Job Objects: pick concrete APIs/libraries for each, and document what happens on an OS version where the chosen primitive isn't available (fail closed — refuse to run the plugin — not fail open).
- **Mediated I/O protocol spec** — the exact RPC surface a plugin process can call, versioned and documented like the MCP tool contract, so plugin authors have one clear interface regardless of language.
- **Embedded WASM sandbox scope** — confirm it's reserved for ad-hoc generated code, not general plugin execution, and justify the runtime choice (e.g., Wasmtime) for that narrower job.
- **Local-first execution** — default to an embedded analytical database (e.g., DuckDB) plus a document store for parsed unstructured content, so the platform works fully offline except for the LLM API calls themselves.
- **Tool/skill contract** — every tool is a typed function (explicit input schema, output schema, error contract) registered in a central registry that agents can discover and call.
- **Document ingestion pipeline** — a unified parsing/normalization layer that turns CSV/XLSX/JSON/Markdown/PDF/DOCX into either (a) structured rows joinable into the semantic layer, or (b) chunked, citable unstructured content indexed for retrieval.
- **Plugin manifest & consent UX** — the exact fields a manifest must declare, how capability requests are phrased in plain language for a non-technical business user, and the revocation flow.
- **Run graph and lineage store** — every agent run, tool call, input, and output is persisted so any report artifact can be traced back to its exact provenance, viewable from within the desktop app.

---

## 4. THE AGENT ROSTER (SPECIALIZED SUB-AGENTS)

Define each of these as a first-class agent with its own prompt contract, tool allowlist, execution mode, and success criteria — documented in `AGENTS.md`. Build the four marked **[MVP]** first, then expand. Items 1–5 are built-in (§3.1); community contributions to any category arrive later as sandboxed plugins (§3.2).

1. **Root Business Analyst / Orchestrator [MVP]** — turns a business goal into a task graph, assigns work to sub-agents, arbitrates conflicting findings, decides when a human checkpoint is required, assembles the final output. Built-in, in-process.
2. **Data Engineering Agent [MVP]** — ingests and profiles CSV/XLSX/JSON/Markdown/PDF/DOCX and external sources via MCP; normalizes structured data into the semantic layer and unstructured content into indexed, citable chunks; flags obvious PII/type issues. Built-in, supervised subprocess (touches untrusted files).
3. **Forecasting Agent [MVP]** — time-series forecasting (trend/seasonality decomposition, multiple candidate models, backtesting, confidence intervals). Built-in, pure-compute, in-process.
4. **Anomaly Detection Agent [MVP]** — statistical and ML-based outlier/change-point detection, unattended monitoring mode for scheduled/updated data. Built-in, pure-compute, in-process.
5. **Insight/Narrative Generation Agent [MVP]** — assembles findings from other agents into structured, cited reports, dashboards, or exportable documents; every claim linked to the tool call/query that produced it. Built-in, in-process.
6. **Semantic-Layer/Modeling Agent** — builds the relationship graph between tables and documents, defines measures/calculated fields, maintains the semantic layer all other agents and the UI query against.
7. **Trend & Correlation Agent** — cross-variable relationship discovery, cohort/segment analysis, driver analysis.
8. **SQL/Query Agent** — translates analytical questions into verified, executable SQL against the semantic layer; never guesses at data it hasn't queried.
9. **Visualization Agent** — chooses appropriate chart types and produces chart specs (not raw images) rendered natively by the desktop app's design system.
10. **Critic/Verifier Agent (cross-cutting)** — reviews outputs from other agents against the raw tool results before they're surfaced, catching numeric inconsistency or unsupported claims. Automated stand-in for a human QA pass; runs before any output reaches the user.

You are free to propose merges/splits of this roster, or reassign an agent's execution mode, as you learn more — log any such change as a decision in `DECISIONS.md` with rationale.

---

## 5. TOOL / SKILL SURFACE (WHAT MUST EXIST, MINIMUM VIABLE SET)

Organize these as independently versioned, independently testable packages from day one:

- **Document/file ingestion:** CSV/XLSX reader with type inference, JSON reader/flattener, Markdown parser, PDF text/table/layout extraction, DOCX extraction (text, tables, headers) — all normalized into either the tabular semantic layer or the indexed unstructured-content store.
- **External connectivity:** MCP-based generic SQL connector (Postgres/MySQL/SQLite at minimum), MCP-based generic REST API connector, with a documented path for the community to add more MCP servers (as sandboxed plugins per §3.2).
- **Data transformation:** cleaning, joins, reshaping (pivot/unpivot), type coercion, a documented transformation-step format so any manual/spreadsheet-style edit can be replayed as a pipeline step.
- **Statistics/ML:** descriptive stats, correlation/regression, time-series forecasting (with backtesting), anomaly/outlier detection, clustering/cohort analysis, basic classification/regression modeling for "what drives X" questions.
- **Query:** natural-language-to-SQL against the declared semantic layer, with a validation step that runs the SQL and checks result shape before it's trusted; retrieval over the unstructured-content store with citations back to source documents.
- **Visualization:** a chart-spec generator (declarative spec, not baked images) covering the standard BI chart vocabulary (bar/line/area/scatter/pie/treemap/heatmap/waterfall/funnel/KPI-card/table-matrix), rendered natively by the desktop layer.
- **Reporting/export:** structured report assembly (Markdown/HTML/PDF), dashboard bundle export/import, reusable-SQL export.
- **Spreadsheet-parity layer:** an embedded grid with formula support, bidirectionally linked to the underlying dataset, so ad-hoc "Excel-style" edits are first-class citizens, not an escape hatch outside the system.
- **Embedded WASM sandbox:** reserved for ad-hoc, agent-generated code snippets only (§3.2 point 6) — not the mechanism for plugin packages.
- **Plugin runtime layer:** per-OS process sandbox launcher (Landlock/bubblewrap, macOS Sandbox, AppContainer/Job Objects) plus the mediated-I/O RPC broker plugins talk to (§3.2 points 1–3).

---

## 6. THE DESKTOP APP (SOLE INTERFACE)

- **Windows and macOS native installers**, auto-update, standard OS integration (file associations for supported formats where sensible, drag-and-drop ingestion).
- **Lightweight by construction** — no bundled container runtime, no daemon process, minimal background resource usage when idle. Startup and install size are treated as first-class metrics, tracked and reported in `PROGRESS.md` from M1 onward.
- **Power-BI-style information architecture:** ribbon/toolbar + left navigation pane + report canvas + properties/fields pane.
- **Dedicated, dockable agent panel** (chat + live task graph + tool-call trace) sitting alongside the report canvas — never replacing it.
- **Real theming** (light/dark, custom palettes), consistent iconography, dense data-grid components, drag-and-drop report building.
- **First-run setup flow** for configuring one or more LLM provider keys (cloud and local/open-weight), with per-agent model selection so, e.g., the Critic/Verifier can run on a different (possibly cheaper or stricter) model than the Orchestrator. No container/runtime setup step required.
- **Plugin management pane** — install/enable/disable community agent or connector packages, showing each plugin's declared capability manifest in plain language before install, with per-capability revocation afterward. Clearly distinguishes unverified (default-sandboxed) from any future verified/reviewed plugins.
- **Lineage/audit view** — a dedicated pane where any number on any visual can be clicked through to the exact tool call and transformation chain that produced it.

---

## 7. MILESTONE PLAN (LOOP-ENGINEERING STRUCTURE — ADAPT AS YOU LEARN, BUT DO NOT SKIP AHEAD)

For each milestone below: define its own acceptance criteria before starting, write a verifier (automated tests + a manual checklist) before declaring it done, and update `PROGRESS.md`/`DECISIONS.md` as you go.

- **M0 — Foundations:** repo layout, tool/skill contract format, run/lineage data model, core data substrate (embedded DB + document store), CI scaffold, built-in agent config schema, embedded WASM sandbox spike (for ad-hoc code only). *Acceptance: a "hello world" tool call is invoked by a stub orchestrator, logged to the lineage store, with zero container dependency verified by a clean-machine install test.*
- **M1 — Native Runtime for Built-In Agents:** author the agent config for the root Business Analyst + the four MVP sub-agents (§4); implement the in-process/subprocess execution split and capability-scoped tool issuance; wire up MCP servers for one external DB and one API source, run as local managed processes; write example usage scripts/docs; test end-to-end with sample data. *Acceptance: all five built-in agents run locally with no Docker/container runtime installed, and a scripted run against sample data produces a real, traceable result, with measured install size and idle memory footprint logged in `PROGRESS.md`.*
- **M2 — Ingestion & Semantic Layer:** full ingestion pipeline for CSV/XLSX/JSON/Markdown/PDF/DOCX; schema profiling for structured data; chunking/indexing for unstructured content; relationship/measure modeling. *Acceptance: a mixed bundle of a spreadsheet, a PDF report, and a markdown doc is ingested, and both are queryable — structured via SQL, unstructured via cited retrieval.*
- **M3 — Core Analytical Sub-Agents:** Forecasting, Anomaly Detection, Trend/Correlation agents, each backed by real deterministic tools with backtests/validation. *Acceptance: each agent produces a result on a real dataset that the Critic/Verifier agent confirms is numerically consistent with the underlying tool output.*
- **M4 — Autonomous Orchestration:** Root Business Analyst decomposing a goal into a multi-agent task graph, running unattended end-to-end across built-in agents. *Acceptance: given only ingested data and a one-line goal, the system produces a structured report with zero further human input, fully traceable.*
- **M5 — Desktop App Shell:** Power-BI-style IA, dockable agent panel, spreadsheet-parity grid, theming, first-run key/model setup. *Acceptance: the M4 autonomous run is triggerable and fully inspectable from inside the installed desktop app on both Windows and macOS, with no external runtime dependency at install time.*
- **M6 — Visualization & Reporting:** chart-spec generation, structured report/dashboard export, lineage/audit view. *Acceptance: the M4 run also produces a rendered in-app dashboard and an exportable report, both click-through auditable.*
- **M7 — Untrusted Plugin Runtime:** implement the per-OS sandbox launcher (Landlock/bubblewrap, macOS Sandbox, AppContainer/Job Objects), the mediated-I/O RPC broker, the manifest format, and the plugin management pane's capability-review/consent UI. *Acceptance: a sample third-party Python (and separately, Node) plugin — deliberately written to attempt an out-of-scope filesystem read and an out-of-scope network call — is installed, has both attempts blocked by the sandbox, and the user could see and had approved its declared manifest before install.*
- **M8 — Packaging & Distribution:** signed Windows/macOS installers, auto-update pipeline, plugin publishing docs for contributors. *Acceptance: a third party installs the app on a clean machine, brings their own key, and runs an autonomous analysis without installing anything else — while a contributor can publish a plain Python or Node plugin package that a user installs entirely inside the app.*
- **M9 — Hardening:** security review of the per-OS sandbox implementations and the mediated-I/O broker (adversarial testing against known sandbox-escape techniques per platform), key storage review, performance pass on large files/datasets, accessibility pass on the desktop app, full lineage/audit review against §2's competitive table.

You may add milestones but must not compress this list to hit a deadline — flag schedule pressure to me instead of silently cutting acceptance criteria.

---

## 8. WHAT SUCCESS LOOKS LIKE

At any point, I should be able to ask: *"Point me to where in the code this happens,"* for any item in §2's competitive table, any agent in §4, and any tool in §5 — and get a real answer backed by `PROGRESS.md`, `DECISIONS.md`, and working, tested code. Install size and idle resource footprint are tracked the same way — if either creeps up without a logged, justified reason in `DECISIONS.md`, that's a regression, not a rounding error. And for the plugin trust model specifically: I should be able to ask "what stops a malicious plugin from reading a file it wasn't granted," and get a concrete two-layer answer (OS sandbox denial + no useful RPC surface), not a policy statement. If you can't answer any of this, that's the signal to stop feature-sprawling and go verify.

You are the engineer. I am the product owner. Build like this is meant to outlive both of our attention spans — and to stay something a person can install in thirty seconds and a contributor can extend in an afternoon, without either of them needing Docker or a new programming language to do it.
