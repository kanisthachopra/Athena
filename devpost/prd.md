---
doc: prd
status: approved
---

# Athena — Product Requirements

**8 October owner correction — two modes.** Before entering the main experience, offer immersive exploration or efficient access. Immersive means an actual bounded game environment: move an avatar, explore spaces, approach and enter buildings, and encounter NPC guides physically present there. Efficient mode gives direct access to the same destinations and plan state. Switching must not change accepted preferences or require replaying progress. Existing single-image town previews are not approved for immersive mode. This supersedes conflicting static/game-like interpretations below. First playable validation must cover movement, obstacles, building entry/exit, meeting a guide and parity between modes. The visual style remains under owner review.

Approved 7 October 2026, with the owner-directed removal of NCERT as the category basis. Detailed replacement evidence mapping remains research work, not a new approved taxonomy. Athena helps caregivers in India support foundational development for ages 0–6 through existing resources, English voice conversation, a beautiful illustrated town and parent-controlled adaptation.

Source: `scope.md > Who It's For`, `The Core Loop`, `First Release Boundary`, and the subsequent decisions in `docs/DECISIONS_AND_OPEN_QUESTIONS.md`. This document records approved behavior and identifies remaining verification work. It does not claim implementation, educational efficacy or an approved final design. Criteria below have not been executed.

## The Core Journey

1. Meet Athena and complete a short animated introduction with child age, caregiver priorities and languages around the child. Account connection follows the preference flow.
2. Arrive in the town square. Open the daily board, understand today's focus and choose a foundational area. Day one also introduces the app.
3. Follow a visual path to that area's building. Its guide offers today's resources and a voice conversation.
4. Browse real source previews or speak a need in English. Receive concise on-screen dialogue and relevant resource choices.
5. Select a resource, see a short entry transition and read/watch it where permitted, or follow a clearly identified source link. Receive a summary and practical takeaways grounded in available source content.
6. Have an opportunity to use the resource with the child, then return for spoken reflection. Athena confirms its understanding and clarifies ambiguous preferences.
7. Choose whether to keep the current planned direction or accept a visually explained recommendation affecting future plans. If an attempted resource was unsuitable, choose a replacement at the same level or advance.
8. Return to a saved plan whose recommendations reflect confirmed preferences and accepted direction changes.

## Screens and Layout

Source: `scope.md > The Core Loop`, `Inspiration & Identity`.

| Surface | Primary content and actions |
| --- | --- |
| Welcome and onboarding | Athena, short animated questions, clear progress; account connection afterward. No affordability question or long qualifications form. |
| Town square and daily board | Parent avatar, recognizable buildings, prominent daily plan; select a focus and find its building. Internal timestamps are not prominent UI. |
| Building and guide | Expressive NPC, concise dialogue, today's resource choices and Start Speaking; visually organized videos/readings/folders. Ask only necessary context not already supplied. |
| Resource experience | Actual preview, source identity, entry transition, readable or playable content when permitted, grounded guide conclusion and next steps. |
| Reflection and path comparison | Spoken feedback, interpretation to confirm/correct, contextual clarification, existing route versus recommended route with future impact. These may be overlays rather than separate pages. |
| Settings | Relevant permissions and controls; exact memory correction and deletion presentation remains to be defined. |

Returning users can resume the resource/planning loop without repeating onboarding. Exact placement of secondary navigation is a design task, not a new feature set.

## Look and Feel

Source: `scope.md > Inspiration & Identity`, `What Working Looks Like`.

Graphics are a core acceptance requirement across the full journey. Use a cohesive illustrated town, expressive characters, thoughtful resource presentation and smooth, purposeful motion. The parent is the player; appeal to adults around 30–35 through a warm, welcoming, lightly gamified style inspired by Duolingo/Brilliant and older NPC games. The lead guide is female; starfish is the leading concept, not a finalized character asset.

The owner delegates palette proposals: calm and warm, distinctive, without red/pink dominance. Typography, exact palette, building forms and final character design remain to be shown in concrete previews. Text should be concise and readable. Phone and desktop usability and a reduced-motion alternative are in the approved scope. No complex 3D world is required. Placeholder graphics or game icons on a generic dashboard do not satisfy visual acceptance.

