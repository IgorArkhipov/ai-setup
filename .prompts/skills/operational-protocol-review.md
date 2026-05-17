---
name: Operational-Protocol Review
description: Review an operational `protocol.md` before agents use it for execution.
when_to_use: Use this skill when an operational protocol, generated operational protocol, or operational `protocol.md` needs review before execution.
---

# Operational-Protocol Review

Use this skill to review an operational `protocol.md` before execution starts or resumes from it.

## Execution

1. Use `../memory-bank-review-operational-protocol.md`.
2. If any criterion fails, fix the protocol and review again through `review-loop.md`.
3. If the workflow may need a lifecycle protocol instead, stop and escalate that routing decision before execution.
4. If source interpretation, gate safety, rollback, or execution safety is uncertain, trigger Claude Code MCP through `review-loop.md`.

## Preserve

- operational-workflow fit;
- source interpretation quality;
- clear goal and boundaries;
- baseline evidence;
- H1/H2/H3 gate discipline;
- hard stops for secrets, unclear rollout ownership, missing rollback, and workflow-specific risks;
- verification separated from acceptance decisions;
- rollback before risky actions;
- one concrete Next Action;
- no redefinition of upstream governed facts.
