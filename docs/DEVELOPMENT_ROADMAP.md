# Development roadmap

This roadmap is subordinate to `MIRA_PRODUCT_SPEC.md` and should be updated whenever product learning changes the implementation sequence.

## Now: Milestone 13 — Product foundation realignment

Goal: make the data model and primary experience capable of representing the actual product before any generative feature ships.

Progress: the canonical taxonomy, rich activity primitive, hazard and claim registries, constitution schema, opportunity portfolio, Parent Mode, eligibility-aware idea shelf, and redesigned Today/Week/navigation are implemented in migration 13. The remaining deterministic pass is to expose constitution and household constraints in the profile, add planner evaluation fixtures, and complete the seed coverage audit before starting the AI layer.

Deliverables:

- canonical nine-capability and enrichment-track schema;
- reviewed activity primitive schema with friction, adaptations, autonomy, safety, provenance, and versioning;
- small claim registry and hazard taxonomy;
- Family Education Constitution data model;
- typed opportunity portfolio replacing the seven-lessons pattern;
- Today and Week experience redesigned around low pressure, effort, and open time;
- navigation realigned to Today, Week, future Ask, Journey, and Family;
- deterministic eligibility, rolling exposure, overload protection, and auditable selection reasons;
- seed coverage audit for the initial 0-3 age bands.

Exit criteria:

- no child-facing recommendation can bypass deterministic age, hazard, time, or material checks;
- a week can contain embedded, intentional, open, and language opportunities without requiring seven prepared activities;
- the UI never shows missed or overdue work;
- every selected opportunity explains its fit;
- the source taxonomy is represented without child scores.

## Next: Milestone 14 — Nebius extraction layer

Goal: introduce AI only for jobs that are genuinely linguistic and remain easy for the parent to inspect and correct.

Progress: the server-only Nebius adapter, schema validation, typed observation proposal, parent confirmation flow, privacy-minimized logging, timeouts, retry boundary, daily budgets, and deterministic observation fallback are implemented in migration 14. Free-text onboarding extraction remains before this milestone is complete.

Deliverables:

- one server-only AI service and replaceable provider adapter;
- validated structured outputs;
- free-text onboarding extraction;
- parent-note observation extraction;
- proposal/confirmation UX;
- token, latency, feature, and estimated-cost logging;
- per-feature budgets, timeouts, retries, caching, and deterministic fallback;
- privacy-minimized request construction.

Exit criteria:

- the model has no database credentials or direct mutation ability;
- malformed or unsafe output cannot be persisted;
- every extracted claim is visibly editable before acceptance;
- ordinary button-only feedback performs zero AI calls;
- the app remains usable when the AI provider is unavailable.

## Then: Milestone 15 — Hybrid planner, Parent Mode, and Ask

Goal: combine deterministic safety and eligibility with bounded AI judgement and useful parent education.

Progress: a first read-only, context-minimized Ask surface is available. It cannot mutate plans or profiles; candidate selection, plan validation, personalization, and change confirmation remain future work.

Deliverables:

- candidate-ranking service;
- AI portfolio selection from valid IDs only;
- post-generation safety and claim validation;
- plan audit records;
- bounded activity personalization;
- layered Parent Mode explanations;
- context-aware Ask experience;
- explicit parent confirmation before Ask changes a plan or profile.

## After the first family uses it

- expand from approximately 20 strong primitives toward 50-80 reviewed activities;
- add weekly and monthly reflection only after feedback quality is proven;
- add voice feedback after typed note extraction is useful;
- add richer language packs and audio with provenance;
- involve early-childhood, multilingual, safety, privacy, and clinical advisers before broader release;
- build the permanent planner and safety evaluation suite from real failure cases.

Do not prioritize marketplaces, child accounts, gamification, performance scores, native apps, autonomous agent networks, fine-tuning, or thousands of generated activities before the central parent-planning loop is validated.
