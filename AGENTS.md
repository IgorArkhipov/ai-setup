# Repository Instructions

See `PROJECT.md` for the project description.

## Stack

TypeScript, Node.js 25.9+, Biome, Vitest, GitHub Actions

## Project Layout

- `tools/agentscope` contains the actual application code, tests, and npm package metadata
- `.github/workflows/ci.yml` is the canonical CI workflow for the repository
- Root-level `docs/` and `memory-bank/` directories are project planning and reference material

## Key Commands

Run these from `tools/agentscope`:

- `npm ci` - install dependencies
- `npm test` - run the Vitest suite
- `npm run coverage` - run tests with coverage reporting and thresholds
- `npm run build` - compile `src/` into `dist/`
- `npm run lint` - run Biome checks against the repository
- `npm run format` - run Biome fixes and formatting across supported repo files

## Conventions

- Keep production code in `src/` and tests in `test/`
- Follow the existing ESM and strict TypeScript style already used in `tools/agentscope`
- Use the root `biome.jsonc` and workspace `.vscode/settings.json` as the default linting and formatting setup for supported file types
- Prefer fixture-backed tests for provider discovery, CLI, and mutation behavior
- Do not hand-edit `dist/`; regenerate it from source with `npm run build`
- Update CI and README documentation when commands, coverage expectations, or project structure change
- For feature-document workflows, use `docs/skills/README.md` and the focused docs in `docs/skills/` when generating or reviewing `brief`, `spec`, and `plan` documents

## Constraints

- `tools/agentscope` is the active code project
- Keep CI changes in the existing `.github/workflows/ci.yml` unless there is a strong reason to split workflows
- Avoid adding new dependencies unless they are required for the requested work
