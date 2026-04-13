---
title: Autonomy Boundaries
doc_kind: engineering
doc_function: canonical
purpose: Agent autonomy boundaries: what can be done without confirmation, which changes require a checkpoint, and when an agent must stop and ask.
derived_from:
  - ../dna/governance.md
canonical_for:
  - agent_autonomy_rules
  - escalation_triggers
  - supervision_checkpoints
status: active
audience: humans_and_agents
---

# Autonomy Boundaries

## Autopilot - do without confirmation

- edit code and tests within the scoped task, primarily under `tools/agentscope/src/` and `tools/agentscope/test/`
- update governed documentation in `memory-bank/` when it is part of the requested change
- run local verification such as `npm test`, `npm run coverage`, `npm run build`, and `npm run lint`
- add or update committed fixtures and temporary sandboxes used by the automated test suite
- regenerate `dist/` with `npm run build` when the build output must reflect source changes
- create local branches or worktrees when they help complete the task

## Supervision - do it, but show a checkpoint

- architectural changes that cross the documented boundaries between command surface, core runtime, provider adapters, and verification baseline
- new dependencies or changes that alter the package runtime surface
- changes to `.github/workflows/ci.yml`, release expectations, or repository verification policy
- changes to configuration precedence, config file schema, or root resolution behavior
- changes to guarded mutation semantics such as lock acquisition, backup persistence, fingerprint drift handling, audit logging, or restore behavior
- deleting source files, tests, fixtures, or governed documents

## Escalation - stop and ask

- the task would require reading or using `.env*` files
- requirements conflict between code and active governed docs and the correct source of truth is unclear
- the change would touch real provider-managed local state outside fixtures or disposable sandboxes
- the change would run `toggle --apply` or `restore` against a non-test environment
- a provider contract, supported root, or safety boundary appears to need expansion beyond what is documented
- two implementation approaches are both plausible and have materially different user-facing or safety trade-offs
- the task clearly expands beyond the requested scope

## Live-State Safety Rule

For this repository, fixture roots and temporary sandboxes are the default execution targets.

- prefer `tools/agentscope/test/fixtures/` and disposable temp directories when exercising the CLI;
- use explicit `--project-root`, `--app-state-root`, and `--cursor-root` overrides for local checks;
- do not inspect or mutate real home-directory provider config unless the user explicitly requests that exact action.

## Escalation Rule

If verification failures are not converging after two or three meaningful attempts, stop iterating on code alone. Re-check the upstream docs, the plan, and the environment assumptions, then surface the blocker explicitly.
