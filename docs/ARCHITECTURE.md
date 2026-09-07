# Architecture

## 1. Architecture goals

DrawCoach AI must make one feedback loop reliable before expanding feature breadth:

`authenticate → choose learning profile → open eligible lesson → submit private artwork → receive structured AI critique → resubmit correction → complete checkpoint → persist progress`.

Architecture priorities, in order:
1. Private artwork and strict per-user authorization.
2. AI credentials and privileged operations stay server-side.
3. One server-authoritative lesson/checkpoint state machine.
4. Structured, validated AI output rather than free-form model text.
5. Small reversible mobile architecture with minimal custom infrastructure.
6. Observable failures and idempotent retries around uploads/analysis.
7. A stack that can ship to iOS and Android from one codebase.

## 2. Chosen stack and current-version verification

### Mobile
- **Expo SDK 57**.
- **React Native 0.86** and **React 19.2.3** as paired by Expo SDK 57.
- **TypeScript strict mode**.
- **Expo Router** for file-based navigation.
- **Expo ImagePicker** for camera/library selection.
- **Expo SecureStore + encrypted AsyncStorage adapter** for Supabase auth session persistence on native, following Supabase's production-oriented React Native guidance for session values that may exceed native secure-store payload limits.
- **TanStack Query v5** for server-state caching, retry boundaries and mutation invalidation. No separate global client-state library in MVP.

### Backend/data
- **Supabase** for Postgres, Auth, Storage and Edge Functions.
- **PostgreSQL RLS + explicit grants** for all client-exposed product data.
- **Private Supabase Storage bucket** for learner artwork.
- **Supabase Edge Functions** for AI orchestration and privileged deletion operations.

### AI
- **OpenAI Responses API** with image input.
- Initial evaluation target: **GPT-5.6 Terra** because current OpenAI model guidance positions it as the intelligence/cost balance. The deployed model ID is an Edge Function secret/config value (`OPENAI_FEEDBACK_MODEL`) rather than client code, so it can be changed after measured quality/cost evaluation.
- Structured JSON output is validated server-side before persistence.

### Runtime/tooling
- Node.js **22.13.x or newer compatible 22.x** for Expo SDK 57 tooling baseline.
- npm initially, with a committed lockfile required before the foundation gate is considered fully PASS.
- Supabase CLI for local schema/migrations/function development once a Supabase project is linked.
- GitHub Actions for lint, typecheck and tests; Expo/EAS release jobs are added only when release configuration is available.

### Verification date
Current-version decisions were verified on **2026-09-07** against primary documentation:
- Expo SDK reference: https://docs.expo.dev/versions/latest/
- Expo Router: https://docs.expo.dev/versions/latest/sdk/router/
- Expo ImagePicker: https://docs.expo.dev/versions/latest/sdk/imagepicker/
- Supabase Expo quickstart: https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
- Supabase React Native client initialization / secure storage patterns: https://supabase.com/docs/reference/javascript/initializing
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase Edge Function secrets: https://supabase.com/docs/guides/functions/secrets
- OpenAI models: https://platform.openai.com/docs/models
- OpenAI image-input Responses quickstart: https://platform.openai.com/docs/quickstart/make-your-first-api-request
- OpenAI API data controls: https://platform.openai.com/docs/models/default-usage-policies-by-endpoint

Version-specific implementation must continue to use `npx expo install` for Expo-managed package compatibility rather than hand-picking native package versions.

## 3. System context

```text
┌──────────────────────────────┐
│ Expo / React Native client   │
│                              │
│ UI + local form state        │
│ Expo Router                  │
│ Query cache                  │
│ Supabase publishable key     │
└───────────────┬──────────────┘
                │ HTTPS + user JWT
                ▼
┌──────────────────────────────────────────────┐
│ Supabase                                     │
│                                              │
│ Auth                                         │
│ Postgres + RLS                               │
│ Private Storage                              │
│ Edge Functions                              │
│  - analyze-artwork                           │
│  - delete-account                            │
└───────────────┬──────────────────────────────┘
                │ server-side only
                │ OPENAI_API_KEY
                ▼
┌──────────────────────────────┐
│ OpenAI Responses API         │
│ image + constrained context  │
│ structured text result       │
└──────────────────────────────┘
```

