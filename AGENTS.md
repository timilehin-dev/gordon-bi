# AGENTS & SUB-AGENTS LIVING MAP

This document defines the prompt contracts, execution modes, tool access scopes, and success criteria for every agent and sub-agent in the system.

---

## 1. BUILT-IN AGENT ROSTER

### 1. Root Business Analyst / Orchestrator [MVP]
- **Type:** Built-in
- **Execution Mode:** In-Process (Async Task / Worker Thread)
- **Role:** Central orchestrator; decomposes high-level business goals into a Directed Acyclic Graph (DAG) of sub-agent tasks, delegates execution, arbitrates conflicts, triggers human checkpoints when needed, and aggregates the final verified deliverable.
- **Allowed Tools:** `task_graph_create`, `task_graph_update`, `delegate_agent`, `request_human_checkpoint`, `lineage_query`, `report_assemble`.
- **Success Criteria:** Generates complete, logically sound execution plans; produces zero unverifiable claims; handles task failures gracefully.

---

### 2. Data Engineering Agent [MVP]
- **Type:** Built-in
- **Execution Mode:** Supervised OS Subprocess (Resource-capped: CPU/RAM limits, timeout, restart policy)
- **Role:** Ingests and profiles structured tabular files (CSV, XLSX, JSON), unstructured/semi-structured business documents (Markdown, PDF, DOCX), and external data sources via managed MCP servers. Normalizes data into DuckDB tables and chunked citable document stores; flags PII and type anomalies.
- **Allowed Tools:** `fs_read_sandboxed`, `csv_profile_load`, `excel_profile_load`, `json_flatten_load`, `pdf_extract`, `docx_extract`, `markdown_parse_chunk`, `duckdb_schema_create`, `pii_scan`.
- **Success Criteria:** Correct schema inference, zero silent parsing failures, comprehensive PII tagging, chunk indexing with page/offset metadata.

---

### 3. Forecasting Agent [MVP]
- **Type:** Built-in
- **Execution Mode:** In-Process (Async Pure Compute)
- **Role:** Executes time-series forecasting, trend/seasonality decomposition, candidate model evaluation (ARIMA, ETS, Splines), rolling backtesting, and generates confidence intervals.
- **Allowed Tools:** `ts_decompose`, `ts_forecast_arima`, `ts_forecast_ets`, `ts_backtest_score`, `ts_confidence_interval`.
- **Success Criteria:** Selects candidate models objectively using backtest MAPE/RMSE; outputs structured forecast arrays with explicit confidence bounds.

---

### 4. Anomaly Detection Agent [MVP]
- **Type:** Built-in
- **Execution Mode:** In-Process (Async Pure Compute)
- **Role:** Executes statistical and ML-based anomaly, outlier, and change-point detection across single or multi-variable time series and relational datasets. Supports scheduled monitoring.
- **Allowed Tools:** `stat_zscore_iqr_scan`, `ml_isolation_forest`, `ts_changepoint_detect`, `anomaly_cluster_score`.
- **Success Criteria:** Flags statistically significant deviations with clear scoring metrics, baseline comparison, and confidence levels.

---

### 5. Insight / Narrative Generation Agent [MVP]
- **Type:** Built-in
- **Execution Mode:** In-Process
- **Role:** Assembles multi-agent findings, data summaries, forecasts, and anomaly records into structured, executive-ready narratives. Ensures every single claim and number is tagged with a deterministic citation link back to the query/tool lineage ID.
- **Allowed Tools:** `lineage_fetch_record`, `narrative_format_section`, `citation_attach_link`, `summary_structure_build`.
- **Success Criteria:** 100% of numerical assertions cite a valid tool execution ID; zero hallucinatory narrative claims.

---

### 6. Semantic-Layer / Modeling Agent
- **Type:** Built-in
- **Execution Mode:** In-Process
- **Role:** Infers and maintains the relationship graph (PK/FK joins), defines measures/calculated metrics (DAX/SQL-like formulas), and exposes a clean semantic catalog for the UI and other agents.
- **Allowed Tools:** `schema_graph_build`, `relationship_define`, `measure_register`, `measure_evaluate`.

---

### 7. Trend & Correlation Agent
- **Type:** Built-in
- **Execution Mode:** In-Process
- **Role:** Performs cross-variable discovery, multivariate regression, cohort analysis, and driver/attribution breakdowns.
- **Allowed Tools:** `correlation_matrix_calc`, `regression_driver_fit`, `cohort_segment_analyze`.

---

### 8. SQL / Query Agent
- **Type:** Built-in
- **Execution Mode:** In-Process
- **Role:** Translates natural language questions into valid, optimized SQL queries against the local DuckDB semantic layer. Validates syntax and dry-runs queries before returning data.
- **Allowed Tools:** `duckdb_dry_run`, `duckdb_execute_query`, `sql_validate_ast`.

---

### 9. Visualization Agent
- **Type:** Built-in
- **Execution Mode:** In-Process
- **Role:** Translates analytical questions and results into declarative chart specifications (Vega-Lite / custom BI spec) for native desktop canvas rendering.
- **Allowed Tools:** `chart_spec_generate`, `palette_resolve`, `visual_layout_optimize`.

---

### 10. Critic / Verifier Agent (Cross-Cutting QA)
- **Type:** Built-in (Cross-Cutting QA)
- **Execution Mode:** In-Process (Independent Verification Pass)
- **Role:** Adversarially audits all outputs and claims produced by other agents against the raw tool output records in the Lineage Store before any output reaches the user. Rejects or corrects hallucinated, unverified, or inconsistent claims.
- **Allowed Tools:** `lineage_audit_verify`, `claim_number_extract_and_match`, `critic_report_flag`.
- **Success Criteria:** 100% detection of simulated numeric inconsistencies and unsourced claims.

---

## 2. COMMUNITY PLUGIN AGENTS (UNTRUSTED)
- **Execution Mode:** OS-Sandboxed Subprocess (Windows AppContainer/Job Object, macOS Sandbox, Linux Landlock/bubblewrap).
- **Communication:** Mediated I/O RPC over stdio / domain socket only.
- **Tool Access:** Strictly limited to capabilities declared in `manifest.json` and approved by the user.
