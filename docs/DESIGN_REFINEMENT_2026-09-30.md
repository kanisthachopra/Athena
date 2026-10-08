# Screen-gallery refinement (preview only)

## Owner selections

Plum & Porcelain remains selected. Guide replaces Ask in the proposed interface.

- B: public home, create account, password recovery, resource detail, settings, help.
- A: login, email confirmation, initial setup, setup review, Today, activity detail, Guide, Insights, Family, What MIRA understands.
- Week and Library: neither accepted; use A as a starting point, not an approved final layout.
- All pages: improve typography and natural, source-faithful writing. Add purposeful visuals, illustrations, animation and interactivity. Guide should have familiar conversation affordances.

## Copy decisions

Canonical references: source of truth sections 1–3, 5–7, 9–11 and 14. Prefer concrete tasks (choose an experience, prepare, observe, review a change) over repeated emotional slogans. Explain adult role, learning opportunities, family priorities/capacity, language context and parent control. Never promise developmental outcomes, safe novel activities, verified review, confidentiality policies or delivery that have not been established.

Examples are synthetic. Draft educational copy and illustration are design material, not reviewed live content. Caregiver profiles do not grant app access. Insights/memory distinguish observations from interpretations. Settings cannot imply a settled deletion/retention policy.

## Typography and motion intent

The first gallery uses Manrope 14px with heavy, tightly tracked headings and 12px supporting copy. The detector alone cannot judge fit. Revise to Lato for readable humanist interface/body text (16px prose, 14px controls, 12–13px metadata); Bricolage Grotesque for the public hero and short expressive auth heading only. Keep product page headings quieter and tracking near normal. Readable measure 45–65ch. Font display swap and system fallback; no invisible text dependency.

Motion focal point: plan change/undo visibly changes the affected day. Small colour transitions confirm saved, selected and expanded states. No autoplay loops or entrance sequence delaying use. OS reduced-motion and a local preference remove spatial transitions. Real illustration supplies warmth; icons keep operational meaning.

## Scope

### Subsequent owner direction: integrated motion, no illustrations

Remove all illustration imagery from the current preview. Replace it with interactive, code-native visual relationships integrated with text. Keep the selected palette, typography and page layouts. Visuals may feel responsive and organic but must not imply a sentient parenting authority, measure a child, reward completion or compete with caregiving.

Motion thesis: an optional experience moves through preparation, parent choice and observation; a thread connects the relevant words and changes when the parent acts. Plan items retain spatial continuity through move/skip/undo, new observations enter their timeline, and proposals unfold before confirmation. Motions are bounded to 180–450ms with no idle loop, fake loading or audio. Both an always-available preview motion switch and OS reduced-motion disable movement without hiding content. No new animation dependency.

Implemented in the same preview: removed embedded illustration bytes and image backgrounds; replaced large image slots with interactive context/process threads and small thumbnails with existing Lucide icons. Motion uses keyed element position transitions, finite node deformation and connector reveal, proposal unfolding, and note insertion. It stops on hidden document and reduced-motion changes. Original generated illustration file and provenance are retained as rejected exploration, not referenced by this preview. All 18 screens passed a heading/no-illustration DOM smoke check; process text changes and the motion switch were exercised, plus plan move/undo. These checks do not measure animation performance on every device.

One consolidated, browsable preview using the owner's selected layouts. No production route, database, auth, model configuration or migration changes. Tests concern mock interactions and rendering, not application readiness. Screen approval remains pending.

## Preview evidence

### October 1: four alternative motion suites (pending owner selection)

The owner rejected the repeated three-label node/connector visual language. Removed the added process visuals from public Home, login A and email confirmation A in the consolidated preview, preserving copy and layout. Other screens remain the prior exploration until a new suite is selected.

Created `mira-motion-suites.html` alongside the consolidated preview: Elastic Layouts (inline expansion and reflow), Sliding Layers (context-preserving detail sheets), Inline Changes (editable prose and local replacement), Spatial Workspace (items moving between explicitly named areas). Each offers Week, Guide and memory-correction examples with local review/apply/undo. No illustration assets, auto-playing animation, child scoring, live data or real AI requests. Reduced-motion and a local motion toggle are supported. This is a design comparison, not approval to roll out any suite.

Browser smoke checks exercised all four suites, detail expansion, proposal apply/undo and memory correction. No production code, auth or database changes.

- Revised 18-screen fragment: `C:/Users/kanis/.codex/visualizations/2026/09/27/01a0e1b4-7ee3-71a0-94ec-8c96631b1285/mira-refined-screens.html`.
- All 18 screen selections rendered a primary heading in the browser smoke check.
- Tested local move/undo, Guide proposal apply, replacement, observation recording, interpretation correction/removal. These mutate only synthetic preview state.
- Visually inspected desktop public home and 390px public home/Week; not a full cross-device accessibility audit. CSS includes OS/local reduced-motion paths; performance and screen-reader behaviour have not been exhaustively measured.
- JavaScript syntax and inline asset JSON parse checked. Impeccable detector returned no findings; that is not proof of design quality or full accessibility.
- Built-in image generation produced one consistent editorial illustration, embedded as compressed WebP. Exact prompt/provenance: `.impeccable/mocks/refined-illustration.json`. New illustration remains a proposal.
- Live app untouched. No build or migration needed for these preview-only files. Auth and Guide are explicitly demos; draft activity/resource copy is not reviewed published content.
