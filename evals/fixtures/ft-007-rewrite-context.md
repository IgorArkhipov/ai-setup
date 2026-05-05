# Legacy brief-style input

See the attached FT-007 brief:

---

Feature title: Audit History Export Command

Problem:
Users can restore from backup ids and inspect local audit state, but there is no compact command for exporting one project's audit history for troubleshooting or compliance sharing.

Requested slice:
- add an `agentscope audit export` command for one project
- support human-readable summary output and JSON output
- allow the same root overrides used by other stateful commands
- export only AgentScope-owned audit history, not provider-managed files

Constraints:
- keep the change read-only with respect to provider-managed files
- reuse the existing app-state conventions instead of inventing a second storage root
- keep output deterministic enough for fixture-backed tests

Out of scope:
- remote sync
- dashboard work
- editing audit records
- changing backup or restore semantics

Verification direction:
- automated tests should cover the command surface and exported payload shape
- a built CLI sanity check against fixture or sandbox state is enough for the manual layer

---

# Flawed draft to rewrite

title: "FT-007 audit export spec"

This spec adds audit export.

## Scope

- Export audit history
- Maybe add filters later if needed

## Plan

1. Add a new command file.
2. Write parser code.
3. Update tests.
4. Ship it.

## Notes

- We should probably use `spec.md` first and figure out the plan afterward.
- Verification can happen during implementation.
- The final command should be simple and robust.

---

# Findings to address

1. The draft uses the wrong document boundary for the current governed flow. `feature.md` is the canonical owner, while step-by-step execution belongs in `implementation-plan.md` after the feature reaches Design Ready.
2. The draft is missing the governed `What`, `How`, and `Verify` structure and does not define the required stable identifiers such as `REQ-*`, `NS-*`, `SC-*`, `CHK-*`, and `EVID-*`.
3. Verification is underspecified. The draft does not include exit criteria, a traceability matrix, executable checks, or an evidence contract.
4. The wording is vague in places such as "simple", "robust", and "if needed" without measurable definitions.
