---
title: "FT-013: Feature Package"
doc_kind: feature
doc_function: index
purpose: "Navigation for the toggle command target-state parity feature. Read protocol.md first, then feature.md and implementation-plan.md."
derived_from:
  - ../../dna/governance.md
  - protocol.md
  - feature.md
status: active
audience: humans_and_agents
---

# FT-013: Feature Package

## About This Section

This feature package closes the remaining original-plan gap in the `agentscope toggle` command surface.

The original plan names `agentscope toggle <provider> <kind> <id> --layer <layer> [--enable|--disable] [--apply]`. The current implementation safely toggles selected items, but it only accepts selector flags and always flips the discovered state. FT-013 keeps the existing guarded mutation engine and adds the missing positional selector and explicit target-state controls.

## Annotated Index

- [`protocol.md`](protocol.md)
  Lifecycle state, gates, execution record, and safety constraints.

- [`feature.md`](feature.md)
  Canonical scope, contracts, acceptance scenarios, and verification.

- [`implementation-plan.md`](implementation-plan.md)
  Execution steps, checks, and evidence records.
