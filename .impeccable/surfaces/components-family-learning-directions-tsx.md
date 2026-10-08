---
version: 1
slug: "components-family-learning-directions-tsx"
primary_target: "components/family-learning-directions.tsx"
related_targets: ["app/family/page.tsx"]
---
# Family learning directions

Mode: Operate. Local extension to the existing Family workspace, not a new visual world.

THESIS: A parent's own hope becomes a transparent, optional planning direction only through their explicit choices.

OWN-WORLD: Inherit Studio, Plum & Porcelain, Lato, native labelled controls, existing Family section spacing and left navigation. No illustrations or decorative motion.

STORY: Read saved hopes; open one; choose now/later/paused and relevant opportunities; save; see the confirmed choices. Nothing is preselected. Clearing a link keeps the hope. Existing weeks stay fixed.

FIRST VIEWPORT: Family's existing child selection remains first. A compact directions list joins the languages section, with one expanded editor at most. Capability and enrichment choices disclose separately rather than dominating the whole page.

FORM: Optional learning-direction editor, parent-controlled, no keyword inference or provider calls. Follow explicit future owner choice on onboarding placement; the pending question is not an approval. Errors preserve controlled drafts; stale/uncertain saves offer comparison and explicit reload.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Finish evidence — 2 October 2026

The independent finish reviewer returned **ship for this bounded Family directions extension**, with no material fixes requested. This is not whole-product release approval or full accessibility acceptance. Documentation review inspected `components/family-learning-directions.tsx`, `app/family/directions/actions.ts`, `lib/learning-directions.ts`, the Family integration, shared CSS, font setup and Tailwind mappings against PRODUCT.md, DESIGN.md and the existing sidecar primitives.

The extension preserves Studio, Plum & Porcelain, Lato and the existing Family section container. A bordered list follows Languages; one hope opens at a time. The editor uses the shared native select and plum/ghost actions, with separate native disclosures for capability and enrichment choices. New links start without selections; existing links load their saved choices. Options use one column below the existing small breakpoint and two above it; actions wrap. The existing chevron indicates expansion, with reduced-motion suppression. No new palette, typography role, global component contract or visual world was introduced, so DESIGN.md and `.impeccable/design.json` were preserved.

Inspected QA captures: `.impeccable/review/directions-stale-desktop.jpg`, `directions-stale-desktop-detail.jpg`, `directions-current-602.jpg` and `directions-current-602-detail.jpg`. The desktop stale state visibly retains the Paused draft, disables further mutation, and offers comparison in a new tab or explicit draft discard/reload. The 602px browser capture shows the For now editor with Music selected, separate disclosures and the inherited phone header; the detail captures show visible focus outlines. These screenshots are QA evidence, not shipping raster assets. No shipping raster was added.

The implementation handoff reports hosted migration `202610020017_family_learning_directions.sql` applied through the open MIRA dashboard and its installation verified read-only. Disposable synthetic-family browser checks passed for For later with no opportunities, For now with Music, Paused, save/reload, stale overwrite rejection with retained draft, explicit discard/reload, and planning-link removal followed by a fresh reload; both original hopes remained. A read-only preservation guard confirmed every existing plan and activity row in that disposable family stayed exactly unchanged. The handoff also reports all 34 app tests, the full local SQL suite through migration 017, scoped ESLint and the production build passing. The build retains its existing `metadataBase` warning. These execution results come from the implementation handoff; this documentation pass inspected code and captures and did not rerun mutations or tests.

Unverified here: 390px reflow, text enlargement, complete keyboard/screen-reader behavior, forced colors and full accessibility acceptance. Screenshot appearance does not establish database behavior; the separately reported browser and SQL checks provide the bounded persistence evidence above. Initial-setup placement remains an open owner choice. Existing weeks, content approval and broader pilot readiness are outside this extension's finish verdict.

Preexisting drift remains recorded without repair: PRODUCT.md still calls the exact age boundary unresolved despite the decision register's later birth-until-seventh-birthday choice; inherited Family eyebrows and older composition remain; prior project evidence reports unset Impeccable buildPath configuration. None is a new visual-system decision or part of this surface's authorized documentation change.
