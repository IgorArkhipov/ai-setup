# Repository Instructions

See `PROJECT.md` for the project description. Do not read or use `.env*` files.

## Source Of Truth

- `memory-bank/` is the governed documentation system for this repository.
- Only documents with `status: active` are authoritative.
- If authoritative documents conflict, upstream wins in this order:
  1. `canonical_for`
  2. `derived_from`
- Code owns implementation details. `memory-bank/` owns intent, rationale, contracts, and workflow state.

## Reading Order

- Start with `memory-bank/README.md`.
- Then read only the relevant index and canonical docs for the task:
  - product and context: `memory-bank/domain/README.md`
  - engineering rules: `memory-bank/engineering/README.md`
  - workflow and lifecycle rules: `memory-bank/flows/README.md`
  - feature packages: `memory-bank/features/README.md`
  - operations and config: `memory-bank/ops/README.md`

## Workflow Rules

- Route work using `memory-bank/flows/workflows.md`.
- Use the smallest workflow that safely fits the task.
- For medium or large features, follow `memory-bank/flows/feature-flow.md`.
- Do not create downstream execution artifacts before the upstream feature intent is mature enough.

## Documentation Maintenance

- Update the canonical owner first, then sync downstream documents.
- If you add, remove, or rename a governed document, update the parent `README.md`.
- If you discover a documentation conflict outside the current task scope, report it as a finding instead of silently repairing it.
- Keep links annotated and preserve two-way navigation between docs and code.

## Temporary Migration Note

- The repository is not yet fully migrated to the new feature-package format.
- Existing `memory-bank/features/*/brief.md`, `spec.md`, and `plan.md` are legacy artifacts.
- Until migration is complete:
  - treat `spec.md` as the nearest canonical feature-intent document
  - treat `plan.md` as the execution document
  - do not create new legacy `brief/spec/plan` packages for new work
  - prefer the target framework shape `memory-bank/features/FT-XXX/{README.md,feature.md,implementation-plan.md}` for new feature packages

## Stack

TypeScript, Node.js 25.9+, Biome, Vitest, GitHub Actions

## Project Layout

- `tools/agentscope` contains the application code, tests, and npm package metadata
- `.github/workflows/ci.yml` is the canonical CI workflow for the repository
- Root-level `docs/` and `memory-bank/` directories are project planning and reference material

## Repo Conventions

- `tools/agentscope` is the active code project
- Keep production code in `src/` and tests in `test/`
- Follow the existing ESM and strict TypeScript style already used in `tools/agentscope`
- Use the root `biome.jsonc` and workspace `.vscode/settings.json` as the default linting and formatting setup for supported file types
- Prefer fixture-backed tests for provider discovery, CLI, and mutation behavior
- Do not hand-edit `dist/`; regenerate it from source with `npm run build`
- Update CI and README documentation when commands, coverage expectations, or project structure change
- Keep CI changes in `.github/workflows/ci.yml` unless there is a strong reason to split workflows
- Avoid adding new dependencies unless they are required for the requested work

## Key Commands

Run these from `tools/agentscope`:

- `npm ci` - install dependencies
- `npm test` - run the Vitest suite
- `npm run coverage` - run tests with coverage reporting and thresholds
- `npm run build` - compile `src/` into `dist/`
- `npm run lint` - run Biome checks against the repository
- `npm run format` - run Biome fixes and formatting across supported repo files
