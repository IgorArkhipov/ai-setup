Status: needs_polish
Target artifact: memory-bank/features/FT-008-clear-run/protocol.md
Open findings: 2

## Verdict

- Ready: `no`
- Summary: The protocol has the right boundary and honestly records that FT-008 already exists, but the execution contract needs two polish fixes before downstream simulated docs are created. The current draft implies entry and exit behavior, yet does not name those criteria explicitly enough for a fresh executor to prove ordering without chat context.

## Criteria Check

| Criterion | Pass/Fail | Notes |
| --- | --- | --- |
| 1 | Pass | Source material is named in Source Interpretation. |
| 2 | Pass | Existing downstream FT-008 docs/code are recorded as baseline; the virtual package starts with protocol only. |
| 3 | Pass | The artifact is a lifecycle protocol, not an implementation plan. |
| 4 | Pass | Goal and scope are understandable. |
| 5 | Pass | Facts and hypotheses are separated. |
| 6 | Pass | Roles and permissions are concrete. |
| 7 | Pass | H1/H2/H3 boundaries are present. |
| 8 | Pass | Hard stop conditions include required categories. |
| 9 | Pass | Verification is separate from release. |
| 10 | Pass | Rollback is described before risky actions. |
| 11 | Pass | Evidence Log exists. |
| 12 | Pass | Next Action contains one concrete action. |
| 13 | Fail | Lifecycle states and transitions are mostly present, but explicit entry and exit criteria are missing. |
| 14 | Pass | Mermaid flow matches the written step order. |
| 15 | Fail | Phase 2 does not require an explicit pre-creation absence check proving no downstream docs existed before protocol acceptance. |
| 16 | Pass | Observable runner statuses are restricted to the allowed values. |
| 17 | Pass | State and Next Action are resumable. |
| 18 | Pass | Existing FT-008 facts are treated as baseline, not redefined. |
| 19 | Pass | Legacy phase names are mapped to repository terms. |
| 20 | Pass | Open questions and limitations are explicit. |
| 21 | Pass | No durable primary feature registry update is needed for the virtual worktree-only package. |

## Findings

- Criterion 13; section `Execution Plan` and `Observable Runner Contract`: the protocol does not include explicit `Entry Criteria` and `Exit Criteria` sections. A fresh executor can infer them, but the lifecycle protocol template and execution prompt require those criteria to be named. Fix by adding explicit entry criteria before the execution plan and exit criteria before verification or in the runner contract.
- Criterion 15; section `Phase 2: Read-Only Protocol Execution`: the phase permits creating simulated docs after H1, but it does not require an evidence check showing those docs were absent before review acceptance. Fix by requiring the executor to record a before/after file-presence check for `README.md`, `feature.md`, and `implementation-plan.md` in `memory-bank/features/FT-008-clear-run/`.
