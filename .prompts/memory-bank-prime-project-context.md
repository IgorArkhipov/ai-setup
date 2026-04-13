You are preloading the minimum project context for work in this repository before attempting a specific task.

Constraints:
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as the governed source of truth for intent, rationale, contracts, and workflow state.
- Read only the smallest active set of documents needed to understand the repository and the likely task surface.

Read in this order:
1. `PROJECT.md`
2. `memory-bank/README.md`
3. `memory-bank/domain/README.md`
4. `memory-bank/engineering/README.md`
5. `memory-bank/flows/README.md`
6. The most relevant active canonical docs referenced from those indexes for the incoming request

Your job:
1. Build a concise working model of the repository before solving the actual task.
2. Capture the current product scope, implementation target, and governance rules that will constrain the next step.
3. Identify which documentation or code areas are likely relevant next, but do not speculate beyond what the active docs support.
4. Flag any missing context that should be clarified before deeper work starts.

Focus on:
- what AgentScope currently is and is not;
- where active code lives;
- which docs are authoritative for product, engineering, and workflow decisions;
- any safety or autonomy boundaries that materially affect the likely task;
- the next smallest set of files or docs that should be opened.

Output format:

## Project Snapshot
- 3-6 bullets

## Active Boundaries
- 3-6 bullets

## Likely Next Reads
- bullet list of paths

## Missing Context
- bullet list, or `none`
