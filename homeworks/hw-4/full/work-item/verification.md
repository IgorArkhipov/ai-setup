# Verification

## Commands

The final run uses these checks:

```bash
rtk git diff --check
```

```bash
cd tools/agentscope && rtk npm run lint
```

```bash
rtk ./homeworks/hw-4/full/runners/improve-loop-runner.sh --help
```

```bash
rtk sh -c 'for path in \
  homeworks/hw-4/full/requirements-en.md \
  homeworks/hw-4/full/process-specs/brief-improve-loop.md \
  homeworks/hw-4/full/process-specs/spec-improve-loop.md \
  homeworks/hw-4/full/process-specs/large-feature-execution-loop.md \
  homeworks/hw-4/full/prompts/brief-improve.md \
  homeworks/hw-4/full/prompts/spec-improve.md \
  homeworks/hw-4/full/runners/improve-loop-runner.sh \
  homeworks/hw-4/full/work-item/brief.md \
  homeworks/hw-4/full/work-item/spec.md \
  homeworks/hw-4/full/work-item/implementation-plan.md \
  homeworks/hw-4/full/state/active-context.md \
  homeworks/hw-4/full/state/stage-state.md \
  homeworks/hw-4/full/state/session-handoff.md \
  homeworks/hw-4/full/trace/run-trace.md \
  homeworks/hw-4/full/report.md; do test -s "$path" || exit 1; done'
```

## Results

- `rtk git diff --check`: passed with exit code 0.
- `cd tools/agentscope && rtk npm run lint`: passed; Biome checked 189 files and applied no fixes.
- `rtk ./homeworks/hw-4/full/runners/improve-loop-runner.sh --help`: passed and printed usage.
- package-tree file-presence smoke check: passed.

## Verification Findings

None.
