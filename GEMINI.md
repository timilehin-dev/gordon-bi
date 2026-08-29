# GENERAL RULES & ARCHITECTURAL DIRECTIVES

## 1. STRICT NO-MONOLITH RULE & CATEGORICAL DIRECTORY STRUCTURE
- **Monolithic Files are Strictly Prohibited:** Never place multiple services, broad abstractions, or entire layers into monolithic or "catch-all" files (e.g., `utils.ts`, `services.ts`, `all_tools.py`, `helpers.py`, `agent_all.rs`).
- **Categorical Folder Structure:** Every domain, service, agent, tool, data substrate module, and UI component must reside in its own dedicated, categorical subdirectory reflecting its specific domain boundary.
- **Service Isolation & Modular Breakdown:** Every individual service/module must be decomposed into dedicated, single-responsibility files:
  - `types.ts` / `contracts.rs` / `interfaces.py` — Typed contracts, schemas, and interfaces.
  - `service.ts` / `engine.rs` / `handler.py` — Core domain logic and execution.
  - `schema.ts` / `validators.ts` — Input/output validation and invariants.
  - `errors.ts` — Domain-specific error types and error handling.
  - `tests/` or `*.test.ts` / `*.spec.ts` — Independent unit and verification tests.
- **Open-Source Readability & Debuggability:** Architecture must be cleanly organized and self-documenting, enabling any open-source contributor or researcher to immediately locate, study, test, and debug any isolated service without cognitive overload.
