# Athena reset alignment — initial read-only pass

Inspected 7 October 2026: package.json, installed Next.js package version, family-context, AI preferences, Nebius adapter, guide grounding, library candidates, Today route, and scoped speech-symbol search. No credentials, private rows or live schema queried. This is an initial code comparison, not a full G0 completion.

| Area | Evidence | Direction/gap |
| --- | --- | --- |
| Stack | Next.js 16.3.6 installed; React/Supabase/Tailwind declared | Preserve stack and locked dependencies. |
| Family access | family-context binds membership to authenticated user | Reuse patterns; test new operations and hosted roles separately. |
| Catalog | library-candidates requires expert_reviewed activity snapshots | New resource contract needed; do not simply relax old activity gates. |
| Planner UI | Today queries activity_instances | New resource path and town UI needed. |
| Guide | activity/claim IDs enforced | Keep validation discipline; replace activity-only interface. |
| AI | Nebius completion wrapper and versioned permissions | Live model unknown; new features need evaluated adapter/consent coverage. |
| Voice | No matching recorder/transcription symbols in app/components/lib | Implement and test real speech integration. |
| Existing data | Historical status records applied migrations through 018 | Do not reapply or reinterpret as newly inspected live evidence. |

Next audit work: exact schema/entity mapping, onboarding/account transition, memory/retention operations, remaining route/dependency inventory and provider settings without secret exposure. No application tests run in this planning pass. No implementation claims for Athena follow.

## 8 October bounded resource/voice follow-through

Inspected installed route-handler docs, Supabase proxy/server client, memberships, family AI preferences/permission checks, Nebius structured-completion adapter, Guide reservation SQL/adapter, existing Tavily endpoint and prototype. Existing activity contracts remain intact. New resource endpoints reuse membership/Guide controls with extra per-request provider consent; the obsolete staged discovery endpoint remains disabled by default. Hosted disposable-family execution verified the existing reservation/settings RPCs work for this slice; it did not certify all schema or family roles.

New public resource contract is separate from reviewed activity records. No migration or plan writes. Exact resource-plan/reflection entity mapping, onboarding/account transition, provider retention beyond stated Deepgram opt-out, broader hosted access/privacy operations and full production route inventory remain open. This bounded implementation is authorized by ATHENA-RESOURCE-FUNCTIONALITY-2026-10-08, not a claim that the entire reset audit is complete.