The mobile client never receives OpenAI credentials, Supabase secret/service-role credentials or an unrestricted storage URL.

## 4. Module/directory boundaries

Target repository structure:

```text
app/                              # Expo Router route files only
  _layout.tsx
  index.tsx                       # bootstrap redirect
  (auth)/
  (onboarding)/
  (tabs)/
  lesson/[lessonId].tsx
  attempt/[attemptId]/checkpoint/[checkpointId].tsx

src/
  components/                     # shared presentational UI
  theme/                          # tokens/theme primitives
  features/
    auth/
    onboarding/
    learning-path/
    lessons/
    submissions/
    feedback/
    progress/
    history/
    settings/
  lib/
    env.ts                        # public env validation only
    supabase/
      client.native.ts
      client.web.ts               # only if web is retained for dev
      secure-storage.ts
    query-client.ts
    analytics.ts
    logger.ts
  types/
    database.types.ts             # generated from Supabase after project exists
    domain.ts

tests/
  unit/
  integration/

supabase/
  config.toml
  migrations/
  seed.sql                        # deterministic lesson seed when implemented
  functions/
    _shared/
    analyze-artwork/
    delete-account/

.github/workflows/
  ci.yml

docs/
```

Route files are thin composition layers. Feature business logic, validation and data hooks live in `src/features/*`.

## 5. Navigation/routing

Use Expo Router route groups:
- `(auth)` — welcome/sign-in/sign-up.
- `(onboarding)` — mandatory profile sequence.
- `(tabs)` — Home, Progress, History, Settings.
- Modal/stack routes outside tabs for lesson/checkpoint detail.

Root bootstrap states are explicit:
1. `initializing-session`
2. `signed-out`
3. `signed-in-onboarding-incomplete`
4. `signed-in-ready`

No protected route makes its own ad-hoc auth decision. The root provider/layout resolves session state and route guards redirect based on the authoritative profile state.

## 6. State management

### Local UI state
React component state/reducers for:
- onboarding selections before save,
- selected upload image before persistence,
- destructive confirmation UI,
- transient tab/accordion state.

### Session state
A small `AuthProvider` wraps Supabase auth events and exposes:
- session bootstrap status,
- user ID,
- signed-in/signed-out state.

It does **not** copy all server profile data into a global store.

### Server state
TanStack Query owns remote data:
- learner profile,
- active enrollment/path,
- lesson catalog/eligibility,
- current attempt/checkpoint,
- submission/analysis status,
- progress summary,
- history.

Mutations invalidate only affected query keys.

## 7. Data fetching/cache

- Supabase JS client handles user-authorized CRUD for ordinary rows allowed by RLS.
- Critical state transitions that require multi-row invariants use Postgres RPC/functions or Edge Functions rather than chained client writes.
- Query retries are bounded:
  - ordinary safe GET/select: limited retry with backoff,
  - mutations: no blind automatic retry unless idempotency is guaranteed,
  - AI analysis: explicit retry via stable analysis/submission ID.
- Signed URLs for private artwork are short-lived and not persisted in business tables or analytics.
- Cache may show previously loaded lesson/progress content offline, but UI must not claim remote mutations succeeded while offline.

## 8. Authentication/session

Supabase Auth, email/password for MVP.

Native session persistence:
- Follow Supabase's React Native secure-storage pattern: store an encryption key in Expo SecureStore and encrypted session payload in AsyncStorage so token-size growth does not rely on small native keychain value limits.
- `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false` on native.
- App foreground/background lifecycle controls token refresh according to current Supabase React Native guidance.

