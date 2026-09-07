# Implementation Plan

## Planning rules
- Dependency order.
- Small reviewable tasks.
- No application code before this plan passes its gate.
- The first real vertical slice is explicit.
- Quality/security work belongs inside feature delivery.
- Beta work is separated from post-beta work.
- Every server-authoritative transition is verified with allow/deny cases; client UI state never substitutes for authorization.

## Delivery target

### Beta value behavior
A 13+ learner can create an account, choose a supported learning profile, open the first eligible lesson, submit a private drawing, receive one structured checkpoint-specific AI correction, resubmit a corrected drawing, complete the checkpoint/lesson, reload the app and see persisted progress/history.

### First real vertical slice
**VS-001:** `sign up/sign in → complete Landscape/Pencil onboarding → start Lesson 1 → upload checkpoint artwork → real server-side AI critique → resubmit → server completes checkpoint/lesson → reload → history/progress still show the result`.

This slice must use:
- a real authenticated user,
- real Supabase Postgres/RLS/Storage,
- a real trusted Edge Function,
- a real configured vision-capable OpenAI request,
- persistence/reload,
- success and failure handling,
- no hidden critical mocks.

Lower-level tests may use deterministic fixtures, but VS-001 cannot pass with a mocked AI/backend.

---

## Phase 0 — Repository/tooling foundation

### TASK-P0-001 — Scaffold Expo SDK 57 application
- Purpose: create the smallest runnable iOS/Android TypeScript application compatible with the approved architecture.
- Work:
  - add Expo SDK 57 application files and `expo-router` entry;
  - configure strict TypeScript;
  - add minimal app config and placeholder route that clearly identifies the product as under development;
  - commit package manifest and lockfile when package tooling is available;
  - use Expo-compatible package versions rather than arbitrary native versions.
- Likely affected files/modules: `package.json`, lockfile, `app.json`/`app.config.ts`, `app/`, `tsconfig.json`, `babel.config.js` if required.
- Dependencies: Stage 07 gate only.
- Acceptance criteria:
  - [ ] Expo recognizes the project as SDK 57.
  - [ ] `expo-router/entry` is the application entry.
  - [ ] TypeScript strict mode is enabled.
  - [ ] No privileged secret is present in tracked files.
  - [ ] App can reach a deterministic initial route when dependencies are installed.
- Verification: install, Expo config/doctor as available, typecheck, start/build smoke test.
- Complexity: Medium
- Risk notes: Local package registry access may be unavailable; if so, use CI for independent validation and mark local gate PARTIAL rather than inventing results.

### TASK-P0-002 — Establish code-quality and test baseline
- Purpose: make every later task verifiable.
- Work:
  - configure ESLint for Expo/TypeScript;
  - configure Jest + React Native component test baseline;
  - add `lint`, `typecheck`, `test`, and project validation scripts;
  - add one deterministic smoke/unit test.
- Likely affected files/modules: `package.json`, ESLint config, Jest config, `tests/`.
- Dependencies: P0-001.
- Acceptance criteria:
  - [ ] Lint command exists and checks source/test files.
  - [ ] Typecheck command fails on type errors.
  - [ ] Test command runs at least one real test.
  - [ ] Commands are documented in PROJECT_STATUS.
- Verification: `npm run lint`, `npm run typecheck`, `npm test`.
- Complexity: Small
- Risk notes: Keep configuration standard; do not add overlapping format/lint frameworks.

### TASK-P0-003 — Add environment validation and secret hygiene
- Purpose: prevent accidental client exposure of OpenAI/Supabase privileged credentials.
- Work:
  - add `.env.example` with only approved client variables;
  - add typed runtime/public env validation;
  - ensure OpenAI/server secret variable names are documented but not imported by client code;
  - add a simple repository check for forbidden secret-style `EXPO_PUBLIC_*` names.
- Likely affected files/modules: `.env.example`, `src/lib/env.ts`, test/check script, docs.
- Dependencies: P0-001.
- Acceptance criteria:
  - [ ] Missing required public env values fail clearly in environments that initialize Supabase.
  - [ ] No `OPENAI_API_KEY`, Supabase secret/service-role key or equivalent is referenced through `EXPO_PUBLIC_*`.
  - [ ] `.env*` remains ignored except `.env.example`.
- Verification: unit tests for env parser; repository grep/check; typecheck.
- Complexity: Small
- Risk notes: Publishable Supabase client key is not treated as a secret; authorization still depends on RLS.

### TASK-P0-004 — Add shared providers and observability interfaces
- Purpose: create stable boundaries without implementing product screens prematurely.
- Work:
  - create TanStack Query client/provider;
  - add redacting logger interface;
  - add replaceable analytics interface with development no-op/console adapter;
  - create root provider composition.
