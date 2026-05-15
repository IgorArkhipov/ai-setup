# Prompt: Brief Improve Loop

Work according to `homeworks/hw-4/full/process-specs/brief-improve-loop.md`.

Inputs:

- source issue path;
- draft brief path;
- target improved brief path;
- runner state directory.

Rules:

1. Read the source issue and draft brief before writing.
2. Improve the brief in English.
3. Preserve the actual task boundary. Do not invent product requirements.
4. Make problem, desired outcome, scope, non-scope, acceptance, and open questions explicit.
5. If required context is missing, write a concrete open question instead of guessing.
6. Return a runner result with status `done`, `blocked`, or `escalation`.

Expected output sections:

- improved brief;
- checks performed;
- changes made;
- open questions;
- status;
- next action.
