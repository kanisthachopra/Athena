---
version: 1
slug: "app-memory-page-tsx"
primary_target: "app/memory/page.tsx"
related_targets: ["components/family-understanding.tsx", "lib/family-understanding.ts", "components/family-language-contexts.tsx"]
---
# What MIRA understands

Mode: Read with correction links. Extend the approved Spatial Workspace overview; no new visual world.

THESIS: A parent distinguishes saved choices, planning rules and observations, then reaches the correct editing control.

OWN-WORLD: Studio, Plum & Porcelain, Lato, left navigation, existing two-column summary and native disclosures. No illustration, decorative motion, score or inferred label.

STORY: Read capacity and original hopes; see now/later/paused links; open reported language people/routines; inspect actual planner use; correct source fields. Journal and AI boundaries stay separate.

FIRST VIEWPORT: Existing heading and child context lead into saved preferences and hopes/directions, not metrics. Longer language environments disclose below; actions belong to their sections.

FORM: One authorized read-only snapshot; never merge failures with defaults. No new parent data, provider transfer, persisted summary or automatic plan change. Existing checked editing destinations stay authoritative. Owner confirmed separate saved-choice/planning/observation sections on 2 October 2026.

FINISH: Completed bounded extension, documented 2 October 2026. The independent finish reviewer reported ship, with persistence, fidelity and verification-ceiling checks passing and no material fixes. This is a Memory-surface disposition, not whole-product readiness or full accessibility certification. The existing DESIGN.md remains the visual authority; no global design rewrite or shipping raster is part of this extension.

## Implemented surface

The opening identifies the active child and offers child-detail review and a jump to planning use. Saved family preferences and original hopes occupy the existing two-column spatial board, becoming one column at the established compact-workspace breakpoint. The implementation reuses the pale plum surfaces, quiet headings, section dividers, text actions and native disclosures from Studio. No palette, typography, illustration or decorative-motion direction was added.

Saved choices, planner behavior and observations remain distinct:

- Preferences show weekday/weekend capacity, screen policy, rhythm and everyday-learning preference only when configured. An unsaved profile explicitly says that capacity and screen preference have not been assumed.
- Original hopes retain their wording, current planning link or absence of one, and saved timestamps. Corrections lead to the existing Family directions section.
- Languages disclose reported role, timing, variety, oral/literacy goals, people and everyday moments. Unknown support and explicitly having no person identified are different states. Caregiver profiles are separately disclosed and explicitly do not grant application access. The existing Family language editor is the correction destination at `#family-languages`.
- Planning-use copy explains eligibility, variety before current-direction matching, and the narrow same-version repetition signal. It identifies saved preferences that do not yet affect the planner and says that changed preferences do not rewrite a saved week.
- Original observations remain in Insights, with a correction/review link. Missing notes do not imply that an experience did not occur; everyday notes are not described as ranking inputs. AI-memory and full family-learning-agreement gaps remain visible in optional detail.

Correction links return to the existing source editors: child details, learning preferences, Family directions/languages, activity context, Settings and Insights. Viewer wording changes from correction to review and states that access is read-only. Multiple caregiver profiles include the existing editor limitation: learning preferences edits only the first shown profile. This page introduces no new edit form.

## Data and failure boundaries

Direct code inspection found one `get_family_understanding` read after required family context, with active child and family IDs passed into snapshot parsing. The parser rejects malformed or inconsistent snapshots, including mismatched family/child identity, missing or inconsistent timestamps, disagreement between profile and hope/language lists, and unresolved linked caregiver IDs. Invalid or failed reads render a distinct unavailable summary with Reload and Open Family controls; they are not spliced into defaults.

Saved timestamps use the chosen family time zone, with UTC explicitly identified when no family time zone is chosen. The surface renders saved values and deterministic explanations without a model call, persisted generated summary, new inferred conclusion or automatic plan change. Unknown goals, support, contexts and preferences stay unknown. This extension does not implement the complete Family Education Constitution or a separate correctable AI-memory system.

## Evidence and limits

The fresh documenter directly inspected `app/memory/page.tsx`, `components/family-understanding.tsx`, `lib/family-understanding.ts`, the existing `components/family-language-contexts.tsx` correction anchor, and the relevant shared board/section CSS. Existing PRODUCT.md, DESIGN.md and `.impeccable/design.json` were read and preserved.

Both supplied QA captures were viewed: `.impeccable/review/memory-desktop.jpg` from the reported 1280px viewport and `.impeccable/review/memory-602.jpg` from the reported 602px viewport. They show the same disposable synthetic family, the desktop rail versus compact menu header, two-column versus stacked saved summaries, expanded language detail, planning explanations and a separate observations section. The captures are QA evidence only, not shipping raster assets or actual family data. They do not establish behavior at 390px, keyboard interaction, contrast compliance or complete accessibility acceptance.

The implementation agent reports passing all 35 application test files, the full SQL suite through migration 018, TypeScript, scoped lint and the production build. The build retained the existing `metadataBase` warning. The agent also reports migration 018's read-only projection applied, hosted read-only disposable-owner overview equivalence checks passing, and anonymous/missing-child denial checks passing. No family data was changed. These execution results were supplied by the implementation agent; this documentation pass did not rerun tests, database checks or browser interactions.

The independent fresh finish reviewer disposition was reported as ship for this bounded extension, with persistence/fidelity/verification-ceiling checks passing and no material fixes. Neither that disposition nor the supplied tests establishes educational efficacy, full constitutional coverage, a 390px review or whole-app release readiness. Canonical implementation evidence and unresolved work remain in `docs/PROJECT_STATUS.md` and owner decisions in `docs/DECISIONS_AND_OPEN_QUESTIONS.md`.

## Preserved context and drift

Impeccable context had already run in this session. The implementation agent reports preexisting wording/composition/configuration drift, but the exact diagnostic text is not retained; no specific drift finding is invented here. Global product/design files and configuration were preserved. This surface-only documentation update does not refresh their tokens, narrative or sidecar and does not authorize another visual direction.
