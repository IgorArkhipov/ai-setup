---
title: Coding Style
doc_kind: engineering
doc_function: convention
purpose: Repository coding style for the active `tools/agentscope` TypeScript package: strict typing, ESM conventions, module boundaries, tooling, and change discipline.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Coding Style

## General Rules

- Keep production code in `tools/agentscope/src/` and tests in `tools/agentscope/test/`.
- Preserve the current architecture split from [../domain/architecture.md](../domain/architecture.md): command surface, core runtime, provider adapters, and verification baseline each keep their own responsibilities.
- Prefer small pure helpers and explicit data transformations over stateful abstractions.
- Add comments only when they explain a non-obvious boundary condition, safety rule, or why a choice exists.
- Do not hand-edit `tools/agentscope/dist/`; regenerate it with `npm run build`.

## Tooling Contract

The canonical formatter and linter for the package is Biome via the root `biome.jsonc`.

Run from `tools/agentscope`:

```bash
npm run lint
npm run format
```

Project-wide consequences:

- `npm run lint` maps to Biome checks across the repository through `../../biome.jsonc`
- formatting changes should come from Biome rather than ad hoc restyling
- shell and GitHub Actions linting are owned by repository CI, not by package-local npm scripts

## TypeScript And Node Conventions

- Use ESM with `module` and `moduleResolution` set to `NodeNext`.
- Use `.js` suffixes in local TypeScript import specifiers so emitted ESM stays correct.
- Keep the codebase compatible with Node.js `>=25.9.0`.
- Respect strict compiler settings: `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` are enabled.
- Prefer `import type` for type-only imports.
- Prefer explicit interfaces and discriminated shapes over `any` or opaque objects.
- Parse unknown JSON as `unknown` first, then narrow with local guards.
- Favor built-in Node modules before adding new dependencies.

## Package-Specific Conventions

- `src/cli.ts` and `src/commands/*` should stay thin and focus on argument handling, exit codes, and output dispatch.
- `src/core/*` owns shared config loading, path resolution, discovery orchestration, output formatting, and guarded mutation primitives.
- `src/providers/*` owns provider-specific file formats, root conventions, normalization, and write planning for supported providers.
- Do not duplicate provider-specific path or schema knowledge inside command modules or generic core helpers.
- Configuration is file-based JSON plus CLI flags. Do not introduce `.env`-driven behavior for AgentScope.

## Testing And Fixture Style

- New tests should live near the existing suite in `tools/agentscope/test/`.
- Prefer committed fixtures when modeling provider file formats or normalized discovery output.
- Prefer temp sandboxes for writable mutation tests.
- Keep fixtures intentionally narrow: encode only the structure required to prove the behavior.
- When output contracts matter, assert on stable user-visible strings or parsed JSON payloads rather than incidental whitespace.

## Change Discipline

- Do not rewrite unrelated code for stylistic consistency alone.
- Follow the local file style when touching existing code unless it conflicts with a canonical rule here.
- If a change crosses module boundaries, update the owning documentation rather than leaving new behavior implicit.
- If commands, paths, or verification expectations change, update `tools/agentscope/README.md` and the governed docs that describe the same contract.
