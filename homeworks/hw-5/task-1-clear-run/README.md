# Homework 5 Task 1 Clear Run

This package is a clean read-only evidence run for the corrected lifecycle-protocol ordering.

It proves that the `lifecycle-feature` runner can start from a top-level intention, create `protocol.md` first, review and groom that protocol, and only then execute the protocol to create simulated downstream feature-development documents.

## Difference From The First Pass

The existing FT-008 implementation already exists in the repository. This run does not claim that the original implementation happened protocol-first.

Instead, this run uses a generated workflow worktree and a virtual feature package, `memory-bank/features/FT-008-clear-run/`, to demonstrate the corrected order without reimplementing the feature or editing `tools/agentscope`.

## Contents

- `initial-prompt.md` - top-level lifecycle intention used to start the runner.
- `protocol.md` - final protocol copied from the generated workflow worktree.
- `protocol-review.md` - final accepted review result.
- `protocol-polish.md` - polish-stage result from the real review/grooming loop.
- `execution-summary.md` - end-to-end report with runner metadata, stage order, ordering proof, and verification.
- `workflow-run.json` - final runner manifest.
- `stage-results/` - copied stage result files, including the initial `needs_polish` review and final accepted review.
- `simulated-feature-docs/` - virtual downstream docs created only after protocol acceptance.
- `evidence/package-tree.txt` - file tree for this evidence package.
