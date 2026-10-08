# Athena: Emil skills review and first interactive design comparison

8 October 2026. Owner requested review of every skill at https://github.com/emilkowalski/skills and application to Athena with tests.

## Provenance and scope

Read the repository's 14 main skill files from commit `e8a175de22ae1e49370fc144c1f3bb9aeedf988d`. Compared each with the installed version: all are identical after normalizing line endings and surrounding whitespace. No skill installation, replacement or dependency change was needed. MIT notice is retained in `public/athena-preview/EMIL-LICENSE.txt` because the picker CSS is copied from the skill. This record does not claim every linked reference or external article was read.

Read the project source of truth and the approved Athena PRD; consulted the existing initial G0 reset alignment findings. Those findings establish the activity/resource mismatch. The full schema/provider reset audit remains incomplete. This task creates an isolated UI comparison, not a migration or a completion claim for Athena's backend.

Preview: `/auth/prototypes/athena`. The existing `/auth/` public branch permits a synthetic preview without changing authentication policy. The route is noindex and has no family reads, writes or model calls. It is unlinked from production navigation. The Next.js page/CSS guides installed in this project were read before implementation.

## All skills and their application

| Skill | Athena application |
| --- | --- |
| emil-design-eng | Readable hierarchy, responsive press feedback, stable interaction states, cohesive palette and original illustrations. |
| prototype | Three distinct full-size layouts, isolated route, shared behaviors, exact picker styling, URL persistence, keyboard selection and replay. Owner selection precedes promotion. |
| animate | CSS press feedback 160ms; pointer-open dialog entry 180ms at scale .97; first appearance of mascot 220ms. Strong ease-out, no new motion dependency. |
| review-animations | Review the new slice for purpose, frequency, easing, reduced motion, interruption and hover gating. Findings below. |
| improve-animations | Its audit/planning workflow informs the future production motion audit. No claim of a whole-app motion audit in this slice. |
| find-animation-opportunities | Prioritize press feedback and dialog entry. Reject drifting town scenery, forced avatar travel and animated keyboard navigation. |
| animation-vocabulary | Use precise terms: press feedback, scale-in, origin and reduced motion. No separate product feature needed. |
| apple-design | Agency, immediate feedback, predictable dismissal, readable type and view continuity. No gesture/spring machinery without a gesture need. |
| mobile-native | Dynamic viewport limits, 16px select, safe-area header, touch targets, capability-gated hover, no disabled zoom. Real phone feel remains unverified. |
| break-ui | Shared fixtures: Demo data, Worst case, Empty and One. Long caregiver name and multilingual building label enter through the same data boundary. Narrow layout and image checks performed. |
| pick-ui-library | Existing stack retained. Standard native dialog handles modal focus/dismissal; no custom div modal, toast, gesture or chart library required here. |
| ask-sonner | No transient toast needed: persistent inline status confirms preview changes. Do not add a dependency merely to exercise the skill. |
| animate-expo | Read; not applicable to this Next.js web preview. No native rewrite. |
| write-swift | Read; not applicable to the TypeScript app. No Swift migration. |

## Designs

| Variant | Axis | Benefit | Cost |
| --- | --- | --- | --- |
| Village | Town-first navigation; building labels over the illustrated map | Strongest sense of arriving in a place | Map is less compact; phones use a text building list below the illustration |
| Trail | Parent journey first, with three steps and a secondary town | Makes the try-and-reflect rhythm explicit | Town is secondary; longer vertical layout |
| Fieldnotes | Editorial plan first, illustration plus browsable building directory | Calm and easy to scan | Least game-like |

All share focus selection, building entry, a real UNICEF collection link, session-only save-to-board, path comparison, keep/accept and undo. The sample recommendation explicitly starts from a hypothetical confirmed preference. It is not an inferred fact about the owner or her sister. No actual child resource suitability or developmental level is asserted.

The source collection was checked at https://www.unicef.org/parenting/child-development on 8 October 2026. It is identified as a collection, not an individually vetted recommendation. Resource thumbnails, specific source summaries, voice conversations, onboarding, reflection capture, persistence and live search are outside this town/board comparison and remain required product work.

The village and mascot illustrations were generated with the built-in image tool for this project and copied into `public/athena-preview/`. They are original concept assets, not external resource thumbnails. Next Image serves optimized versions in the preview.

## Verification evidence

| Check | Evidence |
| --- | --- |
| TypeScript | `node node_modules/typescript/bin/tsc --noEmit`: exit 0 after interaction fixes. |
| Scoped lint | `node node_modules/eslint/bin/eslint.js app/auth/prototypes/athena`: exit 0. Initial state-in-effect finding fixed with server-provided URL parameters. |
| Production compilation | `npm run build -- --webpack`: exit 0; new preview route included. Existing metadataBase warning remains; no deployment performed. |
| Browser rendering | All three variants inspected in Codex in-app browser; screenshots in `docs/athena-preview/`. |
| Interaction | Open daily board; select Movement; enter Movement Garden; map entry to Language House; save collection and see link on board; compare; accept; undo; keep current path; Escape dismissal and focus restoration observed. |
| Keyboard | Number key switches variant; reload preserves `?v=1`. Escape returns focus to the opening control. Keyboard Enter activates the keep-path choice. |
| Narrow screen | All three variants at 320px with worst-case data: document width 305px plus scrollbar, no horizontal overflow; zero broken images. Comparison dialog width 282px, content width 280px. |
| Empty/single | Fieldnotes fixture has 0, 1 and 5 building buttons in empty/one/demo states; empty message visible. Shared list used by other variants. |
| Browser errors | No errors/warnings in captured console after localhost load and interaction checks. Initial connection waited for compilation; 127.0.0.1 caused Next dev-origin warnings, resolved by using localhost without changing policy. |
| Data flow | UI state only. No API/database boundary exists in this preview; no claim of live provider integration. |

Browser viewport emulation is not physical-device validation. OS reduced motion, 200% browser zoom, screen-reader speech, slow-device frame timing and physical-phone keyboard/safe-area behavior were not exercised. Reduced-motion support was reviewed in CSS, including existing project-wide motion preferences. No full accessibility conformance claim.

## Motion and robustness review

| Before | After | Why |
| --- | --- | --- |
| URL selection initialized by setState inside an effect | Server passes initial variant and fixture | Avoid cascading render and wrong first variant. |
| Variant switch could retain a previous scrolled position | Instant return to top on variant selection | Compare the same entry point without hiding the new design's heading. |
| Save initially only showed a message | Session state plus visible saved source link on board | A confirmation must correspond to inspectable state. |
| Recommendation could be offered again after already accepting it | Hide the duplicate proposal while the chosen path is active; keep undo | Avoid contradicting the displayed current path. |

Motion verdict: approve this bounded preview's code-level motion ingredients. Native dialog entry uses pointer-only transform/opacity; keyboard actions stay instant. Picker highlight width animation is the explicit skill exception. Feel on physical hardware remains pending. No production-wide motion approval implied.

Stress findings: long names and multilingual labels wrap without a horizontal overflow in tested layouts. Lists handle empty/one states. No failing content layout was observed at 320px. Fixtures are deliberately finite (five navigation buildings), so a 1,000-row performance fixture is not applicable. Production resource-result pagination is a separate task.

## Next handoff

The prototype skill says: “stop — the choice belongs to the user.” Present the working comparison and choose a direction before promoting it. This preserves the approved audit → comparable previews → owner choice sequence. No variant is approved merely because it was built. After choice, integrate the chosen navigation and continue the real resource/voice/reflection loop with separate provider and persistence evidence.