- Likely affected files/modules: `src/lib/query-client.ts`, `src/lib/logger.ts`, `src/lib/analytics.ts`, `src/providers/`.
- Dependencies: P0-001.
- Acceptance criteria:
  - [ ] Root providers can initialize without user data.
  - [ ] Logger redacts known token/key field names.
  - [ ] Analytics API rejects/does not expose raw artwork/prompt payload fields by design.
- Verification: unit tests + typecheck.
- Complexity: Small
- Risk notes: Do not choose a paid analytics/crash vendor yet.

### TASK-P0-005 — Add CI baseline
- Purpose: make branch changes independently verifiable even when local package execution is unavailable.
- Work:
  - add GitHub Actions workflow for dependency install, lint, typecheck and tests;
  - use lockfile install once lockfile exists; temporarily fail/document if reproducibility prerequisite is missing rather than silently using stale dependencies;
  - add concurrency/caching only if simple and safe.
- Likely affected files/modules: `.github/workflows/ci.yml`.
- Dependencies: P0-001, P0-002.
- Acceptance criteria:
  - [ ] CI triggers on pull requests and relevant branch pushes.
  - [ ] A lint/type/test failure fails CI.
  - [ ] Workflow has minimum permissions and does not expose secrets to untrusted code.
- Verification: GitHub Actions run on this branch/PR.
- Complexity: Small
- Risk notes: Do not add deployment permissions to CI baseline.

### TASK-P0-006 — Establish Supabase repository structure
- Purpose: prepare version-controlled backend artifacts without provisioning production resources.
- Work:
  - add `supabase/` structure/config expected by current CLI;
  - reserve `migrations/`, functions, shared function utilities and deterministic seed path;
  - add backend-specific README/instructions if needed.
- Likely affected files/modules: `supabase/`.
- Dependencies: P0-001.
- Acceptance criteria:
  - [ ] Repository has a clear migration/function home.
  - [ ] No project ref, secret or user-owned credential is committed.
- Verification: repository inspection; Supabase CLI validation later when package/CLI access is available.
- Complexity: Small
- Risk notes: Do not create/link a remote Supabase project without the required external authorization/environment.

**Phase 0 gate:** install/lint/typecheck/test/config validation pass where runnable. Any unavailable command is recorded as PARTIAL with exact blocker before Phase 1 continues.

---

## Phase 1 — App shell/navigation

### TASK-P1-001 — Implement root session bootstrap state machine
- Purpose: prevent protected UI from flashing before auth/profile state is known.
- Work:
  - create auth/session provider boundary;
  - model initializing, signed-out, onboarding-incomplete and ready states;
  - keep protected routing decisions in the root boundary.
- Likely affected files/modules: `app/_layout.tsx`, `src/features/auth/`, `src/providers/`.
- Dependencies: P0-004, P2-001 client setup may initially use an interface until actual Supabase connection is configured.
- Acceptance criteria:
  - [ ] Root never treats `unknown` session as signed in.
  - [ ] Invalid session path can route safely to auth.
  - [ ] User-specific query cache can be cleared on sign-out/session change.
- Verification: component/unit tests for all four bootstrap states.
- Complexity: Medium
- Risk notes: Keep session persistence details in the Supabase adapter, not route files.

### TASK-P1-002 — Implement navigation shell and route groups
- Purpose: make every approved MVP screen reachable for a product reason.
- Work:
  - create `(auth)`, `(onboarding)`, `(tabs)` route groups;
  - create stack routes for lesson/checkpoint/attempt detail;
  - add placeholder states that state what remains unavailable rather than pretending features work.
- Likely affected files/modules: `app/`.
- Dependencies: P1-001.
- Acceptance criteria:
  - [ ] Auth, onboarding and app-shell destinations are structurally separated.
  - [ ] Home/Progress/History/Settings tabs render.
  - [ ] Lesson/checkpoint detail routes accept validated IDs.
  - [ ] Back navigation is coherent.
- Verification: navigation/component tests; manual Expo smoke test when runnable.
- Complexity: Medium
- Risk notes: Route access is usability, not authorization.

### TASK-P1-003 — Create minimal design-system primitives and accessibility baseline
- Purpose: avoid duplicating inconsistent UI while not over-designing before beta.
- Work:
  - add spacing/type/radius tokens;
  - shared button, text field, card, loading, empty/error state components;
  - accessible labels/touch targets/dynamic type-friendly layout.
- Likely affected files/modules: `src/theme/`, `src/components/`.
- Dependencies: P0-001.
- Acceptance criteria:
  - [ ] Screens use shared primitives for primary actions/states.
  - [ ] Error/empty/loading components do not rely on color alone.
  - [ ] Primary interactive controls have accessible labels/roles.
- Verification: component tests + accessibility assertions where supported.
- Complexity: Medium
- Risk notes: No visual redesign beyond a coherent MVP system.