## Features and Behavior

### Resource Discovery and Language Coverage

Source: `scope.md > First Release Boundary`.

Provide existing educational resources with meaningful thumbnails, destination links, source attribution and concise reasons they fit the request. Do not generate original activities. Distinguish material aimed at caregivers from material used with a child; do not assume all resources suit every age from birth to six.

Resource-language coverage: English, Mandarin Chinese, Japanese, French, Spanish, German, Korean, Italian, Portuguese, Arabic and Russian. English remains the voice-input language. Record actual home languages without assuming parental fluency. Help adults understand resources in languages they do not speak. Identify language varieties where relevant. The child need not study every offered language.

Research must establish the developmental building taxonomy, source selection and minimum useful coverage. No resource gains endorsement merely from being placed beneath a WHO-informed category.

### Free Resources and Optional Subscriptions

Source: decision ATHENA-FREE-FIRST-RESOURCES.

The normal resource offering and learning path prioritize resources usable without payment. Paid or subscription resources are optional discoveries, never a purchase requirement for progression. Athena can explain their relevant benefits, drawbacks, costs and access limitations and help the parent explore whether they suit the family. Verify current claims before presenting them; distinguish actual free access from limited free tiers and trials. If no suitable free resource is found, explain the gap rather than label a paid resource free or force a purchase. No purchase, enrollment or third-party-account access is authorized by this feature.

### Resource Consumption and Guide Support

Source: `scope.md > The Core Loop`, steps 4–5.

Use a short entry transition when opening a resource. Present readable/video content inside Athena when access and rights permit; otherwise clearly open the original source. At the conclusion, offer a concise summary and source-grounded practical takeaways. Never pretend to summarize inaccessible content or infer a video's contents from its title alone. Exact external-source return/completion interaction remains open.

### Voice Conversation

Source: `scope.md > First Release Boundary`.

English voice input is required for requests and reflection in this release. A clear Start Speaking action opens the interaction. The guide's primary reply is short on-screen text with subtle character expressions. Follow-up is an explicit action between turns. No mandatory typing in the normal conversational flow.

Provide a typing bar and helpful prompt when the parent cannot use the microphone. If Athena cannot understand the speech, ask naturally for repetition rather than acting on uncertain input. After two or three unsuccessful attempts, invite the parent to type instead and make the typing bar available without requiring further microphone retries. The owner explicitly confirmed this fallback. Select the exact threshold within that range during implementation. Correction of plausible but incorrect transcription and optional brief spoken paraphrases remain open. Source: ATHENA-VOICE-FALLBACK.

### General Path and Personalized Direction

Source: `scope.md > The Core Loop`, step 7; decisions ATHENA-TWO-PATHS and ATHENA-PERSISTENT-PATH-DIRECTION.

A predictable general route provides a starting point, informed by researched guidance rather than invented averages. The family's route develops through choices and feedback. When recommending a change, distinguish the current active route from the alternative. Visually explain what changes, why and what it means for upcoming resources.

Only an explicit parent choice activates the recommended direction. It influences future plans, not just one resource. Keeping the existing route is a valid choice. Do not portray these as two simultaneous active schedules. A parent's acceptance does not imply measured child development or authorize unrelated changes. Exact preview horizon and reversal behavior remain open.

### Reflection and Preference Memory

Source: `scope.md > The Core Loop`, steps 6–7; decisions ATHENA-PREFERENCE-CLARIFICATION and ATHENA-REFLECTION-CONFIRMATION.

Preserve what the parent reports. Athena briefly explains its interpretation and asks for confirmation or correction before acting on that interpretation. When feedback is ambiguous, clarify whether it concerns this session/resource or an ongoing preference. For example: "Was this video too long for today, or do you generally prefer shorter videos?"