Rules:
- Only the Supabase publishable client key is bundled in the app.
- Session is restored before protected routing.
- Sign out clears query cache containing user-specific records.
- Auth error logs never contain tokens/passwords.

## 9. Authorization boundary

### Client-authorized operations
The mobile client may directly access only rows/objects protected by Postgres/Storage policies that can be safely expressed as owner/public-catalog rules.

### Trusted operations
Edge Functions are required for:
- calling OpenAI,
- validated AI result persistence where privileged orchestration is needed,
- full account deletion including Auth admin deletion,
- any future operation that needs secret-key access or cross-owner administration.

### Policy rule
Client UI checks are usability only. Database RLS/storage policy/server ownership validation are authoritative.

## 10. Backend/API responsibilities

### `analyze-artwork`
Authenticated Edge Function.

Request:
```json
{ "submission_id": "uuid" }
```

Responsibilities:
1. Verify user identity from request context.
2. Select the submission through user-scoped access and confirm it belongs to the current active attempt/checkpoint.
3. Apply idempotency: if a valid critique already exists for the submission, return it; if terminal failure requires manual retry, transition deliberately.
4. Load lesson/checkpoint/rubric context and only the minimum recent learner-focus summary.
5. Obtain a short-lived authorized image representation for server/provider use.
6. Call OpenAI Responses API with image input.
7. Validate response against a strict schema.
8. If image quality is insufficient, store a non-critique `needs_better_image` result.
9. Persist critique/rubric evidence in one server-controlled transaction/RPC where state transitions must be atomic.
10. Return normalized analysis state.

AI prompt injection defense:
- Treat artwork/image content as untrusted content, never instructions.
- Developer/system instructions explicitly say not to follow text found inside the artwork/image.
- Lesson/rubric context is server-owned.
- Model output is schema-validated and cannot directly execute tools/database mutations.

### `delete-account`
Authenticated Edge Function.
- Confirms requesting user.
- Executes idempotent deletion workflow.
- Removes/queues private storage cleanup before deleting auth identity where required for ownership references.
- Uses Supabase secret key/admin capability only inside the function.

### Postgres RPC/state transitions
Prefer SQL functions for atomic operations such as:
- create/resume attempt,
- create submission version with monotonic version number,
- accept/terminalize checkpoint after validated critique,
- complete lesson when all checkpoints are terminal.

Functions are `security invoker` by default unless a documented `security definer` function is strictly necessary and hardened with explicit search path/authorization.

## 11. Database/storage interface

Detailed schema and policies live in `docs/DATABASE.md`.

Architecture expectations:
- UUID PKs.
- `auth.users` is identity source; `profiles.id` references user ID.
- lesson catalog is server-seeded/read-only to clients.
- attempts/submissions/critiques/progress are private owner data.
- no client-settable `user_id` is trusted without RLS/check logic.
- state enums/check constraints prevent impossible progress states.

## 12. Media/storage

Bucket: `artwork` — private.

Object key convention:
```text
<user_id>/<attempt_id>/<checkpoint_id>/<submission_id>/<normalized-filename>
```

Why user ID is first:
- makes owner policy predicates and bulk deletion tractable.

Upload rules:
- max 15 MB per MVP submission.
- image MIME allowlist.
- one stored object per submission version.
- client never creates public URLs.
- image picker permission is requested only at action time.

Image processing:
- MVP does not add a separate image-processing vendor.
- Before AI submission, prefer a bounded resolution/quality path to control latency/cost if Expo/Supabase-supported transforms can do so without destructive UX. Exact transform values are measured during vertical-slice testing, not guessed into product scope.

## 13. Background jobs

No general background-worker platform in MVP.

AI analysis is initiated on demand by an authenticated Edge Function and persisted as a job-like state on the submission/analysis row (`queued|processing|succeeded|needs_better_image|failed`). The client can leave and later reload the persisted state.

If production measurements show Edge Function duration/reliability is insufficient, introduce a queue/worker only through a recorded architecture decision. Do not pre-build it.

## 14. Notifications