### TASK-P1-004 — Add Turkish localization boundary
- Purpose: ship Turkish first without hard-wiring copy into business logic.
- Work:
  - add a small translation-key layer;
  - move shell/auth/onboarding copy into Turkish resource file;
  - expose locale to future AI request context.
- Likely affected files/modules: `src/i18n/`, UI files.
- Dependencies: P1-002.
- Acceptance criteria:
  - [ ] User-facing shell copy comes through translation keys.
  - [ ] Missing key behavior is deterministic in development.
- Verification: unit test + typecheck.
- Complexity: Small
- Risk notes: Do not add incomplete language packs as a beta claim.

**Phase 1 gate:** app shell starts and navigation/bootstrap/loading/error states do not crash.

---

## Phase 2 — Authentication/user model and backend foundation

### TASK-P2-001 — Implement Supabase mobile client/session storage adapter
- Purpose: connect the mobile app to Supabase safely.
- Work:
  - configure Supabase client with publishable URL/key;
  - implement current encrypted AsyncStorage + SecureStore-key session adapter;
  - wire auth refresh behavior to app lifecycle per current Supabase guidance;
  - expose typed auth methods.
- Likely affected files/modules: `src/lib/supabase/`, `src/features/auth/`.
- Dependencies: P0-003.
- Acceptance criteria:
  - [ ] Client contains only publishable key.
  - [ ] Session adapter does not rely on storing arbitrarily large auth payload directly in SecureStore.
  - [ ] Foreground/background refresh behavior follows the approved architecture.
- Verification: unit/integration tests with adapter doubles; real session test after development Supabase is available.
- Complexity: Medium
- Risk notes: Real end-to-end auth is blocked until a development Supabase project is supplied/approved.

### TASK-P2-002 — Create initial database migration: types, schema, constraints and indexes
- Purpose: translate DATABASE.md into version-controlled schema without weakening it.
- Work:
  - create enums/tables/constraints/FKs/indexes/timestamp triggers in dependency order;
  - preserve direct `user_id` ownership columns on private tables;
  - no seed content beyond data required by a later explicit seed task.
- Likely affected files/modules: `supabase/migrations/`.
- Dependencies: P0-006, approved DATABASE.md.
- Acceptance criteria:
  - [ ] All designed tables/types exist in migration.
  - [ ] Unique/state/cascade constraints match DATABASE.md.
  - [ ] No migration contains destructive reset logic for non-local environments.
- Verification: local Supabase migration apply/schema diff when CLI is available; SQL review.
- Complexity: Large
- Risk notes: Database design drift is P1 if it changes ownership/state invariants.

### TASK-P2-003 — Add grants, RLS and private Storage policies migration
- Purpose: enforce least privilege before client data paths are built.
- Work:
  - enable RLS on all exposed product tables;
  - revoke broad defaults and grant only intended operations;
  - add owner/read-only catalog policies;
  - create/configure private `artwork` bucket and immutable owner-prefix object policies.
- Likely affected files/modules: `supabase/migrations/`.
- Dependencies: P2-002.
- Acceptance criteria:
  - [ ] No private table is exposed without RLS.
  - [ ] Authenticated client cannot directly mutate critiques/scores/progress state.
  - [ ] Catalog is read-only to app users.
  - [ ] Artwork bucket is private and owner-prefixed.
- Verification: mandatory allow/deny test matrix from DATABASE.md.
- Complexity: Large
- Risk notes: Treat any cross-user read/write as P0/P1 and stop phase progression until fixed.

### TASK-P2-004 — Implement user RPCs for onboarding and lesson start/resume
- Purpose: keep assignment/progression invariants server-authoritative.
- Work:
  - implement `complete_onboarding` and `start_or_resume_lesson` with `auth.uid()`-derived ownership;
  - revoke default function execute and grant only intended authenticated access;
  - make repeated calls idempotent.
- Likely affected files/modules: `supabase/migrations/`, DB tests.
- Dependencies: P2-002, P2-003.
- Acceptance criteria:
  - [ ] Caller cannot assign data to another user.
  - [ ] Only supported active path can be assigned.
  - [ ] Later lesson cannot start before prerequisite completion.
  - [ ] Repeated valid calls return/reuse existing records.
- Verification: allow/deny SQL integration tests.
- Complexity: Medium
- Risk notes: Avoid `security definer` unless strictly required and explicitly hardened.

### TASK-P2-005 — Build email/password auth screens and behavior
- Purpose: make the private account lifecycle usable.
- Work:
  - sign-up/sign-in forms and validation;
  - confirmation/error states according to environment;
  - sign-out behavior and user-query cache clearing.
- Likely affected files/modules: `app/(auth)/`, `src/features/auth/`.
- Dependencies: P1-002, P2-001.
- Acceptance criteria:
  - [ ] Duplicate requests are disabled while pending.
  - [ ] Raw backend errors/tokens are not displayed/logged.
  - [ ] Successful new user reaches onboarding; returning completed user reaches Home.
  - [ ] Sign-out clears protected cache.
