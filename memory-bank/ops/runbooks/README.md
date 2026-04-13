---
title: Runbooks Index
doc_kind: engineering
doc_function: index
purpose: Entry point for AgentScope operational runbooks. Read this when a repeatable operator task or failure mode needs a step-by-step documented procedure.
derived_from:
  - ../../dna/governance.md
status: active
audience: humans_and_agents
---

# Runbooks Index

No project-specific runbooks are committed yet.

That is acceptable today because `tools/agentscope` is a local CLI package with no deployed service, on-call rotation, or production incident surface. Add a runbook here once a task becomes both repeatable and operationally significant, for example:

- repeated mutation lock contention triage;
- backup restore failure recovery;
- provider fixture drift diagnosis in CI;
- recovery from malformed provider-local config discovered by `doctor`.

A runbook should answer:

- what the trigger is;
- what to check first;
- which commands to run;
- what result to expect;
- how to roll back safely;
- whom to escalate to and when.

## Suggested Structure

1. Summary
2. Trigger / symptoms
3. Safety notes
4. Diagnosis
5. Resolution
6. Rollback
7. Escalation

When the first runbook is added, link it from this index and keep the trigger plus owning surface explicit.
