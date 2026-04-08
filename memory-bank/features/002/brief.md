---
status: ready
---

# Feature 002: Safe And Reversible Configuration Changes

## What problem are we solving?

After discovery is in place, AgentScope still cannot help users make changes safely. Editing provider-managed configuration by hand is risky, hard to review, and difficult to undo, so the tool cannot yet deliver on its promise of reversible local AI-agent management.

## Who is this for?

- Developers who want to enable, disable, or restore AI-agent configuration without manual file surgery
- The AgentScope maintainer, who needs a trustworthy change workflow before expanding writable support across providers

## Where did this task come from?

In the feature-based memory bank, it follows the discovery foundation and frames the next capability as safe change management rather than as a set of internal implementation details.

## What outcome do we want?

Users should be able to see what a requested change would do before anything is written, apply supported changes with confidence, and recover the previous state when needed. The project should have a reliable safety story for local configuration changes so later provider work can build on it.