- Verification: component tests; real auth smoke test when dev backend is available.
- Complexity: Medium
- Risk notes: Do not add social auth outside MVP.

### TASK-P2-006 — Build onboarding UI and persist profile/path assignment
- Purpose: turn user goals into one supported learning path.
- Work:
  - implement age-band, experience, goal, category, medium, schedule and review steps;
  - persist through `complete_onboarding` RPC;
  - retain local selections across back navigation/save failure.
- Likely affected files/modules: `app/(onboarding)/`, `src/features/onboarding/`, queries/RPC client.
- Dependencies: P1-003, P1-004, P2-004, P2-005.
- Acceptance criteria:
  - [ ] No exact DOB or under-13 selection exists.
  - [ ] Required enums validate before server call.
  - [ ] Save failure retains choices and can retry.
  - [ ] Successful save is persisted and does not repeat on relaunch.
- Verification: component/unit tests; real backend test when available.
- Complexity: Medium
- Risk notes: Changing active path later is separate core-feature work.

### TASK-P2-007 — Seed four paths and minimum lesson catalog
- Purpose: provide deterministic content required for the vertical slice without inventing a CMS.
- Work:
  - seed all four learning-path shells;
  - author at least Landscape/Pencil Lesson 1 completely with ordered checkpoints/rubric dimensions;
  - keep remaining path content explicitly marked incomplete in implementation status, not fake production lessons.
- Likely affected files/modules: `supabase/seed.sql` or migration-backed seed content, content fixtures/tests.
- Dependencies: P2-002.
- Acceptance criteria:
  - [ ] Four unique path combinations exist.
  - [ ] Landscape/Pencil Lesson 1 has complete objective/materials/instructions/checkpoints and valid rubric dimensions.
  - [ ] Seed is deterministic/idempotent in local development.
- Verification: DB assertions + content review against PRODUCT_SPEC.
- Complexity: Medium
- Risk notes: Lesson quality is product logic; avoid bulk low-quality AI-generated filler.

**Phase 2 gate:** schema/RLS/RPC tests have no unauthorized allow path; auth/onboarding works in a real development environment once credentials exist.

---

## Phase 3 — First vertical slice (VS-001)

### TASK-P3-001 — Implement Home next-action query and Lesson 1 UI
- Purpose: take an onboarded learner to one server-eligible assignment.
- Work:
  - query active enrollment/path, completion state and next eligible lesson;
  - render Home CTA and lesson details/checkpoints;
  - start/resume attempt via server RPC.
- Likely affected files/modules: `src/features/learning-path/`, `src/features/lessons/`, Home/lesson routes.
- Dependencies: P2-004, P2-006, P2-007.
- Acceptance criteria:
  - [ ] Home identifies one next eligible action unless path complete.
  - [ ] Stale client cannot open/start a server-ineligible later lesson.
  - [ ] Attempt resumes after app restart.
- Verification: component/integration tests + real backend smoke test.
- Complexity: Medium
- Risk notes: No client-generated progress truth.

### TASK-P3-002 — Implement private artwork selection/upload and submission registration
- Purpose: persist a real checkpoint image privately and idempotently.
- Work:
  - ImagePicker camera/library flow with just-in-time permission;
  - validate max size/type and preview;
  - upload immutable object under approved owner path;
  - implement/use `register_artwork_submission` RPC for current checkpoint/version assignment;
  - handle retries without duplicate rows/versions.
- Likely affected files/modules: `src/features/submissions/`, checkpoint route, migrations/RPC, storage tests.
- Dependencies: P2-003, P3-001.
- Acceptance criteria:
  - [ ] Permission denied/cancel paths do not advance progress.
  - [ ] Failed upload does not create a completed submission/version.
  - [ ] User B cannot read/register user A object.
  - [ ] Duplicate submit tap/retry is idempotent.
- Verification: component tests + storage/RLS deny tests + real device/simulator upload.
- Complexity: Large
- Risk notes: Cross-user storage access is P0.

### TASK-P3-003 — Implement structured critique schema and prompt contract
- Purpose: constrain AI output before adding provider connectivity.
- Work:
  - define runtime validation schema for required feedback fields/rubric scores/confidence/limitations;
  - build server-owned prompt from lesson/checkpoint/rubric context;
  - explicitly treat image text/content as untrusted instructions;
  - add fixtures for valid, invalid, low-quality and correction responses.
- Likely affected files/modules: `supabase/functions/_shared/feedback-schema.ts`, prompt builder/tests.
- Dependencies: P2-007.
- Acceptance criteria:
  - [ ] Invalid/multi-issue/unrecognized-dimension output is rejected or normalized only by explicit safe rules.
  - [ ] Prompt never accepts client-provided rubric/instruction as authoritative.
  - [ ] Low-quality result has a distinct validated path.
