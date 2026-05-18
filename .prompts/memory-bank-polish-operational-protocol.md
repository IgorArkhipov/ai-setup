You are polishing an operational `protocol.md` after review.

Constraints:
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as authoritative.
- Read the target `protocol.md`, the previous stage result, and the review findings before editing.
- If the operational protocol belongs to a feature package, also read the sibling `feature.md`, `implementation-plan.md` if it exists, and the feature-package `README.md`.
- Fix only the reviewed protocol and directly related navigation or evidence notes needed for operational execution.
- Do not execute source changes while polishing the protocol.

Polish rules:
1. Preserve source interpretation and repository vocabulary.
2. Fix failed review criteria from `.prompts/memory-bank-review-operational-protocol.md`.
3. Keep the protocol focused on a specific operational workflow, not a full lifecycle process.
4. Keep Human Gates H1/H2/H3, Hard Stop Conditions, Verification, Rollback, Evidence Log, Decisions, Open Questions, and exactly one Next Action explicit.
5. Keep verification checks separate from acceptance decisions.
6. Keep the protocol resumable from disk without chat memory.
7. Do not redefine canonical scope, architecture, acceptance, or implementation details owned by `feature.md`, ADRs, use cases, or implementation plans.

Output:
- Update the target `protocol.md`.
- Write the stage result file with:
  - `Status: accepted | needs_polish | needs_upstream | blocked | needs_human | failed`
  - `Target artifact: <repo-relative path to protocol.md>`
  - `Open findings: <non-negative integer>`
  - A short summary of changes made.
