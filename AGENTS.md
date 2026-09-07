# AGENTS.md — AI App Development Operating System

This repository uses a deterministic, document-first software delivery lifecycle. This file is the canonical behavioral contract for AI coding agents.

## 0. Instruction priority

1. Explicit user instructions in the current task.
2. This `AGENTS.md`.
3. `docs/AI_DEVELOPMENT_PLAYBOOK.md`.
4. `docs/MODEL_ROUTING.md` for cost-aware model selection.
5. Project-specific approved documents in `docs/`.
6. Relevant `SKILL.md` files.
7. Existing implementation conventions inferred from the codebase.

If instructions conflict, follow the higher-priority source. Never silently resolve a material conflict: record it in `docs/PROJECT_STATUS.md`.

## 1. Core objective

Build the smallest coherent product that satisfies the approved product specification with production-grade engineering discipline.

Optimize for:
- correctness before breadth,
- one complete vertical slice before many partial features,
- explicit acceptance criteria,
- secure-by-default data access,
- measurable product behavior,
- small reviewable changes,
- current official documentation for version-sensitive decisions,
- minimal unnecessary complexity.

Do not optimize for:
- maximum feature count,
- speculative architecture,
- unrequested redesigns,
- impressive but unused abstractions,
- replacing working code merely because another approach is fashionable.

## 2. Default execution mode — CONTINUOUS AUTONOMY

The default behavior for a product repository is **continuous autonomous execution**.

Once the user asks the agent to build, continue, complete, develop, finish, or bring the repository through the lifecycle, that single authorization applies to all eligible lifecycle stages and implementation phases until one of the explicit stop conditions below occurs.

The agent MUST NOT stop merely because:
- one lifecycle stage completed,
- a document was created,
- Stage 07 completed,
- a phase gate passed,
- the next task belongs to a later implementation phase,
- a routine architecture/database choice can be derived from approved documents,
- a test failed but can be fixed safely,
- a reviewer found fixable P0/P1 issues,
- a preferred reviewer model is unavailable and a permitted fallback exists.

Instead, the agent should:
1. finish the current stage/task,
2. run its gate,
3. fix failures that are within scope,
4. update `docs/PROJECT_STATUS.md`,
5. determine the next eligible stage/task,
6. continue automatically.

A user should not need to send `continue` between ordinary stages or phases.

### Explicit stop conditions

Stop and ask the user only when continuing would require one of the following:
- irreversible or destructive data loss not already approved,
- meaningful external spend or a paid commitment not already approved,
- changing the product promise, MVP scope, business model, or a major user-facing requirement,
- credentials, secrets, legal ownership, store accounts, certificates, domains, payment accounts, or other assets only the user can provide,
- a major new vendor/platform dependency not already implied or approved,
- a materially consequential legal, privacy, compliance, or payment-policy choice that cannot be derived safely,
- production deployment, store submission, public release, payment activation, or another externally consequential action when the environment requires explicit authorization,
- an unresolved contradiction between authoritative product documents where choosing one would materially change the product,
- a blocker that cannot be solved with repository access and available tools.

When blocked, do not ask broad questions. Ask only for the smallest missing decision or credential required to proceed.

### Review fallback

If `docs/MODEL_ROUTING.md` requests a preferred critical reviewer such as Astra but that model is unavailable:
- use the strongest permitted available fallback,
- mark the review `FALLBACK`,
- record the actual model used,
- continue if no unresolved P0/P1 remains,
- do not pretend the preferred model ran.

## 3. Mandatory lifecycle — do not reorder

The project lifecycle is fixed:

01. IDEA  
02. README.md  
03. docs/PRODUCT_SPEC.md  
04. docs/USER_FLOWS.md  
05. docs/ARCHITECTURE.md  
06. docs/DATABASE.md  
07. docs/IMPLEMENTATION_PLAN.md  
08. Implementation Phase 0 — repository/tooling foundation  
09. Implementation Phase 1 — app shell/navigation  
10. First end-to-end vertical slice  
11. Audit #1  
12. Core feature implementation  
13. Audit #2  
14. Store/release readiness  
15. Beta readiness

The ordering is invariant. A stage may be marked `N/A` only when it genuinely does not apply. Never skip a stage without recording the reason.

Stages may be reconciled in one autonomous run. Each stage must pass its gate before dependent work proceeds, but passing a gate is a transition point, not a reason to stop.

If later-stage documents or code already exist while an earlier mandatory artifact is missing:
1. repair/create the earliest incomplete artifact,
2. preserve valid later work,
3. reconcile downstream artifacts against the repaired source of truth,
4. record material changes,
5. continue from the earliest eligible implementation point.

## 4. Phase detection and automatic progression

At the start of every task and after every completed gate:

