---
name: Operational-Protocol Execution
description: Execute an approved operational `protocol.md` one bounded step at a time.
when_to_use: Use this skill when operational protocol execution, running an operational protocol, or resuming from an operational `protocol.md` is mentioned.
---

# Operational-Protocol Execution

Use this skill when an agent should run an existing operational `protocol.md`.

## Execution

1. Use `../memory-bank-execute-operational-protocol.md`.
2. If no reviewed operational protocol exists, switch to `operational-protocol-generation.md`.
3. If the protocol has unresolved review findings, run `operational-protocol-review.md` before execution unless the user explicitly asks for a dry run or bounded repair step.
4. Start from `protocol.md`, especially `State`, `Human Gates`, `Hard Stop Conditions`, `Execution Plan`, and `Evidence Log`; do not resume from chat memory.
5. Execute one bounded protocol step or the one concrete Next Action by default. Continue across multiple steps only when the user and protocol explicitly authorize it.
6. After substantial work, update `State`, `Evidence Log`, `Open Questions`, `Decisions`, and `Rollback` as permitted by the protocol.
7. Return the protocol status exactly as `continue`, `done`, `blocked`, or `escalation`.

## Preserve

- current-state discovery before action;
- current-gate permission before action;
- no skipped transitions;
- no scope invented outside the protocol;
- artifact updates limited to the current step contract;
- explicit evidence and next action after every run.
