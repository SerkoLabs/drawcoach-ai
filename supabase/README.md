# Supabase backend

This directory is the version-controlled home for DrawCoach database migrations, RLS/grants, Storage policies, Edge Functions and deterministic local seed data.

Rules:
- Do not commit project refs, access tokens, service-role keys or OpenAI keys.
- Database changes land as reviewed migrations after `docs/DATABASE.md`.
- Client-exposed objects use explicit grants + RLS.
- `service_role` and `OPENAI_API_KEY` stay in trusted server/Edge Function environments only.
- The private artwork bucket will be created by migration; it is not public content.

Remote linking/provisioning is intentionally deferred until a development Supabase project is supplied or approved.