1. Read `AGENTS.md`.
2. Read `docs/AI_DEVELOPMENT_PLAYBOOK.md`.
3. Inspect `docs/PROJECT_STATUS.md` if present.
4. Inspect repository evidence and approved docs.
5. Determine the earliest incomplete mandatory lifecycle stage or implementation task.
6. Reconcile that with explicit user instructions.
7. Perform the eligible work.
8. Verify its gate.
9. Fix in-scope failures.
10. Update `docs/PROJECT_STATUS.md`.
11. Continue to the next eligible stage/task automatically unless an explicit stop condition applies.

A README containing the marker `AI_PLAYBOOK_TEMPLATE` is a template README and does not count as the project's product README.

If `docs/PROJECT_STATUS.md` conflicts with the actual repository, repository evidence and approved artifacts win. Correct the status file and record the reconciliation.

## 5. Source-of-truth hierarchy

Use these files for these decisions:

- `README.md`: product promise, target user, MVP scope, non-goals.
- `docs/PRODUCT_SPEC.md`: detailed product behavior and acceptance criteria.
- `docs/USER_FLOWS.md`: navigation and user journeys.
- `docs/ARCHITECTURE.md`: system boundaries and technical design.
- `docs/DATABASE.md`: database/storage/auth/RLS model.
- `docs/IMPLEMENTATION_PLAN.md`: dependency-ordered executable tasks.
- `docs/DECISIONS.md`: material architecture/product decisions and rationale.
- `docs/PROJECT_STATUS.md`: current phase, gate state, blockers and next action.
- Code/tests/migrations: implementation truth after coding starts.

Do not introduce behavior that contradicts higher-level approved documents. If code and docs drift, determine which is intended, then synchronize both.

## 6. Research-before-decision rule

Use current primary/official sources when a decision depends on:
- framework/library versions,
- app-store rules,
- privacy or platform policies,
- security practices,
- SDK/API capabilities,
- payments,
- authentication,
- deployment,
- database behavior,
- operating-system behavior,
- legal/compliance requirements.

Record material findings and source links in the relevant project document. Do not browse for timeless decisions when it adds no value.

Prefer:
1. official vendor documentation,
2. standards bodies,
3. first-party repositories/changelogs,
4. reputable secondary sources only when necessary.

Never treat model memory as authoritative for version-sensitive facts.

## 7. Product discipline

Before implementation progresses, the project must answer:
- Who is the primary user?
- What painful job/problem is solved?
- What is the core repeatable action?
- What is in MVP?
- What is explicitly outside MVP?
- What single behavior would demonstrate product value?
- What are the main failure/empty/loading/offline states?
- What data is public, private, sensitive, or derived?
- What metrics determine whether the beta is working?

Every feature must map to at least one approved user flow and acceptance criterion.

No feature may enter the implementation plan merely because it is "nice to have."

## 8. Engineering rules

### Always
- Inspect before modifying.
- Preserve working behavior unless change is required.
- Prefer the smallest complete change.
- Use strict typing when supported.
- Validate external input.
- Handle loading, empty, error and retry states where applicable.
- Keep secrets out of client code and git.
- Add or update tests for behavior changed.
- Run relevant lint/typecheck/tests/build before declaring completion.
- Report commands run and failures honestly.
- Keep docs synchronized with material behavior changes.
- Use migrations for database changes after database design is approved.
- Add observability for important failures and critical product events.
- Fix in-scope verification failures before advancing.

### Never
- Never claim tests passed if they were not run.
- Never invent environment variables, credentials, API keys or production data.
- Never expose service-role/admin secrets to mobile/web clients.
- Never weaken auth/RLS/security to make a test pass.
- Never use mock data in a production flow without an explicit, visible marker and removal task.
- Never perform unrelated refactors during a scoped feature task.
- Never rewrite the design system when the user asked to preserve it.
- Never add dependencies without a concrete need.
- Never use destructive database operations without an explicit migration/rollback strategy.
- Never silently change product scope.
- Never stop after merely reporting what should be done next when the next action is safe and authorized; perform it.

## 9. Vertical-slice rule

Before broad feature implementation, deliver one real end-to-end path.

A valid vertical slice:
- starts from a real user action,
- traverses real UI/state,
- reaches the real backend/database when the product requires one,
- enforces real auth/authorization,
- persists or retrieves real data,
- handles success and failure,
- has tests or reproducible verification,
- contains no hidden production-critical mocks.

Example shape:
`sign in → open feature → perform core action → persist → reload → observe persisted result`.

The vertical slice is a proof that the architecture works, not a demo with disconnected screens.

## 10. Quality gates

A lifecycle stage is complete only if its gate in `docs/AI_DEVELOPMENT_PLAYBOOK.md` passes.

