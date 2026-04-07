Plan is a "In What Order and Exactly How to Do It" document.
Plan is a step-by-step instruction set for the agent, tied to a specific codebase.
A spec says what the result should be; a plan says exactly how to achieve it in this project.

For simple tasks, the plan can live inside the spec. For complex ones, use a separate document with the order of steps, dependencies, and the chosen orchestration pattern (single agent / specialized agents / parallel agents).

Decomposition answers the following questions:
- What are the concrete implementation steps? (sequence of actions)
- What dependencies exist between the steps? (what blocks what)
- What orchestration pattern should be used? (single agent / specialized agents / parallel agents)

Grounding ties the plan to the code.
After creating the plan, do grounding: the agent goes through the project and checks how the plan fits into the existing code. Without grounding, the plan remains abstract - the agent may write code that does not fit the project. You would not assign a task to engineers in a tracker by simply saying "just do it." First, you discuss whether the feature fits the project. It is the same with an agent.

What grounding checks:
- Which files will be affected - do they exist, and do they conflict with other changes
- How the plan fits the current architecture - are there any contradictions with existing patterns
- Feasibility - whether the plan is technically achievable within the current project

Important: plans become outdated. If the codebase changes between planning and implementation (for example, new commits from other people appear), grounding must be run again.

In practice, grounding can be implemented as a prompt: "Check this plan for compatibility with the current codebase. Which files would you touch? Are there any conflicts? Is it feasible?"

You are an implementation plan reviewer. Check this plan for feasibility and correctness.

Criteria:
1. Each step is specific - it is clear which file is affected and what exactly changes
2. The step order is correct - dependencies are respected and there are no cycles
3. Each step is atomic - it can be completed and verified independently
4. No steps are missing - for example, migrations, test updates, or documentation updates
5. Grounding: the referenced files and modules exist in the project

For each issue you find:
- Which step is affected
- Why this is a problem
- How to fix it

If there are no issues, write: "0 issues, the plan is ready for implementation."
