# AI Development Playbook

The lifecycle order is fixed. Model selection follows `docs/MODEL_ROUTING.md`.

## Default operating mode — Continuous Autonomy

The default mode is autonomous end-to-end progression.

After the user authorizes development, the agent should continue through every eligible lifecycle stage and implementation phase without asking for routine permission between stages.

Passing a gate is a transition point, not a stopping point.

The agent should stop only for a genuine human/external blocker defined in `AGENTS.md`, such as irreversible destructive action, meaningful unapproved spend, credentials/assets only the user can provide, a major product-scope decision, externally consequential release/submission, or a blocker that available tools cannot resolve safely.

When a gate fails because of fixable repository issues, fix them, re-run the gate, update `docs/PROJECT_STATUS.md`, and continue automatically.

If a preferred reviewer model is unavailable, use the strongest permitted fallback, mark the gate `FALLBACK`, record the actual model, and continue if no unresolved P0/P1 remains.

## Stage 01 — IDEA
Goal: turn an idea into a falsifiable product concept. Identify primary user, problem, core value proposition, repeatable action, MVP constraints, risks and primary success signal.

Gate: PASS when the idea is specific enough to produce a product README without inventing the product.

On PASS: continue automatically to Stage 02.

## Stage 02 — README.md
Required: one-line promise, problem, target user, product concept, core loop, MVP, explicit non-goals, differentiation, success metrics, stack constraints if known, risks/assumptions, current status.

Gate: PASS when another competent engineer can explain what is being built, for whom, why and what is excluded.

On PASS: continue automatically to Stage 03.

## Stage 03 — PRODUCT_SPEC.md
For every MVP feature define user goal, trigger, preconditions, happy path, alternate paths, validation, permissions, loading, empty, error/retry, offline/degraded behavior when relevant, analytics where useful, acceptance criteria and out-of-scope behavior.

Gate: PASS when every MVP feature has testable acceptance criteria and no major behavior is left to implementation guesswork.

On PASS: continue automatically to Stage 04.

## Stage 04 — USER_FLOWS.md
Map first-run, auth/account, primary core loop, creation, consumption, settings/profile, permission-denied, network/error recovery, destructive actions, payments and moderation where applicable.

Every flow includes starting state, transitions, decision branches, terminal outcomes and recovery paths.

Gate: PASS when every MVP feature is reachable through at least one defined flow and every major screen/state exists for a reason.

On PASS: continue automatically to Stage 05.

## Stage 05 — ARCHITECTURE.md
Define chosen stack and rationale, app boundaries, directory/module structure, navigation, state, data fetching/cache, auth/session lifecycle, authorization boundary, server/API responsibilities, storage, background jobs, notifications, localization, analytics, error handling, observability, env/secrets, testing, CI/CD, security/privacy, deployment and performance assumptions.

For version-sensitive technology consult current official docs.

Gate: produce the architecture, then run the strongest available critical architecture review required by model routing. PASS when no unresolved architecture blocker or P0/P1 review finding remains.

If the preferred critical model is unavailable, run a permitted fallback review and label it `FALLBACK`.

On PASS/FALLBACK with no unresolved P0/P1: continue automatically to Stage 06.

## Stage 06 — DATABASE.md
For each table/collection specify fields/types, PK/FK, unique/check constraints, nullability/defaults, indexes, relationships, timestamps, soft-delete behavior, ownership and data classification. Also define roles, RLS/authorization, grants, storage policies, cascade behavior, retention/deletion, migration strategy and allow/deny security tests.

For Supabase, grants and RLS are both explicit and `service_role` remains server-side only.

Gate: run data-ownership/authorization review. PASS when unauthorized read/write paths can be stated and tested and no unresolved P0/P1 remains.

On PASS/FALLBACK with no unresolved P0/P1: continue automatically to Stage 07.

## Stage 07 — IMPLEMENTATION_PLAN.md
Break approved design into dependency-ordered, small, testable tasks. Every task has ID, purpose, work, affected areas, dependencies, acceptance criteria, verification, complexity and risk notes. Identify the first real vertical slice explicitly.

