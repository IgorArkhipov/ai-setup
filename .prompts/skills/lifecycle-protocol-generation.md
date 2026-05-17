---
name: Lifecycle-Protocol Generation
description: Create or update an English lifecycle `protocol.md` for a repeatable agent workflow, then review it.
when_to_use: Use this skill when protocol generation, lifecycle protocol creation, or authoring a `protocol.md` is mentioned.
---

# Lifecycle-Protocol Generation

Use this skill when an agent needs to turn source material, user instructions, or a workflow idea into a reusable lifecycle `protocol.md`.

## Execution

1. Use `../memory-bank-create-lifecycle-protocol.md`.
2. Protocol comes before Brief-level work and before risky actions; preserve that ordering in repository vocabulary.
3. Use the full local lifecycle-protocol template at `../../memory-bank/flows/templates/protocol/lifecycle-protocol.md`, including Status `draft`, Current phase `protocol_review`, Current gate `H0`, Human Gates H1/H2/H3, Hard Stop Conditions, Rollback, Evidence Log, and one concrete Next Action.
4. If the source page or document is inaccessible, say so and use only the available excerpt or user-provided summary.
5. If the prompt reports missing minimum inputs, stop and collect those inputs before drafting.
6. Immediately follow with `lifecycle-protocol-review.md`.
7. If review finds issues or the protocol changes materially, use `review-loop.md`.

## Preserve

- English source interpretation before protocol authoring;
- protocol-before-risky-action ordering;
- process method plus external state in `protocol.md`, not chat memory;
- explicit goal, scope, current facts, roles, permissions, entry criteria, exit criteria, lifecycle states, and transitions;
- observable runner contract with `continue`, `done`, `blocked`, and `escalation`;
- evidence, rollback, handoff, and human-in-the-loop gates;
- repository-native governed document names instead of new legacy `brief.md`, `spec.md`, or `plan.md` packages.