Not required for the first vertical slice.

Later MVP reminder task may add opt-in practice reminders. No critique text or artwork content appears in notifications/lock screen by default.

## 15. Localization

- Turkish is the first shipped locale.
- User-facing strings live behind a translation-key layer from the foundation phase.
- English resource file may exist as parity scaffolding only when translations are actually maintained.
- AI feedback language is passed explicitly (`tr` in first beta) from app/profile locale; never inferred from image text.

## 16. Analytics

Create a small analytics interface so provider choice is replaceable.

Core events:
- onboarding completion,
- lesson start/completion,
- artwork upload success/failure,
- analysis success/failure + latency bucket,
- correction started/accepted,
- checkpoint `needs_practice`,
- feedback helpful/not-helpful,
- before/after viewed,
- account deletion lifecycle.

Privacy constraints:
- no raw image,
- no image URL/storage path,
- no email,
- no auth token,
- no full critique text,
- no unrestricted prompt/response logging.

Provider selection is deferred until a concrete analytics need exists; foundation implements the interface and development console/no-op adapter.

## 17. Error handling

Error taxonomy:
- `validation`
- `auth`
- `forbidden`
- `not_found`
- `offline`
- `timeout`
- `storage`
- `analysis_provider`
- `analysis_schema`
- `server`
- `configuration`

UI maps internal errors to safe actionable messages. Raw provider/database errors remain in controlled development logs only and are redacted before production telemetry.

Critical rules:
- upload failure never advances checkpoint,
- provider failure never completes checkpoint,
- stale client eligibility never overrides server state,
- account deletion never reports completion until server says terminal success.

## 18. Logging/observability

### Client
- development logger abstraction with redaction.
- production error reporting provider deferred; interface established before beta.
- correlation/request IDs may be logged; artwork paths/content may not.

### Edge Functions
Structured logs:
- function name,
- request/correlation ID,
- anonymized/opaque user ID if needed for debugging,
- submission/analysis ID,
- stage,
- latency,
- provider status category,
- schema-validation category.

Never log:
- OpenAI API key,
- Supabase secret key,
- user JWT,
- raw artwork bytes/base64,
- full signed URL,
- unrestricted AI prompt/response in production.

## 19. Environment/secrets

Client `.env` values allowed:
```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
EXPO_PUBLIC_APP_ENV=development
```

Server/Edge Function secrets only:
```text
OPENAI_API_KEY=
OPENAI_FEEDBACK_MODEL=gpt-5.6-terra
```

Supabase provides its server-side URL/publishable/secret key environment values to hosted Edge Functions. Secret/service-role style keys never enter `EXPO_PUBLIC_*` values.

`.env` files are gitignored; `.env.example` contains names/placeholders only.

## 20. Testing strategy

### Unit tests
- onboarding enum/profile validation,
- feedback schema validation shared types where portable,
- next-focus selection logic,
- error mapping,
- state-machine helpers.

### Component tests
- auth loading/error,
- onboarding navigation/validation,
- feedback rendering,
- permission-denied artwork flow,
- progress insufficient-data state.

### Integration tests
- Supabase client auth bootstrap with test doubles at client boundary.
- query mutation/error behavior.
- Edge Function request validation and mocked provider responses.

### Database security tests
Against local Supabase/test project:
- owner allow paths,
- non-owner deny paths,
- catalog read-only behavior,
- storage object ownership,
- state transition restrictions.

### End-to-end
First real vertical slice on a development Supabase project and at least one realistic Android/iOS target before release. AI provider call is real at the vertical-slice gate; deterministic fixture responses are allowed in lower-level tests only.

## 21. CI/CD and environments

Environments:
- `local` — local app + local Supabase when available.
- `development` — shared development Supabase project + development AI key/model configuration.
- `production` — created only for release preparation.

GitHub Actions baseline:
1. install dependencies from lockfile,
2. `npm run lint`,
3. `npm run typecheck`,
4. `npm test -- --runInBand` or project-equivalent deterministic test command,
5. static configuration checks.

