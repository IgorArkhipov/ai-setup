# Brief: Full HW-4 Process Evidence Package

## Problem

The preliminary HW-4 attempt captured useful process notes and later added an isolated subagent resume proof, but it does not yet demonstrate the full Week 4 assignment shape as a standalone evidence package.

The missing evidence is:

- two separate small improvement loops, one for `Brief` and one for `Spec`;
- runner prompt or script artifacts for those small loops;
- a larger SDLC loop that reuses the small loops instead of duplicating their logic;
- saved state updates across multiple stages;
- a trace or report from one real large-loop run, including stop/resume evidence and final status.

## Desired Outcome

Create a complete English HW-4 submission under `homeworks/hw-4/full/`.

The package should be reviewable without relying on the preliminary attempt, while still preserving that earlier attempt as historical context. A reviewer should be able to inspect the artifacts and see how the small loops, large loop, state files, run trace, and report satisfy the assignment requirements.

## Scope

In scope:

- interpret the full HW-4 requirements in English;
- create process specs for the `Brief` improvement loop and `Spec` improvement loop;
- create prompt files for the `Brief` and `Spec` improvement loops;
- provide a reusable small-loop runner artifact;
- define a larger feature/task execution loop that calls or reuses the small-loop runner;
- create a small state pack with meaningful stage transitions;
- capture a real run trace that names the runners used, records the stop/resume point, and reports final status;
- create a report that maps assignment requirements to saved evidence;
- keep all new homework artifacts under `homeworks/hw-4/full/`.

## Non-Scope

Out of scope:

- changes to production code in `tools/agentscope`;
- creating or configuring a real deployment environment;
- reading or using `.env*` files;
- replacing or rewriting the preliminary HW-4 attempt outside the full-package directory;
- adding requirements that are not present in the HW-4 issue or assignment evidence needs.

## Acceptance Signals

The work is acceptable when:

- all new artifacts for this full attempt are saved under `homeworks/hw-4/full/`;
- the package includes separate `Brief` and `Spec` small-loop process specs;
- the package includes prompts or runner inputs for both small loops;
- the large loop explicitly reuses the small-loop runner;
- the state pack contains 2-3 files and records meaningful stage transitions;
- the run trace names the actual runners used and identifies the stop/resume point;
- the final report maps HW-4 requirements to concrete evidence files;
- repository verification commands pass.

## Open Questions

- Which exact repository verification commands should be treated as required for final acceptance of this homework package?
- Should the reusable small-loop runner be implemented only as documented prompt/process artifacts, or should it also include an executable script?
