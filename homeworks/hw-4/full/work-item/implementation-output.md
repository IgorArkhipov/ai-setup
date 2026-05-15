# Implementation Output

## Summary

The full HW-4 package was implemented as a standalone English submission under:

```text
homeworks/hw-4/full/
```

The large loop reused the small-loop runner path twice:

- `brief-loop`: `runners/improve-loop-runner.sh` prepared a request, then a subagent executed the request and produced `work-item/brief.md`.
- `spec-loop`: `runners/improve-loop-runner.sh` prepared a request, then a subagent executed the request and produced `work-item/spec.md`.

## Stop / Resume

The run intentionally stopped after the initial process definitions and state-pack were created. The resume point was recorded in:

```text
state/session-handoff.md
```

The resumed run read that handoff and continued with:

```text
runs/brief-loop/runner-request-result.md
runs/spec-loop/runner-request-result.md
```

## Safe Stage Equivalent

No real stage environment exists for this documentation-only package. The safe verification contour is:

- repository diff whitespace check;
- Biome lint through `tools/agentscope`;
- runner-script help smoke check;
- package-tree file-presence smoke check.

## Final Status

`done`

All required package artifacts were created, the small loops returned `done`, the large loop trace records stop/resume, and final verification is recorded in `verification.md`.