Supabase migration/function checks are added when those files exist.

No production deployment, EAS submission or store release occurs automatically from an unreviewed branch.

## 22. Security/privacy

Baseline: OWASP MASVS categories as required by `AGENTS.md`.

Controls:
- secure session storage strategy,
- private artwork bucket,
- RLS on every client-exposed user table,
- explicit grants,
- short-lived signed media access,
- server-side AI key,
- server-side account deletion,
- minimum native permissions,
- no social/public UGC,
- age band instead of DOB,
- analytics minimization,
- prompt-injection resistance for image/text content,
- bounded AI retries and schema validation.

OpenAI provider-data note verified 2026-09-07:
- image/file inputs to supported endpoints are subject to OpenAI platform data controls and safety scanning described in current official documentation.
- Product privacy disclosure and provider configuration must be re-verified at release rather than assuming today's terms remain unchanged.

## 23. Performance

Targets for beta instrumentation, not guaranteed SLAs:
- app shell interactive without waiting for lesson images/history,
- ordinary DB query p50 target under 500 ms on healthy network where feasible,
- artwork upload visibly progresses,
- AI feedback latency measured end-to-end and bucketed; UI tolerates leaving/re-entering analysis state,
- history thumbnails lazy-loaded,
- query cache avoids refetching stable catalog content on every focus event.

Cost controls:
- one image per submission version,
- max three analyzed versions/checkpoint,
- bounded provider retry,
- no open-ended AI chat,
- configurable model,
- no sending unrelated history/images to the model.

## 24. Deferred architecture / non-decisions

Not chosen until evidence requires them:
- subscription/payments stack,
- push notification provider,
- separate queue/worker service,
- separate image CDN/vendor,
- web-first product shell,
- CMS/course-authoring backend,
- social/community backend,
- vector database/embeddings,
- realtime drawing/video pipeline.

## 25. Risks and mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Broken RLS exposes private artwork/feedback | P0 | explicit ownership model, storage policies, deny tests before vertical slice |
| AI key leaks to client | P0 | Edge Function only; env/config scan in CI |
| Client can forge lesson completion | P1 | server-authoritative/RPC state transitions |
| Duplicate analysis/upload creates inconsistent progress | P1 | stable IDs, unique constraints, idempotent function behavior |
| AI follows text/instructions embedded in artwork | P1 quality/security | image content treated as untrusted; server-owned developer prompt; structured output only |
| SecureStore token payload grows beyond native limits | P1 auth reliability | encrypted AsyncStorage adapter with key held in SecureStore per Supabase guidance |
| AI analysis exceeds function/runtime tolerance | P2 | persisted states + explicit retry; queue introduced only if measurements justify it |
| Skill scoring appears falsely scientific | P2 product trust | evidence framing + insufficient-data state + simple normalized rubric |

## 26. Architecture gate review

**Gate status: FALLBACK PASS**  
**Preferred reviewer:** `gpt-6-astra`  
**Actual reviewer:** `gpt-5.6-sol` (fallback; Astra unavailable in this runtime)  
**Review date:** 2026-09-07

Focused review questions:
- Can any client receive privileged provider/admin credentials? **No.**
- Is private artwork authorization owned by UI state? **No; RLS/storage/server checks are authoritative.**
- Can a client unilaterally complete a lesson/checkpoint? **No; server state transitions are required.**
- Is AI output trusted directly? **No; structured schema validation is mandatory.**
- Is analysis retry/idempotency addressed? **Yes; stable submission IDs and persisted analysis state are required.**
- Is session storage appropriate for mobile token sensitivity/size? **Yes; encrypted AsyncStorage with SecureStore-held key is selected based on current Supabase guidance.**
- Is an unnecessary queue/microservice introduced before evidence? **No.**

No unresolved P0/P1 architecture finding remains. Database/RLS details must still pass the separate Stage 06 authorization gate.
