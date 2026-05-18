# Refactoring Analysis Candidates

## Baseline

- `rtk git status --short` showed unrelated existing changes in `.ai-setup/`, `.prompts/`, and `tools/agentscope/package*.json`.
- `tools/agentscope/package.json` defines `test`, `lint`, `coverage`, and `build` scripts, with Node `>=25.9.0` and ESM.
- `rtk npm run coverage` reproduced Operation 1's baseline risk: 23 test files and 162 tests passed, but branch coverage was `70.89%` against the configured `71%` threshold.

## Candidates

1. Centralize manifest fixture setup in `tools/agentscope/test/mutation-state.test.ts` and add focused manifest-validation cases for alternate valid manifest shapes and manifest listing order.
   - Evidence: `mutation-state.ts` supports nullable selection, sqlite-item targets, inline payloads, null `targetEnabled`, non-path backup entries, and deterministic newest-first manifest ordering, but the current tests mostly exercise path/blob manifests.
   - Strength: small, test-only, behavior-preserving, directly lowers the known coverage-threshold risk without changing production code.
   - Rollback: remove the helper and added test block from `mutation-state.test.ts`.

2. Extract repeated selected-item identity construction in `tools/agentscope/src/mcp/helpers.ts`.
   - Evidence: `planForItem` repeats the same selection object for self-target blocks and unsupported provider blocks.
   - Strength: pure production refactor with low behavior risk.
   - Rejected for this operation: it does not address the known verification blocker and would still leave H2 to decide on baseline coverage failure.

3. Extract manifest payload validation helpers in `tools/agentscope/src/core/mutation-state.ts`.
   - Evidence: `validateEntry` has nested payload validation for inline and blob payload shapes.
   - Strength: improves readability around manifest parsing.
   - Rejected for this operation: touches production parsing logic and is more intrusive than necessary for the available high-confidence improvement.

4. Add CLI coverage around uncovered `src/cli.ts` command paths.
   - Evidence: coverage text report shows `src/cli.ts` at `59.25%` branch coverage.
   - Strength: could improve the coverage threshold.
   - Rejected for this operation: broader command-surface testing is more likely to sprawl than the manifest-validation case.

## Selected Recommendation

Select candidate 1: centralize mutation backup manifest fixture setup in `mutation-state.test.ts` and add focused tests for sqlite-item inline-payload manifest loading plus deterministic manifest listing order.

Why stronger than alternatives:

- It is the smallest high-confidence option that is both a refactoring and coverage-adjacent.
- It stays entirely within an already clean test file.
- It verifies existing production behavior without changing runtime code.
- It can plausibly clear the `70.89%` branch coverage blocker without broad remediation.