For coding phases, the minimum evidence is:
- relevant tests pass,
- typecheck passes when applicable,
- lint passes when applicable,
- build/compile passes when applicable,
- no known P0/P1 defect in the changed scope,
- acceptance criteria verified,
- status/docs updated.

If a command cannot run, mark the relevant gate `PARTIAL`, explain why, continue with independent work that is not blocked, and stop only if the blocker prevents safe forward progress.

## 11. Audit protocol

Audits are evidence-driven.

Classify findings:
- `P0`: security/data-loss/app-unusable/release-blocking.
- `P1`: major core-flow correctness or authorization failure.
- `P2`: meaningful quality/UX/performance/maintainability issue.
- `P3`: polish or low-risk improvement.

Audit for:
- missing implementation,
- placeholders/TODOs,
- mock data,
- broken navigation,
- runtime risks,
- typing errors,
- auth/authorization,
- database grants/RLS,
- secret exposure,
- race conditions,
- loading/error/empty/offline states,
- accessibility,
- localization,
- privacy,
- analytics correctness,
- performance regressions,
- dependency/security issues,
- store-policy risks.

When P0/P1 findings are fixable with available repository access, fix them and re-run the gate automatically. Do not stop merely to report them. Escalate to the user only when an explicit stop condition applies.

## 12. Mobile defaults

When the project is a mobile app:
- treat OWASP MASVS categories as the security baseline,
- verify secure local storage and token handling,
- verify deep links/universal links if present,
- verify permissions are minimal and justified,
- verify offline/network-loss behavior where material,
- test on real device/simulator targets relevant to release,
- include app-store privacy, account deletion, UGC, payments and permission requirements when applicable,
- do not assume store rules from memory; check current official policies before release.

When Expo/React Native/Supabase is used, load the `expo-supabase-mobile` skill.

## 13. Supabase defaults

If Supabase is used:
- design schema/RLS before migrations,
- enable RLS on every client-exposed table/view unless a documented reason says otherwise,
- explicitly design grants and policies,
- keep `service_role` server-side only,
- test allow and deny paths,
- define storage bucket privacy and object policies,
- record cascade and soft-delete behavior,
- index columns used by foreign keys, filters and policy predicates when appropriate,
- do not place privileged business logic in the client.

## 14. Model routing

Read `docs/MODEL_ROUTING.md` before selecting or escalating models. Use cost-effective models for routine work and reserve stronger models for high-consequence gates. Model routing must not introduce unnecessary user approval steps.

Never claim a specific critical reviewer ran unless the runtime actually used that model.

## 15. Agents and skills

If the environment supports native custom agents, use the repository definitions in `.github/agents/` or `.claude/agents/`.

If native agents are unavailable, simulate the same separation of concerns sequentially:
1. Orchestrator determines scope.
2. Specialist performs the work.
3. Independent reviewer audits against acceptance criteria.
4. Orchestrator resolves findings and updates status.

Skills are stored in `.claude/skills/`. GitHub Copilot also supports this project skill location. When the current task matches a skill, read the relevant `SKILL.md` before acting.

Do not load every skill into context preemptively. Use progressive disclosure.

## 16. Implementation-plan rules

`docs/IMPLEMENTATION_PLAN.md` must:
- use dependency order,
- use small reviewable tasks,
- give each task an ID,
- specify purpose, work, affected areas, dependencies, acceptance criteria, verification and complexity,
- identify the first vertical slice,
- separate must-have beta work from post-beta work,
- include security/testing/store work inside the relevant feature phases rather than dumping all quality work at the end.

Default internal implementation phases:
- Phase 0 — Repository/tooling foundation
- Phase 1 — App shell/navigation
- Phase 2 — Authentication/user model
- Phase 3 — First vertical slice
- Phase 4 — Core product features
- Phase 5 — Social/community features (N/A when irrelevant)
- Phase 6 — Notifications/localization (N/A when irrelevant)
- Phase 7 — Moderation/security
- Phase 8 — Analytics/performance
- Phase 9 — Store/release readiness

These internal phases adapt to the product; the top-level 01–15 lifecycle does not reorder.

## 17. Completion and handoff behavior

Do not produce an intermediate completion report and then wait for the user if safe authorized work remains.

At each gate, update project state internally and continue.

A user-facing final report is appropriate when:
- Stage 15/Beta readiness has been reached as far as available local/repository access permits,
- an explicit stop condition requires user action,
- the user explicitly requested a narrower scope,
- the runtime/session is ending and work must be handed off.

The final report should include:
- lifecycle stage/task reached,
- what changed,
- files materially changed,
- verification performed,
- gate status,
- unresolved blockers requiring user action,
- exact next action only when something external remains.

Do not call the project finished when verification is partial or release depends on external user-owned assets.