- Verification: unit tests against fixtures.
- Complexity: Medium
- Risk notes: Never persist raw model output before validation.

### TASK-P3-004 — Implement `analyze-artwork` Edge Function and trusted persistence
- Purpose: deliver real AI critique without exposing credentials.
- Work:
  - authenticate request and authorize submission owner;
  - add idempotent `analysis_jobs` handling;
  - create provider adapter for OpenAI Responses image input;
  - validate response; bounded schema/provider retry;
  - implement trusted/atomic `apply_validated_critique` transition;
  - persist `needs_better_image`, success and failure states.
- Likely affected files/modules: `supabase/functions/analyze-artwork/`, shared code, migration/RPC, tests.
- Dependencies: P3-002, P3-003.
- Acceptance criteria:
  - [ ] Request for another user's submission is denied before provider call.
  - [ ] Client never receives OpenAI secret.
  - [ ] Duplicate request returns/reuses existing terminal critique when valid.
  - [ ] Provider/schema failure never completes checkpoint.
  - [ ] Valid critique persists exactly one critique per submission.
- Verification: function unit tests with provider fixtures; real provider call at VS-001 gate.
- Complexity: Large
- Risk notes: Requires external OpenAI API key/model access for final real gate; API call may incur spend.

### TASK-P3-005 — Implement feedback, correction and terminal checkpoint flow
- Purpose: complete the differentiating practice→correction loop.
- Work:
  - render structured feedback in fixed teaching order;
  - resubmit a new image version linked to previous priority issue;
  - evaluate/receive `target_improved` result;
  - advance accepted checkpoint or terminalize `needs_practice` after version 3;
  - complete lesson when all checkpoints terminal.
- Likely affected files/modules: `src/features/feedback/`, `src/features/submissions/`, server transition tests.
- Dependencies: P3-004.
- Acceptance criteria:
  - [ ] Primary UI displays one priority issue.
  - [ ] Initial and corrected versions stay linked.
  - [ ] Failed analysis does not consume a valid analyzed-version slot.
  - [ ] Maximum three analyzed versions prevents infinite loop.
  - [ ] Completion is persisted server-side.
- Verification: component/integration tests + DB state-transition tests.
- Complexity: Large
- Risk notes: Race conditions between repeated requests must be covered by unique constraints/transactional transition.

### TASK-P3-006 — Persist/reload history proof for VS-001
- Purpose: prove the architecture is not a transient demo.
- Work:
  - add minimal History/attempt detail for completed vertical-slice attempt;
  - reload session/app and fetch first/final submission plus critique;
  - refresh short-lived private media access safely.
- Likely affected files/modules: `src/features/history/`, History routes.
- Dependencies: P3-005.
- Acceptance criteria:
  - [ ] Completed lesson appears after a fresh reload.
  - [ ] First and final checkpoint images load only for owner.
  - [ ] Guessed foreign attempt ID returns not-authorized/not-found safely.
- Verification: real backend reload test + owner/non-owner test.
- Complexity: Medium
- Risk notes: Signed URLs must never become public/persistent business data.

### TASK-P3-007 — Execute and audit VS-001
- Purpose: pass lifecycle Stage 10 with evidence before broad features.
- Work:
  - run VS-001 on a development Supabase project and real configured OpenAI model;
  - capture verification commands/results, latency/error behavior and provider usage category;
  - independently audit requirements, RLS/storage, secret exposure, state transitions and mocks;
  - fix any P0/P1 and rerun focused gate.
- Likely affected files/modules: tests, `docs/AUDIT_01.md`, `docs/PROJECT_STATUS.md`, fixes discovered by audit.
- Dependencies: P3-001 through P3-006 plus external development credentials/environment.
- Acceptance criteria:
  - [ ] Real end-to-end path succeeds.
  - [ ] Real failure path (at minimum unauthorized access + provider/upload failure) is verified.
  - [ ] No hidden critical mock remains.
  - [ ] No unresolved P0/P1 audit finding.
- Verification: reproducible test checklist + CI/local tests + real environment evidence.
- Complexity: Medium
- Risk notes: **External blocker point:** requires a development Supabase project/config and OpenAI API key/model access; invoking the real provider can create billable usage and must not be fabricated.

**Phase 3 / Audit #1 gate:** no unresolved P0/P1 and VS-001 is real.

---

## Phase 4 — Core product features (beta must-have after VS-001)

