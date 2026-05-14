# Runner Prompt: Memory-Bank Long-Run Feature Execution

Use this prompt to run one bounded iteration of `process-spec.md`.

```text
Work according to `homeworks/hw-4/process-spec.md`.

Current process-state artifacts:
- `homeworks/hw-4/state-pack/active-context.md`
- `homeworks/hw-4/state-pack/session-handoff.md`, if present
- `homeworks/hw-4/traces/stop-resume-trace.md`

Rules:
1. Read the process spec before acting.
2. Read `active-context.md` and reconcile `session-handoff.md` if it exists.
3. Identify the current step from the state pack.
4. Execute only one bounded process step.
5. Do not change canonical memory-bank scope, acceptance criteria, or architecture inside this runner.
6. Record changed artifacts and verification facts before deciding status.
7. Return exactly one status: `continue`, `done`, `blocked`, or `escalation`.
8. If stopping before `done`, write or rewrite `session-handoff.md`.
9. If resuming from a handoff, append a resume event to `traces/stop-resume-trace.md`.

End the response with:
- step worked;
- artifacts changed;
- checks performed;
- process status;
- next action or stop reason.
```

## Expected Machine-Checkable Footer

The runner response should end with this shape:

```text
Process status: <continue|done|blocked|escalation>
Step worked: <step id or name>
Artifacts changed: <comma-separated paths>
Checks performed: <commands or manual checks>
Next action: <exact next action, or none>
Stop reason: <none, blocker, escalation, or done>
```