Gate: PASS when the next task can be implemented without architectural invention and the plan is consistent with README → PRODUCT_SPEC → USER_FLOWS → ARCHITECTURE → DATABASE.

No new application code before this gate unless the user explicitly asks for a throwaway prototype.

On PASS: **do not stop**. Continue automatically into Stage 08 unless an explicit stop condition applies.

## Stage 08 — Foundation
Typical work: scaffold, package manager lockfile, strict typing, formatter/linter, tests, env example, configuration validation, CI baseline, logging/error baseline and secrets hygiene.

Gate: relevant install/lint/typecheck/test/build commands pass or are explicitly PARTIAL with a documented blocker.

If failures are fixable safely, fix and re-run. Continue automatically when the gate permits.

## Stage 09 — App shell/navigation
Build navigation/layout/providers/base state and error/loading boundaries without pretending unfinished features work.

Gate: app starts, intended shell navigation works and startup/failure states do not crash the app.

On PASS: continue automatically.

## Stage 10 — First end-to-end vertical slice
Prove one real core journey using real UI, real data path, real auth/authorization where applicable, persistence/reload where applicable, success/failure handling and verification evidence.

Gate: a tester can complete the smallest meaningful product action end-to-end with no hidden critical mock.

On PASS: continue automatically to Audit #1.

## Stage 11 — Audit #1
Independent review of requirements coverage, runtime correctness, architecture drift, auth/security, data/RLS, test gaps, UX state coverage, accessibility baseline and dependency health.

Gate: no unresolved P0/P1.

If P0/P1 findings are fixable with repository access, fix them and re-run automatically. Do not stop merely to report findings.

On PASS: continue automatically.

## Stage 12 — Core feature implementation
Implement remaining MVP features in dependency order. Security/testing/analytics are handled with their features, not deferred to the end.

Gate: all beta MVP acceptance criteria are implemented or explicitly deferred with approved rationale.

On PASS: continue automatically.

## Stage 13 — Audit #2
Repeat independent product-scope review, adding dead code/placeholders, cross-feature regressions, performance, localization, privacy, moderation, analytics integrity, offline/degraded behavior and production configuration.

Gate: no P0/P1; remaining P2 risk is understood.

Fix in-scope P0/P1 automatically and re-run. On PASS: continue automatically.

## Stage 14 — Store/release readiness
For mobile, verify current Apple/Google rules, privacy/data disclosures, permissions, account deletion where applicable, UGC, digital payments, signing/build, crash/analytics and release smoke tests. For web/backend, verify production env/secrets, migrations, rollback, observability and deployment smoke tests.

Gate: release candidate is reproducible with no known release-blocking policy/security issue.

Do all local/repository work autonomously. Stop only when release requires user-owned credentials, certificates, store-account actions, production secrets, explicit public submission, or other external authorization.

## Stage 15 — Beta readiness
Define beta audience, onboarding, measurable primary value action, feedback/report channel, crash/error visibility, rollback/hotfix path, seed/content/operations needs and success/failure thresholds.

Final gate: the product is not considered validated merely because it runs; beta must measure whether users complete the intended value behavior.

Complete every repository-local beta-readiness task automatically. If external actions remain, report only those concrete blockers.

## Decision framework
When several approaches are viable, compare product fit, correctness/security, implementation complexity, operational complexity, reversibility, ecosystem support, cost and testability. Prefer the simplest reversible option that meets requirements.

Do not ask the user to choose between routine technical alternatives when approved documents and this framework are sufficient to decide.

## Definition of Done
A task is done only when acceptance criteria are met, relevant verification was executed, severe findings are resolved, no production-critical placeholder remains and docs/status reflect reality. "Code was written" is never the definition of done.

## Session-end behavior
If the runtime/session ends before Stage 15, leave `docs/PROJECT_STATUS.md` accurate enough for the next agent/session to resume automatically from the next eligible task. Do not convert a session boundary into a request for routine user approval.