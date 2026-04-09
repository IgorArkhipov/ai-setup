import { describe, expect, it } from "vitest";
import {
  renderRestoreResultHuman,
  renderRestoreResultJson,
  renderToggleResultHuman,
  renderToggleResultJson,
} from "../src/core/mutation-output.js";

describe("mutation output", () => {
  it("renders deterministic human and JSON toggle output", () => {
    const result = {
      status: "dry-run" as const,
      selection: {
        id: "codex:project:tool:fake-full-toggle",
      },
      targetEnabled: true,
      operations: [
        {
          type: "createFile" as const,
          path: "/workspace/generated.txt",
          content: new TextEncoder().encode("enabled\n"),
        },
      ],
      affectedTargets: [
        {
          type: "path" as const,
          path: "/workspace/generated.txt",
        },
      ],
    };

    expect(renderToggleResultHuman(result)).toBe(`status: dry-run
item: codex:project:tool:fake-full-toggle
targetEnabled: true
operations:
- create file /workspace/generated.txt
affectedTargets:
- /workspace/generated.txt
writes: no writes were performed`);
    expect(JSON.parse(renderToggleResultJson(result))).toEqual({
      status: "dry-run",
      selection: {
        id: "codex:project:tool:fake-full-toggle",
      },
      targetEnabled: true,
      operations: [
        {
          type: "createFile",
          summary: "create file /workspace/generated.txt",
        },
      ],
      affectedTargets: ["/workspace/generated.txt"],
      writes: "no writes were performed",
    });
  });

  it("renders deterministic restore output", () => {
    const result = {
      status: "restored" as const,
      backupId: "backup-001",
      affectedTargets: [
        {
          type: "path" as const,
          path: "/workspace/generated.txt",
        },
      ],
    };

    expect(renderRestoreResultHuman(result)).toBe(`status: restored
backupId: backup-001
affectedTargets:
- /workspace/generated.txt`);
    expect(JSON.parse(renderRestoreResultJson(result))).toEqual({
      status: "restored",
      backupId: "backup-001",
      affectedTargets: ["/workspace/generated.txt"],
    });
  });

  it("renders rollback failure details in failed toggle and restore output", () => {
    const toggleResult = {
      status: "failed" as const,
      selection: {
        id: "codex:project:tool:fake-full-toggle",
      },
      targetEnabled: true,
      operations: [],
      affectedTargets: [],
      reason: "apply failed",
      rollbackFailure: "blob missing",
    };
    const restoreResult = {
      status: "failed" as const,
      backupId: "backup-001",
      affectedTargets: [],
      reason: "restore failed",
      rollbackFailure: "rollback snapshot missing",
    };

    expect(renderToggleResultHuman(toggleResult)).toContain(
      "rollbackFailure: blob missing",
    );
    expect(JSON.parse(renderToggleResultJson(toggleResult))).toMatchObject({
      rollbackFailure: "blob missing",
    });
    expect(renderRestoreResultHuman(restoreResult)).toContain(
      "rollbackFailure: rollback snapshot missing",
    );
    expect(JSON.parse(renderRestoreResultJson(restoreResult))).toMatchObject({
      rollbackFailure: "rollback snapshot missing",
    });
  });
});
