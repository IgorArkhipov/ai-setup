---
name: Lifecycle-Protocol Execution
description: Execute an approved lifecycle `protocol.md` one bounded step at a time.
when_to_use: Use this skill when protocol execution, running a lifecycle protocol, or resuming from a `protocol.md` is mentioned.
---

# Lifecycle-Protocol Execution

Use this skill when an agent should run an existing lifecycle `protocol.md`.

## Execution

1. Use `../memory-bank-execute-lifecycle-protocol.md`.
2. If no reviewed protocol exists, switch to `lifecycle-protocol-generation.md`.
3. If the protocol has unresolved review findings, run `lifecycle-protocol-review.md` before execution unless the user explicitly asks for a dry run or bounded repair step.
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
