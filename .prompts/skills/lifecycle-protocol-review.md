---
name: Lifecycle-Protocol Review
description: Review a lifecycle `protocol.md` before agents use it for execution.
when_to_use: Use this skill when a lifecycle protocol, generated protocol, or `protocol.md` needs review before execution.
---

# Lifecycle-Protocol Review

Use this skill to review a lifecycle `protocol.md` before execution starts or resumes from it.

## Execution

1. Use `../memory-bank-review-lifecycle-protocol.md`.
2. If any criterion fails, fix the protocol and review again through `review-loop.md`.
3. If source interpretation, lifecycle state, or execution safety is uncertain, trigger Claude Code MCP through `review-loop.md`.

## Preserve

- source interpretation quality;
- clear goal and boundaries;
- current facts separated from hypotheses;
- H1/H2/H3 gate discipline;
- hard stops for production, secrets, destructive actions, unrelated diffs, missing rollback, and unclear approval;
- lifecycle state and transition clarity;
- executable step contracts;
- observable evidence after each step;
- safe pause, resume, blocked, and escalation behavior;
- rollback before risky actions;
- one concrete Next Action;
- no redefinition of upstream governed facts.
