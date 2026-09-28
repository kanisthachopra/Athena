# MIRA product roadmap

## Product promise

MIRA helps a family notice how a young child learns, choose thoughtful experiences, and build a coherent learning journey from ordinary life. It is not a worksheet generator, a developmental assessor, or a chatbot wrapped around an activity list.

Every recommendation should be:

- safe and age-bounded;
- useful with normal household time and materials;
- explainable to a caregiver;
- adjustable without penalty;
- informed by family observations without turning them into grades;
- backed by reviewed content before it reaches a child.

## Milestone 13 — Learning Compass and deterministic planner v2

Status: implemented; database migration pending.

- Combine completed-activity feedback and spontaneous learning moments in one 90-day compass.
- Show interest signals, challenge fit, and a practical next move for each learning area.
- Protect breadth: cover distinct learning areas before repeating a strong interest.
- Avoid repetition using recent template history.
- Explain why every planned activity was selected.
- Keep all language observational—never claim diagnosis, mastery, or developmental delay.

## Milestone 14 — Parent toolkit and experience refinement

This is the final major deterministic milestone before AI generation.

### Rich activity standard

Each reviewed activity should gain:

- a short preparation checklist;
- clear step-by-step flow;
- “make it easier” and “extend it” variations;
- setting, energy, time, and material tags;
- stopping cues and safety boundaries;
- learning threads and observable signals;
- content provenance, review status, and version history.

### Parent resources

- Reusable guides for observation, responsive language, open-ended play, and adapting an activity.
- Print-friendly activity and weekly-plan views.
- Material substitutions and “use what you have” suggestions.
- Search and filters based on real constraints: time, setting, energy, materials, and learning area.

### Experience quality

- Rework Today into a useful family dashboard with today, next, recent learning, and one-tap journal access.
- Improve navigation state, loading states, empty states, keyboard focus, and mobile tap targets.
- Add a content-quality checklist and coverage audit for the reviewed library.
- Preserve the calm visual language while improving hierarchy and reducing repeated UI.

## Milestone 15 — Bounded AI studio

AI begins only after the content structure and deterministic safety rails above exist.

### First AI jobs

1. Draft an activity variation around a reviewed template.
2. Turn a caregiver observation into a warm, concise reflection.
3. Draft a parent resource or material substitution list.
4. Suggest candidate activity-library entries for human review.

AI will not diagnose a child, score development, directly publish activities, or silently alter a weekly plan.

### Architecture

- Provider adapter so Nebius is replaceable and model choice is configuration, not application logic.
- Server-only credentials and calls.
- Strict structured output validated before storage or display.
- Generated-content table with prompt version, model, cost metadata, source template, and review state.
- Input minimization: send only the facts needed for the job, not full family histories.
- Rate limits, per-family budgets, caching, retry limits, and a deterministic fallback.
- Human approval for reusable child-facing content.

### Initial credit strategy

Use the available Nebius credits for offline content development and controlled caregiver-requested drafts—not for generating every page view. Cache accepted results and measure cost per useful artifact before expanding the feature set.

## Quality gates before broader release

- RLS and role checks for every new table and mutation.
- Family data export and deletion cover new stored content.
- Automated tests for planner invariants and structured AI output.
- Mobile, keyboard, reduced-motion, and screen-reader checks.
- A reviewed starter library with enough breadth for every supported age band.
- Clear product copy distinguishing observations, recommendations, and professional advice.
