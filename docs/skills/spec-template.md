# Spec Template

Use this as the default structure for generated specs unless the user asks for a different format.

```md
# [Feature Name]

## Source
- Brief/Issue: [link]

## Goal
[One sentence explaining why this exists]

## Scope
- In: [what we are doing]
- Out of scope: [what we are not doing]

## Requirements
1. [Concrete requirement]
2. [Concrete requirement]

## Invariants
- [A condition that must remain true before and after implementation]
- [Example: "Account balance >= 0", "All requests go through auth middleware"]

## Acceptance Criteria
- [ ] [Verifiable criterion]
- [ ] [Verifiable criterion]
- [ ] All existing tests pass
- [ ] Invariants are preserved

## Constraints
- [What must not change, and which patterns must be followed]
```
