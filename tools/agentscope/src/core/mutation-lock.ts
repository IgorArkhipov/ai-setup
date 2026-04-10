import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface MutationLockOptions {
  appStateRoot: string;
  now?: () => Date;
  pid?: number;
  isProcessAlive?: (pid: number) => boolean;
}

export interface MutationLockHandle {
  lockPath: string;
  release: () => void;
}

function defaultIsProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ESRCH") {
      return false;
    }

    return true;
  }
}

function parseLockPid(lockPath: string): number | null {
  try {
    const raw = JSON.parse(readFileSync(lockPath, "utf8")) as { pid?: unknown };
    return typeof raw.pid === "number" && Number.isInteger(raw.pid) ? raw.pid : null;
  } catch {
    return null;
  }
}

export function acquireMutationLock(options: MutationLockOptions): MutationLockHandle {
  const now = options.now ?? (() => new Date());
  const pid = options.pid ?? process.pid;
  const isProcessAlive = options.isProcessAlive ?? defaultIsProcessAlive;
  const lockDir = path.join(options.appStateRoot, "locks");
  const lockPath = path.join(lockDir, "mutation.lock");
  mkdirSync(lockDir, { recursive: true });

  if (existsSync(lockPath)) {
    const ownerPid = parseLockPid(lockPath);
    if (ownerPid !== null && isProcessAlive(ownerPid)) {
      throw new Error(`mutation lock is already held by pid ${ownerPid}`);
    }

    unlinkSync(lockPath);
  }

  writeFileSync(
    lockPath,
    JSON.stringify(
      {
        pid,
        acquiredAt: now().toISOString(),
      },
      null,
      2,
    ),
    { encoding: "utf8", flag: "wx" },
  );

  let released = false;

  return {
    lockPath,
    release() {
      if (released) {
        return;
      }

      released = true;
      if (existsSync(lockPath)) {
        unlinkSync(lockPath);
      }
    },
  };
}
