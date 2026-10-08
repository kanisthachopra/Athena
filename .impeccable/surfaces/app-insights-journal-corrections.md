---
version: 1
slug: "app-insights-journal-corrections"
primary_target: "components/journal-moment-controls.tsx"
related_targets: ["components/journal-notice.tsx", "app/insights/page.tsx"]
---

# Everyday note corrections

Mode: Operate. A caregiver corrects their own reported words or removes a saved note. Owner approved the bounded workflow on 2 October 2026.

THESIS: Keep the saved words readable; open a local editor only when needed. Preserve the draft after uncertainty and require comparison with current saved state before another attempt.

OWN-WORLD: Preserve Studio, Plum & Porcelain, Lato, left rail and shared input/button/disclosure styles. No illustrations, new navigation, dashboard redesign or ornamental animation.

STORY: Read → edit the prefilled words → save → confirmed state. Removal has its own explicit disclosure naming the saved note, irreversible active-journal boundary and backup/provider limitation. Stale edits never overwrite newer records.

FIRST VIEWPORT: Existing Insights composition stays; note content leads its row and controls follow beneath. Labels and fields stack on phones. Long multilingual words wrap; original whitespace remains visible.

FORM: Bounded extension of the existing journal. Native disclosure and shared reduced-motion behavior. No AI transfers, new memories or changes to plans.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Verification note — 2 October 2026: inspected the correction controls, shared notice provider, everyday-note row, shared styles, and synthetic full-page captures `.impeccable/review/journal-stale-desktop.jpg` (1280px viewport) and `.impeccable/review/journal-remove-602.jpg` (602px viewport). The extension retains Studio/Plum/Lato and the existing Insights composition, using shared fields, buttons and native disclosures; no shipping raster or new system token was introduced. The finish handoff reports an initial fix followed by ship: stale note/title fields are read-only and focusable while save, removal, date and area controls are disabled. The implementation agent verified keyboard selection of the retained draft; clipboard transfer was not tested. The removal disclosure visibly names the saved note and states the active-journal, undo and backup/provider limits. These captures do not establish 390px reflow, screen-reader or forced-colors acceptance, database behavior, or whole-product readiness. Existing DESIGN.md and its sidecar remain the global visual authority and were preserved.