Only a confirmed general preference informs future recommendations as a lasting preference. An unanswered interpretation stays tentative. Do not convert dislike of a presentation into an ability claim about the child. Avoid repeated questions when the parent already clearly answered them. Confirmation of an interpretation is separate from acceptance of a changed plan. Memory correction and forgetting require a concrete control specification before implementation.

### Progression and Replacement

Source: `scope.md > The Core Loop`, step 7; decision ATHENA-PROGRESSION-CHOICE.

Progress follows an opportunity to use a resource and reflect, not an arbitrary timer. After an unsuitable attempted resource, offer two choices: a replacement at the same level or continuation to the next level. Never require successful child performance before allowing this choice. Moving forward does not imply that a developmental milestone was achieved.

Extra resources remain available. The planner may suggest another foundational area without forcing a switch. Blocked resources and resources never tried need distinct handling, still open.

## States and Boundaries

- **First visit:** show brief onboarding and day-one guidance; no invented family preferences.
- **Returning:** preserve saved preferences, accepted direction, plan and reported reflections.
- **Unconfirmed interpretation:** retain original feedback and invite correction; no lasting preference silently created.
- **Recommendation pending:** existing plan remains active until parent choice.
- **Unsuitable attempted resource:** parent chooses replacement or advancement after reflection.
- **Unavailable source/content:** do not claim it was read or can be played; precise replacement/return interaction remains open.
- **Save, voice or recommendation failure:** do not display false success or silently change the route; detailed recovery behavior is a PRD gap.

## Checkable Acceptance Criteria

1. A caregiver can reach a relevant resource through onboarding, town and building without navigating a long form.
2. Each displayed resource has a real destination and an accurate source identity/preview; summaries can be traced to inspected content.
3. English speech supports resource requests and reflection; guides return concise visible replies.
4. An unaccepted recommendation leaves the active route unchanged. An accepted direction influences subsequent recommendations and has a visible explanation.
5. "Too long" feedback triggers contextual clarification when ambiguous; a session-specific answer does not establish a general duration preference.
6. Correcting Athena's interpretation affects the proposal; confirming the interpretation alone does not switch the plan.
7. After an unsuitable attempted resource and reflection, both replacement and advancement are available without a child-performance test.
8. Returning to the app preserves the accepted route and confirmed preferences.
9. Owner-reviewed representative screens and motion cover onboarding, town, guide, resource and reflection. Coherent finished graphics and working interactions are both required.

## Product Decisions

The approved scope and dated decision register are the authority for the choices above. Later interview decisions establish parent-selected adaptation, persistent future direction, explicit preference clarification, confirmed interpretation and replace-or-advance progression. The owner approved the remaining proposals while rejecting the NCERT emphasis. No provider, final rendered visual design or scientific taxonomy is certified by this approval.

## What We're Building and What Is Deferred

Build the complete early-years caregiver resource loop, including visual quality, voice, persistence, grounding and parent-controlled adaptation. The owner explicitly requests a useful product beyond the course's default tiny experiment.

Defer older-child/teen accounts, full curricula, additional voice languages and expanded language libraries. Exclude original activity generation, reviewer-dependent delivery of those activities, mandatory quizzes, child rankings and artificial countdown locks. Do not introduce unrelated game systems.

## Proposed Defaults For This Review

**U — Owner approved these defaults except the NCERT-based rationale in P1.** The defaults originated as assistant proposals and were accepted on 7 October 2026. P1 now records broader research inputs; its detailed evidence mapping remains to be verified. Technical feasibility, individual resource verification and rendered visual review remain next-stage work.

### P1 — Town Buildings and Developmental Coverage

Start with five resource destinations: **Language House** (communication, stories and the eleven resource languages), **Movement Garden** (physical/motor exploration), **Discovery Workshop** (early thinking, patterns and curiosity), **Connection Cottage** (relationships, emotions and social understanding), and **Creative Studio** (art, music and expression). Treat learning habits as a thread across these destinations. Health, nutrition, responsive care and safety inform resource selection and caregiver guidance across the experience rather than becoming medical-training levels.

