# Homework 5 Task 1 Clear Lifecycle Run

Start from this top-level feature/problem intention:

Run a clean, read-only lifecycle rerun for the already implemented FT-008 local AgentScope MCP control plane. The purpose is to demonstrate corrected lifecycle ordering, not to implement the feature again.

Lifecycle requirements:

- Use `.ai-setup/scripts/run-agent-workflow.sh` with workflow `lifecycle-feature`.
- Create `protocol.md` first from this top-level intention.
- Review and groom the protocol before creating downstream feature-development documents.
- Execute the approved protocol in read-only/simulated mode.
- During execution, create or simulate downstream feature-development documents only after the protocol permits them.
- Do not edit `tools/agentscope`.
- Do not read or use `.env*` files.
- Keep primary-repo evidence under `homeworks/hw-5/task-1-clear-run/`.
- In the isolated workflow worktree only, use a temporary virtual feature package such as `memory-bank/features/FT-008-clear-run/` if needed to satisfy stage artifact contracts.

Baseline facts to preserve honestly:

- FT-008 already exists in the primary repo as an implemented feature package.
- This run is not evidence that the original FT-008 implementation happened protocol-first.
- This run is evidence that the corrected lifecycle runner can start from a top-level intention, create and review a protocol first, and only then simulate downstream feature documentation under protocol control.

Expected final stop:

- The workflow should stop with `stop_reason: lifecycle_protocol_executed`.
