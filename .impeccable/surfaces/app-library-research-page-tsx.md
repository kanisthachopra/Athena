---
version: 1
slug: "app-library-research-page-tsx"
primary_target: "app/library/research/page.tsx"
related_targets: ["components/activity-review-collection.tsx"]
---

# Complete activity review handoff

Mode: Read, with a bounded download task. Audience: signed-in family owner inspecting development work and preparing an independent editorial handoff. Owner confirmed keeping each activity's review materials together on 2 October 2026.

## Direction contract

THESIS: Make the actual complete drafts findable, distinct from early AI snippets. Expand one named activity to get its worksheet, exact source package and blank response; no approval or scheduling controls.

OWN-WORLD: Inherit Studio / Plum & Porcelain / Lato, existing left navigation, bordered disclosure rows and labelled controls. No illustrations, cards within cards or new top-level navigation.

STORY: Read the unpublished boundary, choose a draft, inspect its proposed age and source trail, then download matched files for independent review. Neither downloading nor a family-owner role authorizes publication.

FIRST VIEWPORT: Existing Research heading and notice remain. Add a direct jump to complete drafts; put that compact owner-only collection before primitive research, with titles leading and proposed ages subordinate. Phone downloads wrap naturally and rows stay readable.

FORM: A local extension of the owner-approved Research reading surface; owner-pinned, no new seed or concept tournament. Reuse native disclosures and their existing finite chevron motion, with reduced-motion support.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

No content changes, AI calls, publication, migrations or family writes. Exact-version validation must fail closed. Completed reviewer records remain private and are never imported by this UI.

## Documentation verification — 2 October 2026

Disposition: ship this bounded interface extension. Compared `app/library/research/page.tsx` and `components/activity-review-collection.tsx` with `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, and the shared theme, controls, Research disclosures and reduced-motion rules in `app/globals.css`. Inspected supplied captures `research-desktop.png`, `research-user-602.png`, and `research-mobile.png` in `.impeccable/review/`; their visible titles, labels and layout agree with the inspected implementation.

The seven-draft collection extends the existing Studio reading surface: bordered native disclosures, subordinate proposed-age text, shared plum/ghost download actions, and phone-stacked title metadata. It introduces no durable palette, typography, motion or component-system change, so global design documentation and its sidecar remain preserved. No shipping raster asset was added. This verification covers visual-system consistency; it does not establish export authorization, source appraisal or content approval.

Rechecked the failure-state recovery correction: Reload now submits a native GET form using the existing ghost button treatment. This changes recovery behavior without changing the successful collection composition or the global design system.
