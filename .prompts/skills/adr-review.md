---
name: ADR Review
description: Review a governed ADR before downstream work treats it as canonical input.
when_to_use: Use this skill when an ADR exists and needs a governed review gate before acceptance.
---

# ADR Review

Use this skill to review a governed ADR before it becomes canonical input for downstream work.

## Execution

1. Use `../memory-bank-review-adr.md`.
2. If any criterion fails, fix the ADR and review again through `review-loop.md`.
3. If independent confirmation is needed, trigger Claude Code MCP through `review-loop.md`.

## Preserve

- real options, not strawmen;
- decision-status-consistent wording;
- concrete consequences, risks, and follow-up;
- no drift into current-state notes or implementation planning.
