# Subagent Runner Prompt: Resume From Saved State

Use this prompt to run one bounded resume iteration for the HW-4 subagent simulation.

```text
Work according to `homeworks/hw-4/process-spec.md`.

Current process-state artifacts:
- `homeworks/hw-4/subagent-simulation/state-pack/active-context.md`
- `homeworks/hw-4/subagent-simulation/state-pack/session-handoff.md`
- `homeworks/hw-4/subagent-simulation/traces/runner-trace.md`, if present

Your write ownership is only:
- `homeworks/hw-4/evidence/subagent-runner-resume-2026-05-14.md`

Rules:
1. Read the process spec before acting.
2. Read `active-context.md` and `session-handoff.md` before writing anything.
3. Identify the current step from those saved state files.
4. Execute only one bounded process step: create the evidence file named above.
5. Do not edit the process spec, report, active context, handoff, or trace files.
6. Record which saved facts you used from active context and handoff.
7. Return exactly one status: `continue`, `done`, `blocked`, or `escalation`.

The evidence file must include:
- runner input files read;
- current goal extracted from active context;
- stop reason extracted from handoff;
- next action extracted from handoff;
- decision made from those saved facts;
- artifact written;
- machine-checkable footer.

End the evidence file with this footer:

Process status: <continue|done|blocked|escalation>
Step worked: <step id or name>
Artifacts changed: <comma-separated paths>
Checks performed: <files read and checks performed>
Next action: <exact next action, or none>
Stop reason: <none, blocker, escalation, or done>
```
