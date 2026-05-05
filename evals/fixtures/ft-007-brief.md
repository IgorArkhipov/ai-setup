# Legacy brief-style input for FT-007

Target canonical heading: `# FT-007: Audit History Export Command`

Feature title: Audit History Export Command

Problem:
Users can restore from backup ids and inspect local audit state, but there is no compact command for exporting one project's audit history for troubleshooting or compliance sharing. Today they have to inspect raw files under the app-state root, which is awkward and easy to misread.

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
