# Model Routing Policy

This repository uses a cost-aware two-tier model strategy.

## Goals

- Use `gpt-5.6-sol` for routine planning, decomposition, documentation, state tracking, repository exploration and ordinary implementation reasoning.
- Reserve `gpt-6-astra` for small amounts of high-consequence reasoning where a stronger independent review is worth the higher token price.
- Keep coding-model choice independent from planning-model choice when another coding environment (for example Claude or another agent) is used for implementation.
- Never spend Astra tokens on work that can be safely completed and verified by Sol.

## Default routing

| Work | Default model | Reasoning |
|---|---|---|
| Repository inspection / phase detection | `gpt-5.6-sol` | low/medium |
| README → PRODUCT_SPEC | `gpt-5.6-sol` | medium |
| USER_FLOWS | `gpt-5.6-sol` | medium |
| IMPLEMENTATION_PLAN / task tree | `gpt-5.6-sol` | medium |
| PROJECT_STATUS / doc synchronization | `gpt-5.6-sol` | low |
| Research synthesis | `gpt-5.6-sol` | medium/high |
| Architecture first draft | `gpt-5.6-sol` | high |
| Database/RLS first draft | `gpt-5.6-sol` | high |
| Architecture final gate review | `gpt-6-astra` | high |
| Database/RLS authorization final gate review | `gpt-6-astra` | high |
| Security review | `gpt-6-astra` | xhigh |
| First vertical-slice audit | `gpt-6-astra` | high |
| P0/P1 root-cause analysis | `gpt-6-astra` | high/xhigh |
| Release/security final gate | `gpt-6-astra` | xhigh |

## Astra escalation rules

Use Astra only when at least one condition is true:

1. A decision can materially change system architecture or data ownership.
2. Authentication, authorization, RLS, secrets, privacy, payments or destructive data behavior is being finalized.
3. A P0 or P1 defect is found or suspected.
4. The first real vertical slice is ready for independent gate review.
5. A production/store release gate is being evaluated.
6. Two Sol passes disagree on a high-impact decision and the disagreement cannot be resolved from primary documentation.
7. The user explicitly requests Astra.

Do not escalate merely because a document is long, many files exist, a task is tedious, or a task tree needs more rows.

## Budget discipline

- Prefer one focused Astra review per gate.
- Give Astra only the artifacts relevant to that gate when the runtime allows scoped context.
- Ask Astra to return findings and minimal corrections, not to rewrite the whole repository.
- Do not ask Astra to regenerate a document that Sol produced unless the gate failed.
- Fix P0/P1 findings, then rerun focused verification rather than a duplicate full review when possible.
- Record experiment runs in `docs/AI_RUN_LOG.md` when present.

## Runtime compatibility

Custom agent model overrides can be affected by the active Copilot surface/provider. If an override cannot be honored, Copilot may fall back to the session model.

Therefore:
- keep routing rules here even when model frontmatter exists,
- check the actual active model before a critical review,
- if `gpt-6-astra` is unavailable, use `gpt-5.6-sol` with high/xhigh reasoning and mark the review `FALLBACK`,
- never claim an Astra review occurred when another model actually ran.

## External implementation model

Implementation may be executed by Claude, Astra, or another capable coding agent. Regardless of model, the implementation agent must follow `AGENTS.md`, approved docs, `docs/PROJECT_STATUS.md`, `docs/IMPLEMENTATION_PLAN.md`, and phase gates.
