---
name: Operational-Protocol Generation
description: Create or update an English operational `protocol.md` for a specific workflow, then review it.
when_to_use: Use this skill when operational protocol generation, creating an operational `protocol.md`, or preparing a specific operational workflow is mentioned.
---

# Operational-Protocol Generation

Use this skill when an agent needs to turn source material, user instructions, or an operational workflow into a reusable operational `protocol.md`.

## Execution

1. Use `../memory-bank-create-operational-protocol.md`.
2. Interpret source material into English before drafting.
3. Use the full local operational-protocol template at `../../memory-bank/flows/templates/protocol/operational-protocol.md`, including Status `draft`, Current phase `ready_to_execute`, Current gate `H0`, Human Gates H1/H2/H3, Hard Stop Conditions, Rollback, Evidence Log, and one concrete Next Action.
4. If the work still needs upstream lifecycle phases before execution, switch to `lifecycle-protocol-generation.md`.
5. If the prompt reports missing minimum inputs, stop and collect those inputs before drafting.
6. Immediately follow with `operational-protocol-review.md`.
7. If review finds issues or the protocol changes materially, use `review-loop.md`.

## Preserve

- English source interpretation before protocol authoring;
- specific operational workflow boundary;
- current state in `protocol.md`, not chat memory;
- clear goal, scope, current facts, roles, permissions, gates, hard stops, verification, rollback, and one next action;
- repository-native governed document names instead of new legacy packages.