### TASK-P4-001 — Complete curriculum for all four MVP paths
- Purpose: make onboarding choices lead to real learning content.
- Work: author/review dependency-ordered lessons/checkpoints/rubrics for four paths; keep scope bounded to beta curriculum.
- Likely affected files/modules: seed/catalog migrations/content tests.
- Dependencies: P3-007.
- Acceptance criteria:
  - [ ] Every supported onboarding combination has an active ordered course.
  - [ ] Every lesson checkpoint declares relevant rubric dimensions.
  - [ ] No placeholder/TODO lesson is exposed as complete content.
- Verification: catalog integrity tests + product content review.
- Complexity: Large
- Risk notes: Content quality requires deliberate art-teaching review; quantity is not the target.

### TASK-P4-002 — Implement evidence-based Progress and next-focus recommendation
- Purpose: show what the learner should improve next without false scientific precision.
- Work:
  - implement owner-scoped skill-summary RPC/view from critique evidence;
  - implement insufficient-data state;
  - show progress dimensions and current focus;
  - Home recommendation uses recurring weakness only when relevant to next lesson.
- Likely affected files/modules: migrations/RPC, `src/features/progress/`, Home.
- Dependencies: P3-005.
- Acceptance criteria:
  - [ ] Only validated allowed rubric scores contribute.
  - [ ] Insufficient evidence never produces fake precision.
  - [ ] Recommendation is traceable to evidence/current lesson objective.
- Verification: aggregation unit/DB tests + UI tests.
- Complexity: Medium
- Risk notes: Treat score as practice evidence, not objective artistic ability.

### TASK-P4-003 — Complete history and before/after comparison
- Purpose: make progress visually tangible.
- Work:
  - paginate/lazy-load attempt history;
  - checkpoint detail with critique;
  - before/after toggles first vs final version only;
  - expiry/not-found/deleted media recovery.
- Likely affected files/modules: `src/features/history/`.
- Dependencies: P3-006.
- Acceptance criteria:
  - [ ] Empty/loading/error states exist.
  - [ ] Before/after never mixes checkpoints/users.
  - [ ] Expired private media access refreshes through authorized path.
- Verification: component/integration + RLS tests.
- Complexity: Medium
- Risk notes: Thumbnail/media performance measured later.

### TASK-P4-004 — Implement feedback usefulness rating
- Purpose: measure whether the core critique is useful.
- Work: Helpful/Not helpful control with optional optimistic update/rollback; owner RLS.
- Likely affected files/modules: feedback UI, `feedback_ratings` query/mutation tests.
- Dependencies: P3-004.
- Acceptance criteria:
  - [ ] Rating is optional and never gates learning.
  - [ ] User cannot rate another user's critique.
  - [ ] Failure rolls back without losing critique.
- Verification: UI + allow/deny DB tests.
- Complexity: Small
- Risk notes: Do not add free-text support scope.

### TASK-P4-005 — Implement profile preference editing with safe path-change confirmation
- Purpose: allow reasonable settings changes without corrupting course progress.
- Work:
  - edit weekly practice/session preference directly through safe owner update/RPC;
  - changing category/medium requires explicit reset/new enrollment semantics designed from existing documents;
  - do not delete historical attempts implicitly.
- Likely affected files/modules: Settings/profile, RPC/migration if required.
- Dependencies: P2-006, P4-002.
- Acceptance criteria:
  - [ ] Historical attempts remain intact after preference/path change.
  - [ ] One active enrollment invariant remains true.
  - [ ] User sees consequence before path switch.
- Verification: DB + UI tests.
- Complexity: Medium
- Risk notes: If path-switch semantics require a product promise change, record decision before implementation.

### TASK-P4-006 — Implement individual attempt/artwork deletion
- Purpose: give users direct control over private content.
- Work:
  - trusted idempotent deletion orchestration for Storage + DB tree;
  - destructive confirmation and recovery UI.
- Likely affected files/modules: Edge Function/RPC, History/Settings, storage tests.
- Dependencies: P3-006.
- Acceptance criteria:
  - [ ] Owner can delete own attempt and all associated objects/derived rows.
  - [ ] Non-owner deletion is denied.
  - [ ] Retry after partial failure is safe.
- Verification: real Storage/DB deletion test for owner/non-owner.
- Complexity: Medium
- Risk notes: False deletion success is P1/privacy blocker.

### TASK-P4-007 — Implement in-app full account deletion
- Purpose: complete the required privacy/account lifecycle.
- Work:
  - authenticated `delete-account` Edge Function;
  - storage prefix cleanup;
  - Auth admin deletion only after request authorization;
  - idempotent deletion-request state and UI confirmation.
- Likely affected files/modules: `supabase/functions/delete-account/`, Settings, DB/security tests.
- Dependencies: P4-006.
- Acceptance criteria:
  - [ ] Function ignores/rejects arbitrary target user IDs from untrusted body.
  - [ ] User A deletion leaves no A artwork/product rows and does not affect B.
  - [ ] Local session/cache clears after confirmed success.
