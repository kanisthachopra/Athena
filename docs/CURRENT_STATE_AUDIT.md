# Current implementation audit

Audit date: 2026-09-29

Source of truth: `docs/MIRA_PRODUCT_SPEC.md`, distilled from the complete MIRA idea log.

## Executive finding

The current app is a sound technical prototype of authentication, privacy, persistence, weekly scheduling, and feedback. It is not yet the product described in the idea log. Its centre of gravity drifted toward a seven-day activity planner and searchable library, while the intended product is a parent-development copilot built around a family constitution, opportunity portfolios, rich activity primitives, cautious memory, multilingual environments, parent education, and safety/evidence infrastructure.

The right response is not to discard the secure foundation. It is to stop adding peripheral planner features and realign the data model and daily experience before introducing generative activity content.

## Keep

These capabilities directly support the source vision:

- Supabase Auth, server-side sessions, and Row Level Security.
- Family and child ownership boundaries.
- Age-aware reviewed activity templates.
- Today, Week, activity detail, and quick feedback surfaces.
- Penalty-free skipping and caregiver-controlled replacement.
- Everyday learning notes.
- Editable observations and profile data.
- Data export, archiving, and privacy controls.
- Stored recommendation reasons.
- Responsive web delivery.

Shared caregiving and multiple-child infrastructure are reasonable future capabilities. They are beyond the V0.1 scope, so they should receive no additional investment and should not complicate the core first-user experience.

## Rework urgently

### 1. Developmental model

Current activity categories (`language`, `movement`, `sensory`, `maths`, and similar) combine capabilities, subjects, and activity formats. They cannot serve as the learning model.

Replace them as the planner's conceptual foundation with:

- nine core human capabilities;
- separate enrichment tracks;
- activity-to-capability and activity-to-track mappings;
- rolling exposure records describing what the environment offered rather than child performance.

### 2. Plan shape

The database currently creates exactly seven dated activity instances. This conflicts with the intended small, flexible portfolio.

Plans need typed opportunities:

- embedded;
- intentional;
- open;
- language/context;
- optional longer family experience.

A week should usually contain only a few prepared activities, protect open time, use the parent's time as a ceiling, and never imply daily completion.

### 3. Onboarding

Current setup captures only rhythm, screen policy, basic aspirations, caregiver name, and language lists. It lacks the central Family Education Constitution and most decision-making context.

Add quick/detailed progressive onboarding covering values, priorities, caregiver ecology, resources, budget, environment, autonomy/refusal/help philosophy, negative preferences, parent explanation depth, optional considerations, and explicit user confirmation of AI extraction.

### 4. Activity objects

Current templates contain useful prose but remain too thin for safe personalization or sophisticated selection.

Add multi-capability mappings, tracks, experience type, friction metadata, parent mode, support ladder, child agency, difficulty adaptations, stop signals, observation prompts, hazards, source claims, review/version data, and substitutions.

### 5. Feedback and memory

Current feedback captures engagement, three challenge values, repetition, and a note. Expand it to the source model, including help, independent attempt, child redirection, and quick context chips.

Introduce traceable, expiring interest/inference records only after note extraction exists. Never infer permanent traits.

### 6. Multilingualism

Current language goals are strings. Build caregiver-language profiles, language roles, oral versus literacy goals, sustainable contexts, and caregiver-matched opportunities before claiming multilingual planning.

### 7. Safety and evidence

Current safety is one prose field on an activity. Before generative personalization, add deterministic hazard checks, claim provenance, content review/versioning, concern handling, and plan audit records.

### 8. Parent learning and Ask

Parent Mode and contextual mini-lessons are product differentiators but do not exist. “Ask” should become a primary navigation destination after a safe contextual AI service exists.

## De-emphasize or remove from the primary experience

- **Primary Library tab:** the source explicitly warns that a large library transfers the choice burden back to the parent. Keep discovery only for replacements and later contextual exploration.
- **Saved-activity feature:** technically harmless, but currently reinforces the library as a centre of gravity. Hide it from the primary loop until the activity/resource model is mature.
- **Manual “Plan next week” as the main planning interaction:** plans should eventually be prepared automatically and made lighter, richer, or context-aware by the parent.
- **Exactly one activity per day:** replace with opportunity portfolios and open days.
- **Domain-strength summaries:** show observations, current interests, environmental exposure, and confidence—not a “strongest domain.”

## Provisional Milestone 13 decision

The unapplied Learning Compass migration and UI were reverted. They correctly used time decay and avoided diagnostic language, but incorrectly treated activity categories as developmental domains and reinforced a seven-activity weekly quota. No Supabase rollback is necessary because the migration was never run.

## Corrected implementation sequence

### Milestone 13 — Product foundation realignment

1. Add the canonical capability and enrichment-track taxonomy.
2. Upgrade activity templates into reviewed, versioned activity primitives.
3. Add friction, experience type, parent guidance, autonomy, adaptation, hazard, and provenance fields.
4. Add the first claim registry and deterministic hazard rules.
5. Add Family Education Constitution/profile structures.
6. Replace the exact seven-item generator with a small typed opportunity portfolio and rolling-balance calculations.
7. Rework Today/Week around effort, opportunity type, open time, and one observation prompt.
8. Remove Library from primary navigation and reserve it for contextual replacement/discovery.

This is the final large deterministic foundation milestone.

### Milestone 14 — First bounded AI with Nebius

1. Add a server-only provider adapter, strict schemas, feature budgets, request logs, and deterministic fallbacks.
2. Extract free-text onboarding aspirations into a reviewable structured proposal.
3. Extract optional parent notes into cautious structured observations.
4. Never write model output directly to the database.
5. Show “Here is what I heard” and require user confirmation.

These are the first AI jobs because they create value without giving the model control of safety or planning.

### Milestone 15 — Hybrid portfolio planning and parent copilot

1. Deterministically filter and rank eligible activity primitives.
2. Let AI select or explain a portfolio only from validated candidate IDs.
3. Validate, safety-check, claim-check, and audit before storage.
4. Add bounded personalization and Parent Mode.
5. Add Ask with structured context and explicit proposal/confirmation for mutations.

## Acceptance test for the real product

A tired parent with ten minutes should be able to open MIRA and understand one or two useful opportunities, why they fit, what effort they require, when to stop, and what might be worth noticing. The app should be equally capable of saying “nothing needs planning today.” After the parent records what happened, MIRA should adapt cautiously, show its reasoning, and make the parent more capable—not more dependent or guilty.

