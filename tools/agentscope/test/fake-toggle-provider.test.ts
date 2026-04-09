import { afterEach, describe, expect, it } from "vitest";
import { fakeToggleProvider, fakeToggleIds } from "./support/fake-toggle-provider.js";
import { createMutationSandbox } from "./support/mutation-sandbox.js";

const sandboxes: Array<ReturnType<typeof createMutationSandbox>> = [];

afterEach(() => {
  while (sandboxes.length > 0) {
    sandboxes.pop()?.cleanup();
  }
});

describe("fake toggle provider", () => {
  it("reuses an existing provider id and produces a writable plan", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);

    expect(fakeToggleProvider.id).toBe("codex");

    const discovery = fakeToggleProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });
    const item = discovery.items.find((entry) => entry.id === fakeToggleIds.full);
    if (item === undefined) {
      throw new Error("expected fake full toggle item");
    }

    const decision = fakeToggleProvider.planToggle?.({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
      item,
      targetEnabled: true,
    });

    expect(decision).toMatchObject({
      status: "planned",
      plan: {
        selection: {
          id: fakeToggleIds.full,
        },
      },
    });

    if (decision?.status !== "planned") {
      throw new Error("expected a planned decision");
    }

    expect(decision.plan.operations.map((operation) => operation.type)).toEqual([
      "createFile",
      "replaceJsonValue",
      "updateJsonObjectEntry",
      "removeJsonObjectEntry",
      "renamePath",
      "deletePath",
      "replaceSqliteItemTableValue",
    ]);
  });
});
