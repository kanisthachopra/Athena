# MIRA redesign: selection round

Status: options prepared for owner selection; no replacement design approved or applied.

## Authorization and scope

The owner explicitly rejected the current UI and requested Impeccable-led, distinct UI/UX options, selection before implementation, and further rounds if needed. This authorizes design exploration; it does not settle unresolved product questions in `MIRA_SOURCE_OF_TRUTH.md`.

## Evidence and limits

Inspected `app/today/page.tsx`, `app/ask/page.tsx`, `components/app-header.tsx`, and the existing Ask/profile flows from this session. The current Today browser navigation timed out; previous screenshots establish the cream/serif/pastel presentation but are not fresh Today evidence. The Impeccable detector returned `[]` for the three scanned Today/Ask/navigation files. This is a focused source-led UX review, not the plugin's formal dual-assessment critique or a full G0 audit.

Findings:

- Today uses a single-row `.maybeSingle()` activity query. The product contract describes a portfolio; layout exploration must support multiple optional opportunities. Database cardinality and planner behavior need investigation before implementation changes.
- Large greetings, repeated reassurance, and similarly weighted containers obscure the primary preparation action.
- The Today greeting addresses the child's nickname despite an adult-facing experience. Reorient copy around the parent's day without inventing their identity.
- Ask sends a question, age, and opportunity title. The UI should make the scope of that context inspectable and preserve clear boundaries between an answer, a proposal, and a saved change.
- Prototype change comparisons are desired UX proposals, not evidence that Ask can currently modify plans. Implementation needs validated authorized candidates, version checks, and explicit confirmation.
- Avoid implying reviewed evidence, complete observation coverage, developmental scores, or daily completion requirements.

## Direction exploration

Seven grounded systems considered, in order: daily brief; field guide; family table; focused preparation view; studio/workshop; transit-style week overview; contact-sheet collection. Impeccable seed `3cf47dd8`, direction scope, operate mode, selected index 5. The Studio direction is presented first; Daily Brief is the recommended familiar alternative.

Catalog challengers were fetched through Impeccable. The fold system is competitive as progressive disclosure (Unfold). Tension structures, tape-deck controls, dance notation, terminal transcript, and one-bit desktop were declined as primary systems because their full visual/interaction grammar weakens familiar caregiver tasks. Transferable disciplines are recorded on the decision board. Familiar essentials remains the conventional option.

## Shared interaction requirements for the selected design

Owner clarification during exploration: positive references include Instagram, ChatGPT, YouTube, Canva, Linear, GitHub, Notion, App Store, and Vercel's data-heavy UI. GitHub navigation, breadcrumbs, search, listings and information architecture were singled out. Figma UI was disliked. Carry the usability qualities into the selected design; do not copy branding or introduce engagement-maximizing feeds.

- Today: readable opportunity, parent effort, materials, why it fits, and clear preparation action; no-plan and low-capacity states are first-class.
- Guidance: short steps first, optional purpose and provenance after; visible stop/modify guidance.
- AI: inspect context, retain input after failure, concise answer, explicitly marked proposed changes, before/after comparison, clear save/cancel boundaries.
- Feedback: quick optional taps and notes without turning observations into ability claims.
- Phone: readable single-column content, labelled reachable navigation, visible focus, and no dependence on hover or decorative motion.

## Artifacts and choice

Decision payload: `.impeccable/mira-direction-options.json`.
Visual studies and exact prompts: `.impeccable/mocks/decision/`.
All sample family/activity data in these images is fictional. Images are mockups, not functioning controls or evidence of shipped features. No choice has been made. The source document remains canonical; `PRODUCT.md` is only its design-context summary.

After selection: record the owner's choice, resolve implementation-critical G0 gaps, and translate the chosen direction into a working responsive flow with real data and verified permissions. Preserve existing functionality unless an explicit correction is agreed.

## Owner refinement — Studio palette round

Studio is preferred for its balanced content and intuitive spacing. The owner wants palette alternatives and Daily Brief's navigation/features with lower text density and more space. Unfold and Familiar essentials are rejected. Top app navigation and too much simultaneous information are rejected. This narrows the structural direction without selecting a final palette.

The next comparison holds structure and sample content constant: Studio proportions, left navigation, search, breadcrumbs, a single featured invitation, short contextual help, deeper details on demand. Palettes: Forest & Chalk; Plum & Porcelain; Stone & Clay (light sidebar). Payload: `.impeccable/mira-palette-options.json`; exact prompts and visual studies: `.impeccable/mocks/palette/`. None is implemented in the runtime app.
