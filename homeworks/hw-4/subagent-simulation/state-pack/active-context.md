# Active Context

## Current Goal

Prove that an isolated subagent can resume a saved HW-4 process by reading only the runner prompt plus process-state artifacts on disk.

## Current Process

`homeworks/hw-4/process-spec.md`

## Current Step

`subagent-resume-evidence`: create a dedicated evidence file showing that the saved active context and handoff were consumed before action.

## In Progress

- The main homework package already contains a process spec, runner prompt, state-pack, trace, and report.
- A reviewer questioned whether the runner actually used the saved handoff and active context.
- This simulation exists to produce clearer evidence from a fresh subagent with no inherited chat context.

## Verified Facts

- The runner prompt for this simulation is `homeworks/hw-4/subagent-simulation/runner-prompt.md`.
- The subagent must not modify the simulation state files.
- The only writable artifact for the subagent is `homeworks/hw-4/evidence/subagent-runner-resume-2026-05-14.md`.

## Open Risks

- If the subagent writes generic prose without naming the facts extracted from this file and the handoff, the simulation fails its purpose.
- If the subagent edits files outside its write ownership, the simulation is not clean evidence.

## Next Check

After the subagent returns, verify that `homeworks/hw-4/evidence/subagent-runner-resume-2026-05-14.md` exists and names the active-context and handoff facts it used.
