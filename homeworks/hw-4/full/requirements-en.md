# HW-4 Full Requirements: English Interpretation

Source page:

```text
https://ai-swe-1.thinknetica.com/week/4/homework/
```

## Assignment Theme

Verification, process state, `run-loop`, and `verification-loop`.

The homework has two connected tasks:

1. Build two small improvement loops for source artifacts: `Brief` and `Spec`.
2. Combine them into one large SDLC execution loop that preserves state and can stop/resume.

## Task 1: Two Small Loops

Create:

- `brief improve loop`: brings a `Brief` to a workable state.
- `spec improve loop`: brings a `Spec` package to a workable state.

Each loop must be described as a Markdown process spec with:

- one suitable process diagram;
- entry criteria;
- exit criteria;
- escalation rules;
- a list of artifacts the runner must update or return.

Working order:

1. Grow the loop manually by running the prompt several times in a session until it reliably improves the artifact.
2. Freeze the loop as files: `process spec` plus prompt.
3. Create a runner script that accepts a prompt file and a path to one file or a package of files to review, then launches the agent in that loop.

Allowed runner shapes:

- one universal runner for both loops;
- two separate runners if simpler.

## Task 2: Large Feature Execution Loop With State

Create one large cycle that drives a task through the SDLC with saved state.

The large loop must include:

1. `brief improve loop` through the Task 1 runner.
2. `spec improve loop` through the Task 1 runner.
3. implementation by implementation plan.
4. checks: tests, lint, typecheck, local or CI signals available in the project.
5. safe deployment or stage deployment if the project really has one.
6. feature verification in stage or another safe/reproducible verification contour.
7. a fix loop for findings discovered during verification.
8. state saving after each meaningful stage in at least `active-context.md` plus one or two additional state artifacts.

If the project has no real `stage`, use an equivalent safe contour such as local smoke, test bench, preview environment, or other reproducible verification contour.

## Required Trace And Report

Submit a short trace and report that show:

- which task or process was run;
- how the cycle was split into stages;
- which runners were actually used;
- which state files were updated;
- where stop/resume happened;
- whether the run ended as `done`, `blocked`, or `escalation`.

## Expected Deliverables

- two small process specs: `brief improve loop` and `spec improve loop`;
- prompt files for those loops;
- runner script(s) for the small loops;
- one large cycle for feature or task execution;
- a state-pack of 2-3 files that allows safe continuation;
- a short trace and report for one real run of the large cycle.

## Quality Levels

### Basic

- two small loops are described;
- a runner exists;
- one large cycle is assembled;
- a 2-3 artifact state-pack exists;
- at least one stop and one resume are shown;
- a short trace and report are attached.

### Advanced

- the large cycle really reuses the small loops;
- verification includes real checks;
- state files are updated across multiple stages;
- trace/report shows `done`, `blocked`, or `escalation`.

### Excellent

- the large cycle drives the task through a safe deploy or stage-equivalent contour;
- there is an explicit HITL/escalation moment;
- the runner is reusable and not tied to one case.
