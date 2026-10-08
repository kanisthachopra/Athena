---
version: 1
slug: "components-learning-profile-form-tsx"
primary_target: "components/learning-profile-form.tsx"
related_targets: ["app/setup/page.tsx"]
---

# Learning-profile save recovery

Mode: Operate. Existing setup, not a new onboarding concept or visual redesign.

## Direction contract

THESIS: One coherent saved profile; a draft from an older tab never silently replaces newer family choices. Keep original entries available to compare and copy.

OWN-WORLD: Preserve approved Studio, Plum & Porcelain, Lato, shared inputs/actions and current setup grouping. No illustrations or decorative motion.

STORY: Load saved choices together, edit, save, see a confirmed result. On a conflict or uncertain response, inspect the saved profile in a new tab before explicitly discarding/reloading. A saved profile with an unconfirmed first week links to Week instead of resaving blindly.

FIRST VIEWPORT: Existing setup remains. Recovery sits at the end of the form beside the save outcome; fields stay readable and text remains keyboard-selectable while blocked.

FORM: Narrow reliability extension of the approved setup. No concept tournament, new data fields, provider changes or automatic plan replacement.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Scoped verification — 2 October 2026

The finish review's disposition is **ship for the bounded save-recovery change**. This is not a whole-application craft, accessibility or release certification. Documentation review checked the form, setup loader, save action, shared styles, existing DESIGN.md and sidecar primitives against `profile-stale-desktop.jpg` and `profile-saved-602.jpg` in `.impeccable/review/`.

The extension remains coherent with Studio, Plum & Porcelain and Lato: flat bordered form groups, existing primary/ghost actions, labelled native fields, and textual outcomes. Code preserves submitted selections after an error and makes conflict text fields read-only so entries remain selectable; the stale capture shows selected multilingual draft text. Recovery offers a labelled new-tab comparison and an explicit discard/reload action. The saved capture shows retained choices and the confirmed update message. Code carries the confirmed version forward and provides a Week link when the profile was saved but the first week was not confirmed; that partial-save branch is code evidence, not evidence from these two captures.

The implementation handoff reports an empty detector result (`[]`). No 390px capture is supplied, and these captures do not establish keyboard, screen-reader, contrast or full responsive acceptance. Existing small muted helper text and the retained setup composition are outside this recovery increment. No permanent design-system change or shipping raster asset was introduced; DESIGN.md and `.impeccable/design.json` remain unchanged. The review screenshots are verification artifacts, not product imagery.
