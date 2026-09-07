# Decisions

Record material product/architecture decisions. Do not log trivial code choices.

## ADR-001 — Feedback-first learning loop
- Status: Accepted
- Date: 2026-09-07
- Context: Passive lesson libraries do not solve the user's stated problem: knowing what is wrong in their own drawing and what to fix next.
- Decision: The core product loop is checkpoint assignment → artwork submission → one prioritized AI correction → resubmission → checkpoint progression.
- Alternatives considered: video-course library; final-artwork-only critique; open tutoring chat.
- Why this choice: It directly matches the product promise and creates a measurable repeatable behavior.
- Consequences: Lesson content must be structured around observable checkpoints; AI output must be rubric-aware and stateful across correction versions.
- Revisit trigger: Beta users consistently avoid resubmission even when feedback usefulness is high.

## ADR-002 — 13+ audience with age bands only
- Status: Accepted
- Date: 2026-09-07
- Context: User wants age captured, but exact birth date is unnecessary for lesson personalization and increases privacy burden.
- Decision: MVP supports users aged 13+ and stores only an age band; under-13 users are out of MVP.
- Alternatives considered: exact DOB; no age information; all-ages product.
- Why this choice: Data minimization while preserving age-aware coaching language and reducing child-account complexity.
- Consequences: No under-13 onboarding path; release privacy/policy checks must still account for 13–17 users.
- Revisit trigger: A deliberate child/family product strategy is approved.

## ADR-003 — Four initial learning paths
- Status: Accepted
- Date: 2026-09-07
- Context: Supporting every medium/category would dilute lesson and critique quality.
- Decision: MVP starts with Landscape/Pencil, Landscape/Watercolor, Portrait/Pencil and Portrait/Watercolor.
- Alternatives considered: landscape only; unrestricted category/medium matrix.
- Why this choice: Small enough to curate, broad enough to validate whether the coaching engine generalizes across category and medium.
- Consequences: Onboarding only exposes supported combinations; new paths require catalog/content work, not ad-hoc free text.
- Revisit trigger: Core loop retention is validated and path demand can be measured.

## ADR-004 — Expo/React Native mobile architecture
- Status: Accepted
- Date: 2026-09-07
- Context: Product requires camera/library access and iOS/Android delivery from a small codebase.
- Decision: Use Expo SDK 57, React Native 0.86, React 19.2.3, TypeScript strict mode and Expo Router.
- Alternatives considered: native Swift/Kotlin; Flutter; web/PWA first.
- Why this choice: Strong fit for cross-platform mobile MVP and current Expo ecosystem support.
- Consequences: Use Expo-compatible package versions and EAS/store rules during release preparation.
- Revisit trigger: A required native capability cannot be delivered reliably through the Expo/React Native stack.

## ADR-005 — Supabase as auth/data/storage/backend platform
- Status: Accepted
- Date: 2026-09-07
- Context: MVP needs authentication, private relational progress data, private artwork storage and trusted server functions.
- Decision: Use Supabase Auth, Postgres, Storage, RLS and Edge Functions.
- Alternatives considered: Firebase; custom Node backend/Postgres; separate auth/storage providers.
- Why this choice: One coherent platform covers the MVP boundaries while keeping authorization explicit in Postgres/Storage policies.
- Consequences: RLS/grants/storage policies are release-critical; service/secret credentials remain server-side.
- Revisit trigger: Measured platform limits or operational requirements justify a migration.

## ADR-006 — OpenAI vision critique behind a server boundary
- Status: Accepted
- Date: 2026-09-07
- Context: The client must analyze learner artwork without exposing provider credentials or trusting arbitrary model output.
- Decision: Supabase Edge Function calls OpenAI Responses API with image input; initial evaluation target is configurable GPT-5.6 Terra. Output is schema-validated before persistence.
- Alternatives considered: direct client API call; another fixed provider SDK embedded in app; free-form model response.
- Why this choice: Keeps credentials private, provider choice replaceable and critique structure enforceable.
- Consequences: Real vertical-slice verification requires user-owned Supabase/OpenAI environment credentials and may incur API spend.
- Revisit trigger: Quality/cost/latency testing favors a different vision-capable model/provider.

## ADR-007 — One primary correction and a three-version cap
- Status: Accepted
- Date: 2026-09-07
- Context: Long critique lists overwhelm beginners, while unlimited correction loops can trap learners and create unbounded AI cost.
- Decision: Primary feedback contains one priority correction. A checkpoint allows at most three analyzed versions; unresolved work then completes as `needs_practice` and carries the weakness forward.
- Alternatives considered: unlimited retries; multi-issue critique; auto-pass after one critique.
- Why this choice: Balances pedagogy, user agency, latency and cost.
- Consequences: Progress logic must distinguish `accepted` and `needs_practice` terminal states.
- Revisit trigger: Beta data shows users need materially more/fewer correction cycles.

## ADR-008 — No general queue/worker in initial architecture
- Status: Accepted
- Date: 2026-09-07
- Context: AI analysis can be asynchronous from the user's perspective, but adding a queue service before measuring Edge Function behavior adds operational complexity.
- Decision: Persist analysis state and run analysis via Edge Function with idempotent retry. Do not add a separate queue/worker in the first vertical slice.
- Alternatives considered: dedicated worker queue from day one; synchronous UI-only request without persisted state.
- Why this choice: Simplest reversible architecture that still survives navigation/retry.
- Consequences: Function latency/runtime behavior must be measured in the first real vertical slice.
- Revisit trigger: Timeouts, concurrency or reliability measurements show the function boundary is insufficient.

## ADR-009 — Private-by-default product; no social or payments in MVP
- Status: Accepted
- Date: 2026-09-07
- Context: The product value hypothesis is coaching quality, not community or monetization.
- Decision: Artwork/history stay private. No public feed, comments, followers, marketplace or payment activation in MVP.
- Alternatives considered: social launch; subscription-first launch.
- Why this choice: Minimizes moderation/privacy/payment policy surface and keeps beta focused on the feedback loop.
- Consequences: Social/community Phase 5 is N/A; payment integration is deferred.
- Revisit trigger: Core value is validated and business/community requirements are explicitly approved.
