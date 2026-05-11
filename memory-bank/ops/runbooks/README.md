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

- [Agent Workflow Runner](agent-workflow-runner.md) - canonical procedure for running, stepping, checking, resuming, Claude-reviewing, and milestone-executing repo-local non-interactive agentic workflows for AgentScope development.
- [Zellij Task Sessions](zellij-task-sessions.md) - canonical procedure for opening a neighboring `zellij` tab or session backed by an isolated git worktree and repo-owned task routing.

Add more runbooks here once a task becomes both repeatable and operationally significant, for example:

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