- Verification: real development environment deletion test.
- Complexity: Large
- Risk notes: Secret/admin key usage is server-only; deletion behavior is release-critical.

**Phase 4 gate:** all README/Product Spec beta core acceptance criteria are implemented except explicitly later phases.

---

## Phase 5 — Social/community features

**N/A for MVP.** README/ADR-009 explicitly exclude public feed, followers, comments, marketplace and public UGC. Do not create placeholder social infrastructure.

---

## Phase 6 — Notifications/localization

### TASK-P6-001 — Finish Turkish copy/content consistency and locale plumbing
- Purpose: ensure all beta UI/error/AI language is consistently Turkish while keeping future localization possible.
- Work: audit hard-coded strings; complete Turkish resource keys; pass locale explicitly to critique function.
- Likely affected files/modules: `src/i18n/`, screens, analyze request context.
- Dependencies: Phase 4 core UI.
- Acceptance criteria:
  - [ ] No major beta screen exposes accidental English implementation text.
  - [ ] AI feedback language is explicit, not inferred from image.
- Verification: string audit + UI smoke test.
- Complexity: Small
- Risk notes: English public launch is not claimed unless translated/tested.

### TASK-P6-002 — Practice reminders
- Purpose: optional retention support only if it remains inside approved weekly-practice intent.
- Work: **Post-beta by default**; do not implement push/local reminders unless product owner explicitly promotes them to beta after core-loop metrics exist.
- Likely affected files/modules: N/A until promoted.
- Dependencies: Core loop validated.
- Acceptance criteria:
  - [ ] No notification permission is requested in beta build unless the feature is promoted and usable.
- Verification: permission/config inspection.
- Complexity: N/A
- Risk notes: Avoid sensitive critique text on lock screen.

---

## Phase 7 — Moderation/security/privacy hardening

### TASK-P7-001 — Run full authorization/storage security suite
- Purpose: catch cross-user access and privilege regressions across every feature.
- Work: execute all DATABASE.md allow/deny cases with user A/user B/anon; add regression cases discovered during implementation.
- Likely affected files/modules: DB/security tests, migrations/fixes.
- Dependencies: Phase 4.
- Acceptance criteria:
  - [ ] No unauthorized private read/write/delete path.
  - [ ] Catalog remains read-only.
  - [ ] Storage ownership/immutability holds.
- Verification: automated security test output.
- Complexity: Medium
- Risk notes: Any unauthorized private access is P0/P1.

### TASK-P7-002 — Audit secrets, prompt injection and logging/privacy
- Purpose: ensure artwork/AI integration does not create hidden privacy/security leaks.
- Work:
  - scan client bundle/config for secret-style values;
  - adversarially test image/text instruction injection against prompt contract;
  - verify logs/analytics exclude image URLs, tokens, raw image, full prompt/response;
  - review dependency advisories.
- Likely affected files/modules: CI checks, Edge Function tests, logger/analytics, docs.
- Dependencies: Phase 4.
- Acceptance criteria:
  - [ ] No privileged key in client/tracked output.
  - [ ] Model output cannot directly mutate state except through validated server logic.
  - [ ] Logging/analytics data minimization is demonstrable.
- Verification: security audit report + automated checks where possible.
- Complexity: Medium
- Risk notes: Use preferred critical reviewer model per MODEL_ROUTING; fallback must be labeled accurately.

### TASK-P7-003 — Privacy/account lifecycle audit
- Purpose: verify 13+ data minimization, media retention and deletion promise before release.
- Work: test attempt deletion/account deletion; inspect retained DB/storage/log data; prepare accurate data inventory for store privacy work.
- Likely affected files/modules: deletion functions/tests, release docs.
- Dependencies: P4-006, P4-007.
- Acceptance criteria:
  - [ ] Exact DOB is absent.
  - [ ] Deleted artwork is not reachable after refresh/new signed URL request.
  - [ ] Full account deletion behavior matches documented promise.
- Verification: deletion evidence + data inventory.
- Complexity: Medium
- Risk notes: Reverify provider/platform data policies during release stage.

---

## Phase 8 — Analytics/performance

### TASK-P8-001 — Instrument beta funnel with privacy-safe events
- Purpose: measure whether users complete the value loop.
- Work: implement approved event calls from analytics abstraction; choose/configure a provider only if needed and approved, otherwise development/beta telemetry strategy must still expose required metrics safely.
- Likely affected files/modules: analytics adapter, feature events, docs.
- Dependencies: Phase 4.
- Acceptance criteria:
  - [ ] Can measure onboarding→first upload→feedback→resubmission→lesson completion.
  - [ ] No raw private content/PII in event payload.
- Verification: event contract tests + development event inspection.
- Complexity: Medium
- Risk notes: A paid analytics vendor requires separate approval if it introduces spend/major dependency.

