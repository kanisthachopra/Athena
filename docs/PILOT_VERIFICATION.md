# Disposable-account verification

Status: owner-only persistence and anonymous denial passed live; new synthetic Week move/undo/concurrency checks passed live. The two-account run is blocked by the second account's invalid credentials. Never use the owner's existing family or plans.

## Account preparation

Create two separate, confirmed disposable Supabase Auth users in the same project. They must not belong to an existing real family. Save these four values in the Git-ignored `.env.test.local` at the repository root; do not paste passwords into chat or commit this file:

```dotenv
MIRA_TEST_OWNER_EMAIL=disposable-owner-address
MIRA_TEST_OWNER_PASSWORD=disposable-owner-password
MIRA_TEST_OTHER_EMAIL=disposable-other-address
MIRA_TEST_OTHER_PASSWORD=disposable-other-password
```

The normal public Supabase URL/key remain in `.env.local`. This harness uses no service-role key, browser session, AI call or email send. Provisioning test users is a separate owner action; it does not require changing production confirmation settings.

## Execution and effects

`npm run test:pilot` is a dry run. To intentionally create synthetic records in those two designated accounts:

```text
npm run test:pilot -- --live --write-test-records
```

The script creates a synthetic family and child only for a user without a membership. It refuses to write observations in an existing family unless its exact name matches `MIRA disposable pilot test 0` or `MIRA disposable pilot test 1` and its account is an owner with exactly one active child. Existing family plans are never created, moved or deleted.

Both sign-ins are now checked before the two-account run creates new records. `--owner-only` explicitly skips cross-family checks and prints that reduced scope; it must not be presented as a tenancy pass. `node scripts/check-pilot-config.mjs` performs local parsing diagnostics and prints only field names and Boolean flags, never credentials or their lengths.

Checks: authenticated owner save/reload of multilingual original journal text; second-family child/observation reads denied; cross-family observation write denied; anonymous observation read denied. Network waits are bounded. SDK credentials/private rows are not printed. Test records are retained for inspection; repeated runs add an explicitly synthetic observation. Partial setup can remain after a failed run; no automatic cleanup or retry is performed.

## Isolated Week fixture

```text
npm run test:pilot:week -- --live --write-test-records
```

Requires the already created disposable owner family. Creates a new test-labelled plan in an unused future week and three synthetic open-space records with no activity template or recommendation. It never reuses an existing plan. Tests empty-day move, reload, undo, swap, rejected recorded/out-of-week destinations, stale-save rejection and concurrent one-winner semantics using the real guarded RPC. Restores successful moves, retaining all fixtures and one deliberately skipped item for inspection. Each run creates a new fixture; no cleanup occurs. This proves scheduling mechanics, not content eligibility or UI behavior.

## Still separate

These harnesses do not prove viewer permissions, cross-linked-child consistency, invite handling, concurrent AI spending, deletion/export completeness, browser save behavior or content safety. Cross-family checks remain blocked until both accounts authenticate. Add isolated fixtures and test these before a release claim. Do not repurpose a real family for those tests.

## Anonymous and internal API access

`npm run test:pilot:access -- --live` verifies fourteen scoped anonymous private-table reads and denied execution of seven internal helpers, as both anonymous and the disposable owner. Internal RPC probes use nonexistent UUIDs, never existing family/plan IDs. Body-level validation, FK failures, unavailable functions and network errors do not count as verified execute-privilege denial. Empty-table read results do not establish complete RLS coverage.

Initial live run found anonymous execution of six internal helpers. Apply `202610010002_restrict_internal_rpc_access.sql`, then rerun this harness and the public owner workflows. The migration changes only named function permissions and verifies effective privileges transactionally. No data backfill or deletion occurs. If it reports an inherited privilege or missing signature, stop and inspect that deployment rather than removing the verification guard.

Result after owner-reported application: all seven helpers returned explicit privilege denial for owner and anonymous clients. `npm run test:pilot:planner -- --live --write-test-records` then passed public plan generation, reload and duplicate-free retry in the disposable family. That command refuses pre-existing current-week plans and therefore is not automatically repeatable in the same week; it deliberately retains the generated test fixture. No clinical/content approval is implied by this plumbing test.
