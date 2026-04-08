---
status: ready
---

# Feature 001: Trusted Multi-Provider Discovery Foundation

## What problem are we solving?

Before AgentScope can safely manage anything, it must first give users a dependable picture of what local AI-agent configuration actually exists. Right now, AgentScope does not provide one read-only inventory across Claude Code, Codex, and Cursor that still returns healthy-provider results when one provider config is missing, malformed, or partially unreadable, so users cannot tell what is actually configured on the machine.

## Who is this for?

- Developers using multiple local AI-agent tools on the same machine
- The AgentScope maintainer, who needs a dependable inventory foundation before any safe change-management workflows can exist

## Where did this task come from?

In the feature-based memory bank, it represents the first feature after the current boilerplate setup and captures the discovery foundation that later features depend on.

## What outcome do we want?

Users should be able to inspect supported providers and layers through AgentScope, receive inventory results for healthy providers, and see provider-scoped warnings for broken configuration slices in the same run. The project should have a dependable baseline view of local state that later change-management and provider-specific features can build on.