### TASK-P8-002 — Measure and optimize upload/analysis/history performance
- Purpose: keep the feedback loop tolerable on realistic mobile networks/devices.
- Work: measure upload size/latency, AI latency, query count/cache, history thumbnail loading; add only evidence-based optimizations.
- Likely affected files/modules: submissions, Edge Function, query config, history.
- Dependencies: real beta-like backend and provider environment.
- Acceptance criteria:
  - [ ] Latency buckets are observable.
  - [ ] User can leave/return during analysis without losing state.
  - [ ] History does not eagerly download all full-size images.
- Verification: measured smoke/profile results recorded in audit.
- Complexity: Medium
- Risk notes: Queue/image transformation service remains deferred unless measurements justify it.

### TASK-P8-003 — Audit #2
- Purpose: independently review full beta MVP for drift, placeholders, regressions and production configuration risks.
- Work: requirements coverage, dead code/TODOs, runtime, auth/RLS, privacy, localization, analytics integrity, performance, offline/degraded paths.
- Likely affected files/modules: `docs/AUDIT_02.md` + discovered fixes.
- Dependencies: P8-001, P8-002, Phase 7.
- Acceptance criteria:
  - [ ] No unresolved P0/P1.
  - [ ] Remaining P2 risks are explicit and accepted/deferred with rationale.
- Verification: audit checklist + rerun CI/security/e2e.
- Complexity: Medium
- Risk notes: Critical review follows MODEL_ROUTING.

---

## Phase 9 — Store/release readiness

### TASK-P9-001 — Reverify current Apple/Google/Expo/Supabase/OpenAI policies and disclosures
- Purpose: avoid shipping based on stale platform memory.
- Work: verify current store privacy/account deletion/minor audience/camera-photo permissions/AI/provider data rules; record sources/date and required disclosures.
- Likely affected files/modules: `docs/RELEASE_CHECKLIST.md`, privacy/data inventory, app config permission copy.
- Dependencies: P8-003.
- Acceptance criteria:
  - [ ] Every requested native permission is justified by a working feature.
  - [ ] In-app deletion satisfies current applicable store expectations.
  - [ ] Privacy/data disclosures match actual app/provider behavior.
- Verification: primary-source checklist.
- Complexity: Medium
- Risk notes: Policy changes are time-sensitive; use current official sources only.

### TASK-P9-002 — Production configuration/build hardening
- Purpose: make a reproducible release candidate without performing public submission.
- Work: environment separation, EAS config, signing placeholders/user-owned asset hooks, production error reporting decision, migration rollback plan, release smoke tests.
- Likely affected files/modules: `eas.json`, app config, CI/release docs.
- Dependencies: P9-001.
- Acceptance criteria:
  - [ ] Production secrets are not committed.
  - [ ] Build configuration separates development/production.
  - [ ] Release build process is documented/reproducible as far as user-owned credentials allow.
- Verification: non-public preview/release candidate build when credentials permit; smoke tests.
- Complexity: Medium
- Risk notes: Store certificates/accounts and public submission are external user-owned actions.

### TASK-P9-003 — Beta readiness gate
- Purpose: define who tests the product and what determines success/failure.
- Work:
  - define beta audience and onboarding instructions;
  - primary metric thresholds and feedback channel;
  - crash/error visibility and hotfix/rollback path;
  - seed/content readiness check;
  - final critical security/release review.
- Likely affected files/modules: `docs/BETA_PLAN.md`, `docs/PROJECT_STATUS.md`, release checklist.
- Dependencies: P9-002.
- Acceptance criteria:
  - [ ] Beta measures full feedback-loop completion, not installs alone.
  - [ ] No known release-blocking security/policy issue.
  - [ ] External actions remaining are enumerated precisely.
- Verification: final gate report.
- Complexity: Medium
- Risk notes: Public/store release still requires explicit external authorization.

---

## Post-beta backlog — explicitly not part of current implementation
- Users under 13 / family accounts.
- More art categories/media.
- Human critique/instructor marketplace.
- Public social/community/UGC.
- Real-time video/camera coaching.
- AR overlays.
- Open tutoring chat.
- Subscription/paywall/payment activation.
- Certificates/leaderboards/competitions.
- Dedicated queue/worker unless production measurements require it.
- General CMS/course-authoring platform.

## Stage 07 gate review

**Status: PASS — 2026-09-07**

Checks:
- Tasks are dependency-ordered and map to README/PRODUCT_SPEC/USER_FLOWS/ARCHITECTURE/DATABASE.
- Every task includes purpose, work, affected areas, dependencies, acceptance criteria, verification, complexity and risk.
- The first real vertical slice is explicit and prohibits hidden critical mocks.
- Security/testing/release work is attached to feature phases rather than deferred wholesale.
- The next task, P0-001, can start without inventing architecture or product behavior.

No application code existed before this plan gate. Phase 0 is now eligible.
