# G0 repository alignment audit — 1 October 2026

This is a read-only repository assessment against the complete owner-adopted v1.1 source, not certification of the deployed database. Existing dirty work was inventoried and preserved. No missing companion document has been reconstructed as historical evidence.

## Inspected evidence

- Canonical source in full; status and decision registers; package scripts and migration inventory.
- Auth/onboarding actions, family context loader, shared-caregiving role wrappers and the initial family transaction.
- Latest portfolio SQL in migration 013, activity feedback actions, Week helper tests and migration 015 (filename 202610010001).
- Insights form/actions/extractor and learning-moment schema; Guide/profile provider boundaries; AI-run schema.
- Family export handler, Settings, source/primitive compiler and prior scoped tests.
- No PostgreSQL CLI, Docker runtime or Supabase management connector found. Deployed grants/RLS/migrations and real negative-access tests remain unverified. No credentials or private row contents were collected.

## Alignment and release blockers

| Source area | Repository evidence | Gap / next action |
| --- | --- | --- |
| G1 auth and tenancy | Supabase auth, RLS and role-aware RPC wrappers exist. Membership RLS allows reading the family's membership rows. | Context loader takes first row without filtering user_id, so UI role may be another member's; query errors can redirect to onboarding. Bind to authenticated user and fail visibly. Actual API negative tests still required. |
| G2 experience loop | Today/Week/preparation/feedback exist; pure Week tests exist. | Existing-plan mutation tests forbidden by owner; need disposable accounts/records. Feedback remains required engagement/challenge rather than all optional states. |
| G3 original observations | AI proposal accepts a rewritten note; save persists that note alone. Going back remounts an uncontrolled empty textarea. | Parent wording can be lost and AI is mandatory for entry. Keep a controlled original note, save it directly, and limit optional AI to editable title/area suggestions. No inference record is invented. |
| G4 eligible content | Migration 013 selects reviewed=true AND review_status != retired. Seed templates are internal_prototype. | Boolean reviewed is not expert-reviewed content. Pilot needs reviewed releases, applicability/material constraints and immutable snapshots. Do not relabel drafts or alter existing plans. |
| G4 planning fit | Portfolio uses max(weekday, weekend) capacity and month/year mapped to first-of-month. | Can exceed a particular day's budget; exact age precision is overstated. Timezone, conservative age eligibility, unknown resources and actual language opportunity require further work. |
| G3/5 AI boundaries | Server-side Nebius, shape checks, parent proposals, metadata logs exist. | Guide/observation budget read failures currently allow calls; counts are not concurrency-safe reservations. Consent/retention and reviewed concern routing remain open. |
| Privacy operations | Child export and individual learning-moment deletion exist. | Export ignores query failures and can label partial data a full export. No verified full deletion/retention policy or derived-state cleanup. |
| Research/content | Six-source initial map and rejected model batch are explicit. | Not exhaustive full-source appraisal or usable reviewed activities. Need reviewed publication workflow, rights and safety review; AI cannot approve itself. |
| G5 first-family readiness | Source requires reviewed content, operational privacy/security, failure paths, access tests, owner acceptance. | NOT READY. No private-pilot readiness claim follows from build/SSR tests. |

## Scoped next implementation

The next change fixes evidence-preserving direct journal entry, authenticated-user role selection, failed-export handling and fail-closed budget reads. These are repairs within existing features and source sections 5.5, 7.4, 12.4–12.5, 13 and 18.6. No schema/provider/dependency change, live plan mutation, content approval or deployment is authorized by this audit.

The original parent note is the journal's existing note field; optional AI supplies only title/domain metadata. This avoids persisting an AI rewrite as a fact without adding a shadow schema. A complete extracted-observation/inference/version architecture remains future work.

## External decisions/evidence requested

First cohort age boundary and real language coverage; designated disposable test accounts; content/safety/concern reviewers; provider data settings and retention/deletion policy; deployment origin and owner pilot acceptance. These remain open, not inferred from examples.