The owner rejected NCERT as the organizing basis and requested broader research. Keep these buildings as navigation groupings, not a scientific taxonomy or school curriculum. Research inputs checked 7 October 2026: [Head Start ELOF](https://www.headstart.gov/interactive-head-start-early-learning-outcomes-framework-ages-birth-five) distinguishes approaches to learning, social/emotional development, language/literacy, cognition and physical development from birth to five; it explicitly is not a curriculum, assessment or checklist. [NAEYC development principles](https://www.naeyc.org/resources/position-statements/dap/principles) emphasize interconnected physical, cognitive, social/emotional and linguistic development, including multilingual development and approaches to learning. [UNICEF learning through play](https://www.unicef.org/sites/default/files/2018-12/UNICEF-Lego-Foundation-Learning-through-Play.pdf) informs play and caregiver support. [WHO nurturing care](https://www.who.int/publications/i/item/9789241514064) informs the caregiving context. Compare their applicability rather than transplant any national framework wholesale. Creative expression, sensory exploration, attention, self-regulation, curiosity and everyday independence must be examined in the coverage mapping, not lost because a building has a broad name. This last coverage list is a research proposal, not a validated developmental checklist. No cited organization endorses Athena's buildings, algorithm or individual resources; age-six coverage and each resource's suitability require explicit appraisal.

### P2 — Concrete Visual Direction

Propose a softly illustrated, slightly elevated 2D town: rounded architecture, visible garden paths, gentle depth and restrained texture. Forest green anchors the interface, warm ivory provides breathing space, teal distinguishes interactive elements, and muted golden accents highlight Athena and progress. Use a golden starfish concept for the first preview, with personality expressed through posture and facial animation rather than gender stereotypes. This is a proposed palette direction, not a tested color specification.

On desktop the town and selected guide/resource panel share space; on a phone the town opens focused sheets with a clear return action. Tapping a building works directly: avatar travel is a brief visual response, never a navigation prerequisite. Provide a compact destination shortcut for repeat visits. Reading and video occupy a quiet, generous surface; decorative animation recedes during consumption. Specify final type, colors and motion through representative previews, with legibility, keyboard access and reduced motion checked before accepting the visual implementation.

### P3 — Resource Quality and Minimum Coverage

Show up to three suitable free choices for today's focus when available, with more available through the guide/library. Every core resource needs a checked destination, publisher, intended audience/age applicability, language/variety, access cost, format, duration where known, content basis for its description and permitted preview/display method. Flag free registration, advertisements or regional restrictions when known. Never use a fabricated thumbnail; if a genuine preview cannot be displayed, use a clearly labeled source/format cover.

Favor identifiable educational/public-interest publishers and inspect the actual material; publisher reputation alone is insufficient. Adult-oriented content can help caregivers without being suitable to show to a young child. An incomplete transcript supports only a correspondingly limited summary. Source-grounded takeaways should link back to the material. Do not invent educational effects, certify clinical suitability or equate popular with appropriate.

Proposed initial coverage gate: for every supported language, at least three distinct free resources from at least two publishers, including guidance usable by a caregiver unfamiliar with the language. For each building, verify a usable caregiver route for the working age bands under 1, 1–2 and 3–6. These are catalog-checking bands, not developmental ranks or evidence that every language has suitable direct infant media. Resources may span bands where justified. Verify the inventory before calling coverage complete; if a gate cannot be met, report the gap for a scope decision rather than fabricate resources or quietly reduce support.

### P4 — Failed Access and Resources Not Yet Tried

If a resource cannot open, offer the original source link when usable, a free replacement, or returning to the board. Opening a link alone never counts as consumption. When returning from an external source, ask whether the parent wants a recap or to reflect; do not claim playback was observed.

For a resource not tried, offer **Save for later**, **Find a replacement**, or **Leave this focus for now**. Preserve progress; other buildings and additional resources remain available. The normal next-level gate remains tied to opportunity to use and reflect. An unavailable source is not a failed child attempt. If no suitable free replacement exists, disclose that gap and leave the path resumable without requiring payment. After an actual unsuitable attempt, retain the owner's approved replacement-or-advance choice.

### P5 — Speech Correction and Guide Audio

Show a live transcript when available, with clear listening/processing states and Stop/Cancel controls. Let parents replay their input by speaking again or edit the transcript through the typing fallback. Use **Send** to submit the finished turn so a plausible transcription error can be corrected before processing. Do not promise that speech-recognition confidence catches all errors. After two unsuccessful attempts, invite typing; it is also available immediately whenever wanted.

Default guide output to concise visible text. Provide an optional **Hear the short version** control rather than automatic voice playback. This preserves the approved possibility of a brief spoken paraphrase without making audio intrusive. Microphone denial offers typing immediately, without repeated permission requests.

### P6 — Understandable Memory

Offer **What Athena remembers** from the guide and settings. Separate confirmed preferences, parent-reported observations and tentative interpretations. Each confirmed preference shows its scope (for example, shorter videos generally), its origin and **Change** / **Stop using this** actions. Session feedback is not silently promoted into a permanent preference.

Stopping use removes that preference from subsequent recommendation context; it does not rewrite past reflections or erase history. A separate deletion control handles deletion requests with truthful status and a defined retention process in the technical plan. Do not promise deletion from every provider or backup immediately. Avoid persistent raw audio by default; retain only the text the parent submits and the information necessary for the approved experience, subject to the retention plan.

### P7 — Path Preview and Reversal

Show two short routes branching from **Today**: the current path and the proposed direction, previewing up to three upcoming resources when known. Summarize the enduring change in one line, for example, "More short audio and shared reading; fewer long videos." Future items are provisional, not guaranteed schedules or developmental predictions. Keep the general starter route accessible as a reference without adding a third competing daily plan.

Choosing the alternative changes future recommendations; completed resources and reported observations stay intact. Offer **Undo this switch** for the latest change. After later changes, offer a fresh return-to-previous-direction preview rather than erasing intervening work. Changing a remembered preference can generate a new recommendation but does not silently replace a saved plan. An inaccessible or newly unsuitable source is marked unavailable with alternatives, even on an otherwise retained route.

### P8 — Reliable Everyday States

When a save fails, keep the current draft visible and show Retry; never label it saved. Recommendation failure leaves the saved path usable and provides retry or browsing. Distinguish a loading search from no suitable results. Persist a plan switch only once, explain success, and preserve the prior route if it fails. Scope all family data to authorized caregivers; concrete roles and operational privacy remain technical-plan work. Offer a short limitations statement in the guide's information panel: Athena helps find and understand educational resources and does not provide a professional assessment of the child.

## Additional Acceptance Criteria For Proposed Defaults

These are approved requirements; all are currently NOT RUN.

10. An inaccessible resource offers usable recovery without a paid-only progression requirement or false completion.
11. A corrected transcript is the text submitted. Two unsuccessful voice attempts reveal an invitation to type; denied microphone access offers typing immediately.
12. Stop using a preference excludes it from subsequent recommendation context while keeping prior reports distinguishable from preferences.
13. A path switch previews future impact, does not alter completed history, and offers a safe reversal appropriate to intervening changes.
14. Catalog coverage is backed by an inspected inventory meeting P3, not counts of empty language filters.
15. Each proposed building is directly accessible on phone and desktop without forced avatar travel; resource reading remains clear and reduced-motion navigation remains usable.
16. Search/save/model failures leave prior saved state intact and never produce a false success message.

## Review And Remaining Verification

The owner approved the consolidated behavior and defaults, except the NCERT basis, which has been removed. The replacement evidence mapping remains research work; do not seek a second approval of unchanged requirements. Final illustration assets and rendered visual previews need a separate concrete design review; approval of this document does not assert that the graphics already meet the bar. The technical plan must verify content access, the resource inventory, speech and retrieval capabilities, data retention and the actual existing app against this replacement direction. No provider or custom ML model is selected here.

The existing G0 audit dated 1 October concerns the previous product. Its findings are historical evidence, not proof of alignment with Athena. Before implementation, refresh that comparison for the new resource loop and preserve existing local work, deployed migrations and family data.

