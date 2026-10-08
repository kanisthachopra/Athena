# Decisions and open questions

## ATHENA-RESOURCE-FUNCTIONALITY-2026-10-08 — Real sources and voice take priority

**U — Owner instruction.** The owner accepted the world direction and asked to focus on core functionality: replace the UNICEF placeholder with substantially researched resources, connect voice input and make the app useful. This authorizes a bounded implementation of the approved resource-first flow in both world and focused modes. No repeated planning approval is needed for this slice.

**D — Implemented boundary.** Added a public, age/domain/language-filtered starter catalog and authenticated resource search, source explanation and English speech transcription. Existing Tavily, Nebius and Deepgram credentials remain server-only. Explicit per-request disclosure is additional to the existing family Guide switch, never inferred from an old setting. Resource desk requests share the existing durable Guide allowance (20 reservations per rolling 24 hours); search/voice use one dispatch, explanation uses extraction plus one model dispatch. The model retry is disabled only for this two-provider operation. No migration or provider replacement.

**H — Implementation choice.** Parent browsing bands are approximate filters, not assessed child ability. Source passages have server-assigned citation IDs; excerpts are copied from those passages rather than generated. Citation validity is not clinical or semantic validation. The starter shelf links to existing materials, with honest gaps for age cells and media access. Resource desk drafts live in component memory and disappear on close; no inferred preferences or new plans are saved.

**V — See evidence.** `docs/ATHENA_RESOURCE_FUNCTIONALITY.md` records tests and limits; `docs/ATHENA_RESOURCE_SOURCES.md` records publisher evidence and image rights. Actual human microphone capture, India-network media playback, embedded reading/video, persisted resource plans and adaptive reflection remain unfinished. The current daily board is still explicitly a sample.

## ATHENA-WORLD-POLISH-2026-10-08 — Playable direction accepted; closer camera and richer craft

**U — Owner acceptance and instruction.** The owner called the playable world “exactly how I imagined it,” explicitly liked the controls and entering buildings, and requested a closer third-person camera while keeping buildings visible. Improve graphics toward moderate stylized realism, walls/edges/materials, rounded tactile widgets reminiscent of Duolingo, richer animation and small animated animals. This accepts the playable direction; it is not approval of unfinished voice/search or production readiness.

**Implementation boundary.** Refine the same isolated world preview, keeping resource-first behavior, providers, family data and navigation contracts unchanged. Use existing Three.js capabilities, no new dependency or copied game assets. Ambient wildlife is decorative and pausable; it does not introduce chores, scores or learning requirements. Keep wide-camera access and reduced-motion support.

**Impact.** The earlier open question about whether the owner wants the playable world direction is resolved affirmatively. Detailed art and feel can continue to improve under this instruction; no additional permission round is needed for this polish pass. No migration.

## ATHENA-PLAYABLE-WORLD-2026-10-08 — Actual exploration and two ways in

**U — Owner correction.** The illustrated Village/Trail/Fieldnotes previews are not approved as the desired experience. The owner explicitly wants a bounded actual game world: an avatar that explores, enterable buildings, and physically present NPC guides such as Sam. Roblox/Minecraft were references for exploration, not a request to copy their assets. Offer immersive and efficient modes at the beginning. The prior village could inform efficient access but needs more distinctive craft and texture.

**Impact.** This supersedes interpretations of “gamified” as a single backdrop plus hotspot cards, and earlier exclusions of an actual game implementation. Both modes must expose the same learning support and parent-controlled path; neither is an inferior feature tier. Scope stays ages 0–6, resource-first, with no original activity generation. Existing production, providers, accounts and family data are preserved.

**H — Bounded implementation choice.** An isolated Three.js playable slice at `/auth/prototypes/athena-world` adds a renderer dependency, procedural geometry/materials, walking, collision, pathfinding, furnished interiors and NPC interactions. This is the smallest concrete demonstration of the new requirement, not a replacement stack or a live product migration. Existing prototypes remain for comparison. No new third-party art is copied.

**O — Still open.** Owner acceptance of the world art, character style and controls; full resource/voice/persistence integration; production performance and accessibility across real devices. The first playable slice uses clearly identified scripted dialogue and synthetic plan state. Approval of the request does not certify the rendering or educational content.

## ATHENA-EMIL-DESIGN-PREVIEW-2026-10-08 — Authorized skills review and isolated UI work

**U — Owner request.** Review all skills in emilkowalski/skills, apply relevant UI/animation/prototyping/checking guidance and start creating and testing the required experience.

**Implementation boundary.** Three isolated town-square/daily-board previews were created using the approved Athena PRD. No production navigation, provider, auth policy, database or family record changed. The 14 main skills match installed copies after line-ending normalization. `docs/ATHENA_EMIL_SKILLS_REVIEW.md` records applicability, provenance, screenshots and actual verification. No migration applies.

**O — Owner visual choice.** Village, Trail and Fieldnotes are alternatives, not approved production designs. Technical spec remains draft; the full reset audit and live resource/voice integration remain open. The prototype uses synthetic data and temporary local UI state.

## ATHENA-TAVILY-INTEGRATION-2026-10-07 — Authorized bounded application integration

**U — Explicit authorization.** The owner answered "Yes, please do that" to adding Tavily search and extraction to Athena. This authorizes this bounded integration despite the overall technical spec remaining draft, not the full rebuild or deployment.

**Implementation boundary.** Added a server-only REST provider and a staged authenticated/disclosure-gated endpoint. CLI OAuth is not copied into app credentials. Public search and extraction passed through the application provider in explicit keyless mode. The endpoint stays disabled by default until disclosure UI and durable usage controls are integrated; no saved plan or family data changed. `docs/ATHENA_TAVILY.md` records configuration and evidence limits.

## ATHENA-PRD-APPROVAL-2026-10-07 — Broader evidence, no NCERT organizing basis

**U — Owner correction and approval.** The owner requested no NCERT focus and broader domain research, adding "except for that everything else is fine." Record the other consolidated PRD proposals as approved without requiring another sign-off. Removed NCERT as P1's organizing rationale and marked the PRD approved with this exception recorded. This supersedes the pending status in ATHENA-CONSOLIDATED-PRD below.

**V/H — Replacement research.** Consulted primary Head Start ELOF, NAEYC, UNICEF and WHO material; links and limitations appear in P1. These are broader inputs, not endorsements, automatic curricula or a completed age-specific evidence map. Keep the accepted town navigation while researching coverage across developmental domains. Final domain-to-resource mapping and rendered artwork are not certified by PRD approval.

**Impact.** Continue technical planning and refreshed alignment work against the approved resource-first product. No application or live-data change in this documentation revision.

## ATHENA-CONSOLIDATED-PRD-2026-10-07 — Defaults proposed for one review

**U — Process authorization.** The owner asked the agent to go ahead after the offer to consolidate requirements and develop remaining proposals for review together. This authorizes drafting, not automatic approval of new behavior.

**H — Pending proposals.** `devpost/prd.md` now includes P1–P8: five building categories; a green/ivory/teal/gold illustrated-town direction; resource quality and coverage gates; unavailable/untried handling; editable speech input and opt-in short audio; visible correctable memory; future-path preview and reversal; failure handling. These are explicitly proposals, not owner decisions. The document remains draft.

**V — Limited framework research.** NCERT's 2022 foundational framework and WHO's Nurturing Care Framework inform proposed categorization, with links in the PRD. Their age ranges/purposes differ; this is not resource validation or evidence for a progression algorithm.

**Status.** Planning only. Existing October 1 G0 audit read; it predates the reset and must be reconciled before implementation. No code, provider, database or live-data changes made by this consolidation.

## ATHENA-VOICE-FALLBACK-2026-10-07 — Typing fallback and conversational retry

**U — Explicit owner decision.** Voice remains the primary interaction. If the parent cannot use a microphone, provide a bar where they can type an answer, with a helpful prompt. If Athena does not understand the speech, respond conversationally, for example, "I didn't quite get that. Could you repeat it?" Repeated difficulty after roughly two or three attempts should trigger additional prompting rather than an endless retry loop.

**U — Subsequent clarification confirmed.** The owner explicitly confirmed that after two or three unsuccessful voice attempts Athena should invite the parent to type instead. This resolves the earlier ambiguity in "microphone prompting." Offer the typing bar without requiring further microphone retries. The exact choice of two versus three attempts is an implementation detail within the approved range, not another interview blocker.

**Impact and status.** Resolves availability of non-voice input without making typing mandatory in the normal flow. Applies to guide conversation and reflection. Record failed/unclear input as unresolved, not as a confirmed preference or plan-changing instruction. Product requirement only; no speech-provider capability or working implementation claimed.

## ATHENA-FREE-FIRST-RESOURCES-2026-10-07 — Free core resources, optional paid exploration

**U — Explicit owner decision.** Provide resources usable without payment as the normal recommendation and learning-path offering. Paid/subscription resources may be suggested as optional opportunities: explain that the resource exists, offer help exploring it, and discuss the pros and cons of purchasing a subscription. The parent decides whether to purchase; paid resources must not become required to continue the regular path.

**Impact.** Clearly distinguish free access, limited free access/free trials and paid access. A trial requiring later payment is not an unqualified free resource. Explain relevant price/renewal terms, access limitations, advantages and disadvantages from checked source information, with uncertainty where facts cannot be verified. Keep the core recommendations free-first; do not silently fill gaps with required paid content. This decision does not authorize purchases, subscription enrollment, payment handling or access to a parent's third-party account.

**Status.** Resource policy resolved for the PRD; no particular subscription is endorsed or researched by this record, and no application change is claimed.

## ATHENA-PROGRESSION-CHOICE-2026-10-07 — Replace or advance after an unsuitable resource

**U — Explicit owner decision.** Following an attempted resource and reflection that it was unsuitable, offer the parent a choice: obtain a replacement at the same level or continue to the next level. Do not require successful child performance or a mandatory replacement to advance. This resolves the unsuitable-attempt progression question in ATHENA-REFLECTION-CONFIRMATION.

**Impact.** Keep progression separate from preference interpretation and adoption of a lasting recommended direction. Advancing alone does not establish a general dislike or prove a developmental achievement. The situation where a resource was never accessible or never tried remains a distinct exception to specify. Saved a first `devpost/prd.md` draft incorporating the interview; remaining product questions are explicitly open, not approved defaults.

**Status.** Recorded requirement only; no code or live data changed.

## ATHENA-REFLECTION-CONFIRMATION-2026-10-07 — Confirm interpretation before proposing adaptation

**U — Explicit owner decision.** Following a reflection, Athena should briefly state its understanding and ask the parent to confirm or correct it. This includes feedback that the presentation did not suit the parent or the child did not respond well. Athena must understand the context rather than silently concluding that the family dislikes a format or that the child lacks an ability.

**U — Follow-up and scope.** After confirming the interpretation, propose a concrete adjustment and ask whether it should apply going forward. Explicitly allow the parent to explain that the experience was a one-time occurrence. The interaction should be intelligent, intuitive and sensitive to the possibilities, rather than automatically generalizing negative feedback. Carry forward the two-path choice and persistent-direction decisions: confirming an interpretation is not itself accepting a new plan.

**Impact.** The requirements flow is reported reflection → concise interpretation for confirmation/correction → clarify session-specific versus ongoing meaning where ambiguous → proposed adjustment with visible future impact → parent choice of existing or recommended route. Combine conversational steps when the parent already clearly supplied the needed information; do not turn these distinctions into repetitive mandatory questions. Preserve unanswered interpretations as tentative and retain the original report.

**O — Remaining progression detail.** This answer establishes how to handle feedback and adaptation, but does not explicitly establish whether an unsuitable attempted resource completes its level, is replaced within the level, or opens another level. Keep that progression rule open in the PRD rather than treating negative feedback as failure or inventing a gate.

**Status.** Product interview requirement recorded, not implemented behavior or tested evidence.

## ATHENA-PREFERENCE-CLARIFICATION-2026-10-07 — Ask before generalizing feedback

**U — Explicit owner decision.** Athena must recognize when feedback could apply either to the particular session/resource in a core module or to a general preference. It should proactively ask which meaning the parent intends. For example, after "this video was too long," ask whether that concerns this session or whether the parent generally prefers shorter videos. The parent decides the scope; Athena must not silently generalize the observation into a lasting preference.

**Impact.** Preserve session feedback as reported. Only treat it as a general preference after the parent confirms that interpretation. If clarification is unanswered, do not establish a general preference. Confirmed preferences inform subsequent recommended paths; they do not bypass the parent's choice to adopt a plan change. Avoid repeatedly asking about preferences already explicitly established unless new feedback creates genuine ambiguity. Preference correction/forgetting and precise UI remain to be specified in the PRD.

**Status.** Recorded product behavior for the requirements draft; no implementation or test result claimed.

## ATHENA-PERSISTENT-PATH-DIRECTION-2026-10-07 — Accepted recommendations steer future resources

**U — Explicit owner decision.** Choosing the recommended path changes the ongoing direction, including future plans and resources; it is not merely a one-resource substitution. Visually explain the change in direction so the parent can understand where the path is heading. Athena should remember what the parent needs and prefers and use that context in later recommendations.

**U — Two kinds of pathway.** The owner describes a deterministic/general pathway informed by typical patterns ("averages and stuff") and a unique pathway for each family that develops over time. Read together with ATHENA-TWO-PATHS: show the existing planned route alongside the recommended alternative; recommendations do not become the active direction without the parent's choice. A chosen direction influences subsequent selection, rather than requiring replacement of every future item regardless of relevance.

**O — Evidence and memory semantics.** Research must establish any age-related/general progression used in the baseline; the reference to averages does not establish a dataset, validated developmental norm or a standard children must match. No diagnostic rank or promise of a single correct developmental route follows. Distinguish explicit parent choices, reported child observations and tentative inferred preferences. How inferred preferences are confirmed, corrected and forgotten remains to be specified. The general baseline, current active personalized route and new recommendation must be visually distinguishable; exact presentation and reversal behavior remain open.

**Impact and status.** Resolves the duration of adopting an alternative: persistent future direction. Develop visual comparison and memory controls in the PRD. This records requirements only; no model training, implementation, provider change or live-data mutation is claimed.

## ATHENA-TWO-PATHS-2026-10-07 — Parent chooses whether to adopt recommendations

**U — Explicit owner decision.** Whenever Athena recommends a change, present two paths: the predetermined path already being followed and the recommended alternative. The parent can choose the recommendation or continue the existing path. A recommendation alone must not replace the active plan. This resolves the adaptation-permission question in the approved scope.

**Rationale and impact.** Adaptation should offer useful guidance while preserving the parent's choice and continuity. The PRD must distinguish the current path from a proposed alternative and make switching explicit. This is two choices at a recommendation point, not authorization to maintain two simultaneous active schedules. The extent of a switch, treatment of later recommendations and reversal behavior remain to be specified. An unavailable or unsuitable source must not be represented as usable merely because it appears on the original path; exception handling remains open.

**Status.** Product interview decision recorded; no implementation claim or application change.

## ATHENA-SCOPE-APPROVED-2026-10-07 — Owner approves consolidated direction

**U — Approval.** In response to the complete Athena scope, the owner said, "No, this works well now." `devpost/scope.md` is now approved. This confirms the resource-first, India-first, ages 0–6 product; the illustrated town and visual-quality requirement; English voice input; the proposed ten foreign resource languages plus English; and the daily resource/use/reflection loop. It supersedes conflicting historical product scope, including authored activities as the delivery center.

**Impact and limits.** Proceed to the product-requirements stage using the existing interview answers. Exact visual design, sourcing standards, adaptation permissions, progression exceptions and other explicitly open details remain unresolved. Approval does not certify implementation or authorize destructive changes, provider migration or live-data changes. Preserve the existing repository and reconcile implementation with this direction before coding. No second scope sign-off is needed.

## ATHENA-VISUAL-QUALITY-2026-10-07 — Graphics are a core product requirement

**U — Explicit owner emphasis.** The gamified graphics must be well developed and beautifully executed because they are a key attraction of Athena. This applies across the full experience, not only the landing page or mascot. Treat the illustrated town, characters, transitions and resource presentation as core acceptance requirements alongside functional resource discovery, voice and adaptation.

**Impact and rationale.** A generic dashboard, placeholder game icons or a promise of future visual polish does not meet the requested product. Concrete visual previews must turn this quality direction into reviewable designs. Exact palette/assets remain open; this statement is not approval of a particular design or implementation.

**Planning status.** The owner requested the complete consolidated scope. Saved `devpost/scope.md` as draft for review; existing source and code are not rewritten by this draft. No implementation, tests or new delivery date are claimed.

## ATHENA-LAUNCH-COVERAGE-2026-10-07 — India, early years and eleven resource languages

**U — Latest owner scope.** Start with India and foundational development for ages 0–6. This supersedes the intervening exploration of support through age 18, curriculum-wide subject teaching and teenage accounts. Those are deferred; teenage privacy and parent oversight were not settled. Voice input is English for the first release. Record the languages actually spoken around the child, without assuming parental fluency. Indian home-language resource libraries are not the initial language-library priority.

**U — Language coverage.** Offer ten popular foreign-language resource categories, excluding English and Hindi from that count, plus English as the eleventh. The owner specifically names Chinese, Japanese, French, Spanish and potentially German, and welcomes later expansion. This is resource-discovery coverage, not eleven voice-input languages, proven learning efficacy or a requirement for a child to study every language. Resources should support caregivers who do not themselves speak the selected language.

**V — Research checked 7 October 2026.** The [2025 Duolingo Language Report](https://blog.duolingo.com/2025-duolingo-language-report/) lists English, Spanish, French, Japanese, German, Korean, Italian, Chinese, Portuguese and Hindi as its global top ten. It excludes learners under 13 and measures its own platform, so it cannot establish early-years suitability or the world's definitive top ten after exclusions. [Little Pim](https://www.littlepim.com/) advertises resources in all of the proposed languages below; this is evidence of commercial resource availability, not independent validation, free availability or permission to embed its content.

**H — Proposed launch set, pending owner review.** Mandarin Chinese, Japanese, French, Spanish, German, Korean, Italian, Portuguese, Arabic and Russian; English separately. Eight foreign-language choices appear in the report's top ten; Arabic and Russian are practical additions with existing children's resources, not asserted global ranks nine and ten. Label language varieties per actual resource, including Mandarin, Portuguese varieties and Arabic varieties. A modest 'More languages later' label may indicate expansion without promising dates. Actual age fit, access from India, content inspection, pricing, rights and caregiver guidance still need resource-by-resource checks.

**U — Resolved pacing.** The owner clarified that progression follows an opportunity to use a resource with the child and reflect, rather than an arbitrary timer. Parents may request more resources in the same area; the planner can gently suggest another foundational area today or tomorrow without enforcing a switch. This supersedes the unresolved meaning of 'time limit' in RESOURCE-LESSONS-AND-PACING below. Exact completion and unsuitable-resource handling still require a concrete behavior specification.

**Impact and status.** Updates intended coverage in source sections 3, 6 and 9 and the current interview records. Rationale: focus the product on useful early-years resources while avoiding the complexity of all-age curricula. These are planning records, not implementation claims. No application, migration, provider or live-data changes made; consolidate the revised scope for owner review before implementation.

## RESOURCE-LESSONS-AND-PACING-2026-10-07 — Guided resource consumption and progression

**U — Owner-described resource journey.** Selecting a resource starts a short lesson-entry animation or transition inspired by Duolingo. Present the video or reading on screen. Reading should use smooth, approachable interactive presentation consistent with the game world. After a video ends, Athena or the building guide appears and explains a concise, source-grounded summary and what the parent could do next. Provide the equivalent guided conclusion for other resource formats. Exact lawful embedding/display options, content access and fallback behavior require research; this direction does not establish rights to reproduce third-party material or access to its full contents.

**U — Progression.** Show an ordered resource path with visible levels, inspired by Duolingo/Candy Crush. Initial age/context and subsequent feedback inform the developmental topics and resource progression. The owner wants completion, understanding and feedback about use before advancing to the next level. A pacing/time constraint should discourage racing through the path; the exact meaning of that constraint remains unresolved. Parents can still request additional resources from the building guide. The owner reiterates that the experience is child-first through the parent.

**O — Consequential details to settle.** Does pacing mean a calendar delay, a real-world try-and-reflect step, or another rule? What constitutes understanding, what happens if the child declines or the parent cannot try the resource, and how can a mismatched starting level be corrected? Is progression separate per building? Do not implement a timer, quiz, forced child participation, or a developmental score from these unanswered points. Proposed interpretation for owner review: levels describe the parent's resource journey and topics explored, not measured developmental attainment in the child. Age and parent reports guide recommendations without establishing a diagnosis or validated developmental rank.

**Status:** Recorded interview direction; no implementation or full-plan approval claimed. Continue defining the progression contract before consolidating the revised product plan.

## ATHENA-NAME-AND-DIALOGUE-2026-10-06 — Product rename and guide interaction

**U — Explicit owner decision.** The product is now named **Athena**, after the Greek goddess of wisdom. This supersedes MIRA as the current product name. The owner associates the name with providing wisdom and a female guiding character. The previously proposed starfish remains a possible representation; exact character design remains undecided. Historical MIRA filenames and records are retained during discovery for continuity, not as competing product names. Apply the Athena name throughout the redesigned product and consolidated specification; technical identifier/domain changes require a concrete migration plan rather than a blind text replacement.

**U — Dialogue behavior.** Parents speak their requests. Guides primarily respond through concise on-screen dialogue, presented as a lightly animated, older-game NPC interaction. The experience should feel personable with a clear distinction between the fictional guide and a real person. A very short spoken paraphrase may accompany the longer on-screen reply, but was suggested tentatively; voice-output default and controls remain open. Do not assume a fully spoken real-time conversation. Follow-up happens through an explicit dialogue action between turns, not required mid-speech interruption.

**U — Resource presentation.** Resources require substantial visual previews/thumbnails of the actual resource, not merely small text cards. Selecting a resource opens its resource experience or associated level inside the building. Exact behavior for in-app presentation versus opening the source is unresolved and is the next discovery question. Do not invent thumbnails that misrepresent a source or assume permission to embed third-party content.

**Status and impact:** Product/name and interaction direction recorded; implementation and full source-of-truth consolidation pending the ongoing owner interview and confirmed plan. No code, provider settings, database identifiers or live content changed by this record.

## GUIDED-TOWN-EXPERIENCE-2026-10-06 — Owner-described experience; detailed design pending

**U — Explicit owner direction during the reset interview.** The parent/caregiver is the user and player. Build a welcoming, lightly gamified resource-finding experience inspired by Duolingo and Brilliant, with an illustrated town, small buildings, a parental avatar, a guiding starfish mascot and expressive characters. Target the visual maturity of adults around 30–35; do not make it a child-facing game. The owner asks the agent to propose the palette: warm and calm, distinctive, excluding red/pink as the main direction. Exact palette, character names, mascot color, building names and illustration treatment are not yet selected. Disney-like charm is a mood reference, not a request to copy existing characters or assets.

**First use:** A very short, animated, guided preference flow precedes account connection. Child age, caregiver expectations/developmental priorities and languages around the child are named inputs. Do not ask what the family can afford. Location, education experience/qualifications and time were mentioned while thinking aloud; their necessity and placement remain unconfirmed. The owner explicitly shortened the form and withdrew proposed questions about affordability and daily learning. Do not turn the conversation into an approved long questionnaire or a child assessment.

**Town and first day:** Enter a town square with a prominent daily board. Day one introduces the app and lets the parent choose a developmental focus, then a visual path guides them to its building. The nine prior domains are a reference to investigate, not a confirmed evidence-backed taxonomy. Keep internal timestamps and implementation detail out of the main experience. Settings provide relevant controls. The town should be navigable on phone and desktop without complex graphics becoming the core project.

**Building/resource experience:** A character represents the guide for a domain; an NPC-style dialogue offers today's resource options and a conversation with that guide. Videos, links and documents appear as recognizable, visually organized resources, potentially folders on a desk. Resource detail uses the same coherent palette. Provide choices, not a fixed quota of original activities. Character names such as Mr. Sam are examples. Brief contextual questions may occur on the first visit and should not be repeatedly asked. Exact questions, navigation shortcuts and returning-user behavior need discovery.

**Voice is current scope:** The owner explicitly requires good voice input now for guide requests and reflection; do not defer it for budget reasons. A clear Start Speaking control and subtle character expressions should make interaction straightforward. Use a capable model to understand the request and obtain relevant existing resources. No mandatory typed interaction in the core conversational flows. Whether guides also speak, how voice turns end, languages, transcription corrections, permissions and fallback access remain to be defined. Character roles do not themselves select a multi-agent architecture or any provider.

**Resource-based progress and adaptation:** Levels may organize resources. Derive three or four concise suggestions/checklist items from inspected resource content with traceable sources; this does not reauthorize original MIRA activity invention. On return, invite a spoken reflection about whether the resource was used, what was helpful/unhelpful and what the parent observed in the child. Use a guided interview and combine reflections/observations to improve later resources and plans. Tests were floated and reconsidered; they are not an approved requirement. Completion/progression rules, optionality and how changes are accepted remain open; no child ability scoring is authorized.

**Status:** Interview evidence only. This records explicit direction and unresolved examples without certifying a complete approved scope, UI design, technical specification or implementation. Continue the requested skill-led discovery and present the consolidated plan/source revision for owner confirmation. No code, live data or model-provider configuration changed by this entry.

## RESOURCE-FIRST-RESET-2026-10-06 — Owner-directed product correction; discovery in progress

**U — Explicit owner decision, 6 October 2026.** MIRA's current product direction is an intuitive, agentic homeschooling resource finder and adaptive resource planner. Discover and link to existing online resources; help caregivers understand and use them. Remove MIRA-authored activities as a product component and remove independent review of those authored activities as a prerequisite for delivering this resource-finding experience. Original activity creation may be reconsidered only as a separately approved future direction. The reviewer outreach package is historical work, not the current delivery dependency.

Preserve the useful mapping from parent/caregiver/guardian expectations to a child's learning plan. Show a daily learning focus and relevant existing resources, with clear thumbnails, destination links, concise explanations and source attribution. Help the adult understand resources through grounded summaries/explanations; the requested meaning and scope of video understanding remain to be clarified. Combine caregiver reflections and reported child responses to improve later resource choices and planning. Do not invent outcomes, sources or resource contents.

The owner requests a minimal, intuitive interface with little text and no unnecessary jargon. Core resource discovery, helpful recommendations, comprehension support and adaptive planning take priority over further peripheral login polish. Aim for a useful, complete product experience; do not silently reduce the target to a disposable hackathon proof of concept. Be efficient with Codex work while pursuing quality; the complaint concerns Codex usage and wasted development effort, not just runtime API costs.

**Rationale:** The owner rejects the usefulness and relevance of the authored activities and the delay created by their review workflow. The original user need is access to existing educational resources for people who cannot themselves orchestrate technical AI tools.

**Impact:** Supersedes conflicting current-delivery assumptions in source sections 3, 7–11, 15 and 18, and earlier activity-publication/reviewer sequencing. This does not assert that the correction is implemented. Existing source distinctions remain: a broad WHO or other evidence framework must not be presented as endorsement or validation of each linked resource. The owner requests plain communication of limitations of medical expertise; precise wording and source-selection rules remain product discovery work.

**Next process:** Use the requested Build With AI Basics skills in order, adapting their introductory scope to this explicit product reset. Interview the owner on the full experience; research consequential uncertainties and technical options; present revised scope, product requirements and source-of-truth changes for confirmation before implementation. No app code, database, provider configuration or live family data is changed by this decision record. Removal/migration strategy and verification are to be specified after inspecting the implementation against the confirmed replacement experience. Do not resume the prior activity sequence.

**Open:** First-use journey and onboarding burden; initial age/curriculum/geographic/language coverage; resource types and free/paid availability; discovery versus curated catalog behavior; plan structure and adaptation permissions; AI interactions including video support; visual design; search/content APIs and evidence framework; delivery acceptance criteria. ML models, datasets and providers are not selected by this record.

## UNDERSTANDING-OVERVIEW-2026-10-02 — Separate saved choices, planning use and observations

The owner explicitly approved a readable family learning summary with separate saved-choice, planning-use and observation sections, direct correction links and unanswered values kept unknown. This extends source sections 5.1/5.6, 6.4 and 18.3/18.7 within the existing What MIRA understands page; it is not approval to invent an AI inference store or claim the whole Family Education Constitution is complete.

Read existing profile, explicit hope links, language environments, caregiver descriptions and recorded dates through one current-member/active-child-bound projection. Exclude journal content, private author IDs and inferred abilities. No new summary is persisted and no data is sent to a model. Explain actual planner use, including the current limitation that preferred rhythm and everyday-learning preferences do not yet change the mix. Paused/future language reports stay visible without being portrayed as lessons or measured exposure. Distinguish caregiver descriptions from account access.

Use existing checked correction workflows, not duplicate forms or inferred defaults. Read failures withhold the saved-choice view and provide a real reload/Family route. Migration 018 is an additive read-only function, applied through the owner-authorized dashboard; no existing profile, plan, language context or observation is rewritten. Global design and AI permissions remain unchanged. Full agreement fields, correction/forget of derived AI state, independent content review and release operations remain separate unfinished work.

## LEARNING-DIRECTIONS-2026-10-02 — Explicit hopes influence new plans

Implementation of the source's parent-controlled aspiration/capability/enrichment distinction: preserve free-text hopes and let a parent optionally link each to canonical opportunities, with a now/future/paused horizon. Do not infer those links from wording or treat them as measured child abilities. Family is the optional editing location for this increment; the unanswered question about also offering it during initial setup remains open, not an owner approval.

Only current explicit links can influence newly generated weeks, and only through associations inside the exact reviewed activity publication context. Keep eligibility gates first and weekly variety ahead of direction matching, then exact-version repetition evidence and preparation preferences. Future/paused links remain visible without adding tasks. Persist the selected hope/opportunity in a new plan's explanation; subsequent profile edits never rewrite old plans. These ordering choices are transparent heuristics, not proven optimal developmental prescriptions.

Migration 017 adds version-checked member reads/editor writes, a current-choice export, and directions in the setup snapshot fingerprint. Clearing retains revision metadata but not the old direction value; removing a hope cascades its current link, not historical plan text. It enables no AI and publishes nothing. Applied directly through the open MIRA Supabase dashboard under MIGRATION-OPERATIONS authorization. Installation and disposable-family save/reload/stale/clear paths are verified. Local synthetic reviewed fixtures demonstrate the ranking change; genuine recommendations still require independent review and separate publication.

## MIGRATION-OPERATIONS-2026-10-02 — Apply scoped migrations directly

The owner explicitly authorized using the already-open MIRA Supabase dashboard to apply future migrations instead of asking them to execute each file. Verify the project and migration state before execution, inspect/test each migration, record actual results, and do not rerun completed migrations. This authorization covers migrations within agreed MIRA development; it does not authorize destructive changes, unrelated account/provider settings or changing existing family plans. Migration 016 was already reported applied by the owner and must not be rerun. Source sections 0.3, 12.5 and 17 remain in force.

## LEARNING-PROFILE-CHECKED-2026-10-02 — Keep a loaded profile bound to its saved version

Implements source sections 5.1, 6, 12.4–12.5 and 18.7 within existing setup. Read one coherent profile snapshot; require its exact version on save, under a shared family lock and current role checks. Include current language context and child update version so an older setup tab cannot erase newer Family choices or survive archive/restore. Existing identity-preserving writer remains internal; app callers use only the checked path. Migration 016 is owner-confirmed and hosted save/stale/reload verified; no existing plans were changed.

Keep failed/uncertain drafts visible and text selectable, offer comparison before explicit discard/reload, and distinguish a confirmed profile save from an unconfirmed first week. No new collected fields, language assumptions, model transfer or automatic plan replacement. Saved hopes are still not ranking inputs; do not describe this reliability increment as completing personalized planning or the Family Education Constitution.

## JOURNAL-CORRECTION-2026-10-02 — Parent-controlled corrections and removal

Owner explicitly approved prefilled everyday-note editing, stale-save protection and removal from the active journal without claiming immediate erasure from backups. Migration 015 was confirmed applied after 014. This implements source sections 5.5, 12.4–12.5, 14 and 18.7 within the existing journal, not a new AI memory feature. Original author/creation time and exact parent wording are preserved on correction; the displayed current text changes without a user-facing edit history. Existing plans stay unchanged.

Both edits and removal require the exact database timestamp, current child and current owner/caregiver permission. Any row update advances that timestamp. The old unchecked deletion endpoint is closed. A removed note retains the existing private creation-retry tombstone to prevent delayed recreation; it is not an anonymization or all-system-erasure guarantee. Uncertain/stale results keep the draft on the page and ask the parent to compare the saved journal before reloading. No AI call is involved, and journal notes are not currently used by the planner or Guide.

Owner initially reported both 014 and 015 applied. Hosted browser checks exercised 015 successfully; creation returned PGRST202. The owner then clarified 014 had not been run and applied it. The scoped hosted additional-child concurrent/replay checks subsequently passed, with one retained synthetic child, prior selection restored and unchanged existing plans/instances. First-family hosted verification remains separate. No fallback through old endpoints was used.

## REVIEW-HANDOFF-2026-10-02 — Complete activity packets inside Research

Owner explicitly confirmed keeping each activity's instructions, source records and blank review form together in Library → Research. Extend the existing owner-only development review area with the seven current complete candidates, not a new top-level module or a family recommendation feed. Proposed ages remain unapproved. Family-owner access permits inspecting/exporting drafts, not independent review or editorial publication. This implements source sections 9.2–9.4 and 18.3 without changing their release gates.

Use a static, server-only candidate allowlist and exact source-batch validation. Preserve the original foundation fingerprints and separate expansion compiler/preflight; bind later authoring sources without rewriting generation history. Offer a readable Markdown worksheet, exact candidate/source JSON and an unanswered review response for the same version. No private completed reviewer records, family data, dynamic filesystem paths, provider calls or publication actions are introduced. Owner/caregiver/viewer route and UI boundaries are tested separately. Existing plans and activity content stay unchanged; no migration is needed.

## CREATION-RETRY-2026-10-02 — Recover a save without duplicating a profile

Implementation of source sections 6.1 and 12.5 within the existing family model: first-family/add-child saves receive a random, caller-bound request ID. Exact retries recover the saved ID without overwriting later edits or switching a later active child; changed payloads cannot reuse a successful request. The existing single-family-per-user index remains the final membership boundary. Additional children use the shared family day; initial setup explicitly uses UTC until the owner chooses a setting. No precise birthday or new age-coverage promise is introduced.

Migration 014 adds private salted-digest receipts rather than another copy of names. Child/family removal leaves a null-ID tombstone so delayed retries do not recreate it; account deletion cascades receipts. These are still sensitive metadata, not anonymized records; release retention/deletion policy remains unresolved. Old creation endpoints/direct app-role inserts are closed. Existing records are untouched. The owner later clarified and completed 014; hosted additional-child concurrent/replay checks now pass (see JOURNAL-CORRECTION above).

The two creation forms share one implementation and preserve drafts on validation/transport errors. Confirmation leads to the saved record/preferences; uncertain outcomes offer same-request retry or checking Family. This changes recovery behavior under the already-adopted reliability contract, not onboarding data collection, provider processing, content approval or pilot scope.

## PROFILE-CORRECTION-2026-10-02 — Exact versions and family-local birth context

Implementation of adopted source sections 5.4, 12.4–12.5 and the approved shared family calendar: child corrections require the exact saved timestamp, with database microseconds preserved. Every subsequent child update advances that version; archived profiles cannot be edited, and archive/restore cannot revive an old form. The unchecked correction endpoint is no longer callable by app roles. No exact birthday is inferred, and no existing records/plans are rewritten by applying migration 013 (owner confirmed application).

Future birth months are rejected using the family date. Existing historical profile capture range remains unchanged; that range is not a promise of reviewed activity coverage. Failed calendar reads do not silently choose a date. The UI retains drafts and offers comparison with the saved version before a fresh correction. This is reliability hardening within the adopted contract, not a new age-scope, identity-collection, AI or publishing decision. First-family and additional-child creation still need their separate retry/date hardening.

## CALENDAR-2026-10-02 — Shared owner-selected family time zone

- Authority: explicit owner reply, “Yes, shared family time zone,” to the Settings proposal on 2 October 2026.
- Decision: one shared family calendar, chosen by the family owner. No selection means an explicitly labelled UTC fallback, not an inferred location or browser preference. All caregivers see the same day; changing the setting never moves existing scheduled activities or journal dates.
- Rationale: Today, new-week generation, library checks and journal date limits previously used a mix of app-server and database/UTC dates. A family may cross midnight before either server does. Source sections 5.2, 7.2, 12.5 and 17 apply; no missing requirement IDs are invented.
- Implementation: protected `family_calendar_settings`, owner-only revision-checked setter, authorized calendar read and private date helpers in migration `202610020012_family_calendar.sql`; owner confirmed application. Explicit calendar dates flow to Today, Library, activity context and Guide. Journal instant display/sorting uses the shared zone, while entered dates remain date-only. Export v7 includes the current setting with an explicit historical limitation.
- Boundaries: editorial review expiry and rolling AI allowance clocks remain separate; no review extension, automatic reschedule, content publication, location collection or AI enablement. The time-zone selector is a native labelled control in the approved Settings design. Independent content review and pilot readiness remain unresolved.

## AUTHORING-SOURCE-PROVENANCE-2026-10-02 — Later research is not a rewritten AI history

Source sections 9.2–9.4, 11.3 and 12.5 require material/context and evidence review of the **completed** activity. The initial generation prompt need not already contain every later authoring source. A strictly validated supplement now binds additional source records to an exact base package and assessable primitive. The generation record, primitive fingerprint and original efficacy claims remain unchanged; the final authoring package receives a new fingerprint. Foundation packages without a supplement retain their exact prior format/fingerprints.

Later material/context sources must be independently appraised, not merely linked in author notes. Complete-template review requires their exact source fingerprints, reviewer, access, dates, rights and limitations. Publication transport includes them and the existing database checks each supplied source, including due dates. This is a provenance correction within the approved content workflow, not approval of sources, exact materials or reviewer identities. No new family access, model payload, runtime model configuration or data collection is introduced.

Migration 202610020011 preserves three existing descriptive source labels and explicitly maps them to `practice_explanation`; it does not recast educator guidance as experimental research or expert consensus. Unknown types still fail. The function patch checks the expected existing definition, supports an unchanged replay, preserves editorial permissions and mutates no content/family rows. The owner confirmed hosted application on 2 October 2026; no live positive publication or classifier-definition inspection is inferred.

The complete mark-making candidate proposes 48–71 months and bounded paper/crayon use. Age, timing, labels, physical/material boundaries and context checks remain author proposals awaiting qualified exact-version review. US material-label guidance is not adopted as Indian product certification. The owner has not arranged the independent reviewer or separate editor; no material, activity or release approval is inferred.

## RESEARCH-BATCH-ISOLATION-2026-10-02 — Broader concepts without rewriting reviewed targets

Implementation consequence of the owner's existing research-library request and source sections 9, 11.3, 13 and 15: expand editorial research in a separate, explicitly selected local batch. Preserve the foundation catalog, prompts, checkpoint and six complete candidates. Compiler/catalog/prompt and review fingerprints bind each batch; one batch's response cannot authorize another. This does not change product age scope, planner eligibility, runtime provider configuration, family transfers or publication permissions.

The initial expansion covers movement, rhythm, mark-making and arrangements at the **unapproved primitive** stage. Practice guidance is not converted into causal evidence or exact age/material approval. WHO's under-five movement overview remains background with no draft claim link; full guideline access failed. Harvard's guide caveat and NAEYC's classroom/practice context are recorded; older bilingual-benefit claims, tool scarcity and hazardous example materials are not adopted. No new institutional endorsement is claimed.

Real Nebius output exposed child-directed prose and incomplete sentences despite valid JSON. The separate compiler now has explicit adult-facing and complete-sentence checks, alongside the existing source-ID and opt-out constraints. These are bounded failure-mode guards, not semantic/safety certification. Exact rejected outputs are retained, not silently repaired or repeatedly regenerated. Both independent reviewer and editor remain unarranged; no new approval, content publication or family use is authorized by these artifacts.

## WEEK-LANGUAGE-CONTEXT-2026-10-02 — Current family communication beside the saved week

The owner explicitly approved a **separate, compact** “Languages in everyday life” section in Week. It presents current parent-reported people and moments, not new lessons or exposure targets. This extends source sections 5.3, 7.2 and 10 and the existing Spatial Workspace, without claiming a complete multilingual planning engine.

Only active/maintenance environments with an explicitly comfortable speaker, regular/occasional contact and at least one stated context appear. Unknown/future/paused/contradictory future-role contexts remain in Family; no proficiency, support, availability or routine is inferred. The person's original label and routine text are preserved, escaped and direction-aware. These are unreviewed parent notes, not material-safety approval or MIRA activity recommendations. One language disclosure at a time and an outer disclosure keep up to 40 entries manageable without ranking one language above another.

The section is a current read, clearly separate from the selected saved plan, including historical weeks. It never backfills snapshots or rewrites activities. Family saves invalidate Week's route for subsequent reads; this is not push synchronization across already-open tabs. Linked caregivers are checked against the authorized family; read failures are distinct from an empty list and do not hide the saved plan. No new AI payload, database migration, schedule, quota or content publication is introduced. Viewers receive an inspection link, not an edit invitation.

Browser testing found saved Week was incorrectly redirected to setup when family preferences were absent. It now remains readable; the ordinary new-plan button is withheld until setup exists and an explicit setup link is provided. The database's hard eligibility checks remain unchanged. Retained historical child records and plans are not implicitly repaired or deleted.

## PORTFOLIO-FIDELITY-2026-10-02 — Remove a language quota and domain-wide inference

Authority: adopted source sections 5.1, 7.2, 8.1–8.5 and 10, plus the owner's continuing instruction to correct the core implementation without changing existing plans. Inspection found a fixed Thursday language slot and engagement aggregated across entire domains. Neither reflects an actual family communication environment or supports a child-wide preference claim.

Migration `202610020010_contextual_portfolio_selection.sql` corrects **new** deterministic plans only. Thursday becomes flexible between eligible embedded/intentional experiences. Wednesday/Sunday remain protected open days; at most one distinct optional template is selected on each remaining day. These inherited bounds are engineering scaffolding, not a developmental recommendation or completed personalization of family schedules. Language-domain templates may still qualify as general experiences; selecting one does not claim support for a named family language.

After the unchanged hard eligibility gate, greedy ordering prefers a primary domain less represented in this new week, then a recent exact-template report containing both high engagement and repetition, then less recent use, lower preparation and duration, with stable slug/ID ties. The 28-day window is an explicit engineering heuristic. Only the latest scheduled experience's report in that window contributes; unanswered/low-engagement/other-template/changed-content reports confer no positive repetition preference. No ability score, inferred dislike, domain-wide engagement sum, daily domain quota or automatic additional language activity is created. Repetition remains possible across weeks, not duplicated inside one week.

Reasons are generated from the actual selection branch, and new plans use `reviewed_portfolio_v4`. Full template-snapshot equality is required for feedback reuse: testing showed the same numeric version can exist alongside changed administrative content. Old plans, explanations, observations and content approvals are not rewritten. This is not the complete G4 engine: canonical capability coverage, rolling-window portfolio balance, aspirations, language anchors, parent-specific slack and bounded AI proposals remain incomplete. The owner confirmed application. Hosted disposable-owner tests verified v4 current/next-week creation, simultaneous-request idempotence, open fallback and unchanged pre-existing family records; positive reviewed selection remains local fictional evidence only.

The owner explicitly confirmed that the independent reviewer and separate editor are **not arranged yet**. Six existing review packets remain drafts; no reviewer identity, publication authority or content approval is inferred. Engineering can continue, but reviewed-content pilot readiness remains externally blocked.

## PILOT-LANGUAGE-SCOPE-2026-10-02 — India first and family language planning

- Explicit owner clarification: first-pilot families will be in India mainly; other countries can follow. Do not infer any particular state, city, emergency service coverage or family language from this decision. India-specific concern/support information still requires primary-source verification and qualified review before release.
- The requested 30–40 languages refer to **family language planning**, not translated app screens or translated activity instructions. English instructions do not establish proficiency or meaningful speaker support in another language. UI translation and translated activity packs are not added as first-pilot acceptance conditions by this request.
- Source section 10 governs this work: record actual speakers/support, comfort, contexts, regularity, oral/literacy goals and active/maintenance/future/paused states; do not impose equal exposure, infer proficiency or promise fluency. Unknown support remains unknown. Caregiver profiles are distinct from authenticated memberships.
- Existing source age scope remains superseded by the prior explicit birth-until-seventh-birthday decision. This clarification changes no family record, existing plan, provider or content approval. Implementation and test evidence belong in PROJECT_STATUS.md.

### Saved language context implementation boundary

The compact list now includes the deterministic 40-language catalog selector. Migration `202610020008_add_family_language.sql` is owner-confirmed applied. Adding is child-bound and leaves all environment details explicitly unknown; it does not assert exposure, proficiency, an active goal or available support. Exact catalog code/name duplicate checks reject additions without merging or rewriting legacy text; script/variety aliases remain unguessed. Private child-scoped request receipts prevent duplicate retries and recreation after removal; they contain identifiers/code only and cascade with child deletion. An empty nullable-field environment engages the existing clear-before-removal guard, so stale setup cannot silently discard the new entry. Nothing enters AI or changes a plan. These are source 5/10/12 reliability consequences, not language pedagogy.

Cross-surface testing identified the older setup eight-language cap. Follow-up `202610020009_language_list_compatibility.sql` aligns child-language lists at 40 entries and keeps the existing eight-language caregiver-field bound; neither is an exposure target or recommendation. Forty is an engineering list bound corresponding to the present catalog, not a requirement to fill the list. The owner confirmed applying this locally tested migration. Existing entries are not rewritten or deleted. Removal still uses explicit clearing and the existing setup list, not a new automatic cleanup operation.

The owner explicitly selected **compact list; edit one language at a time** for the Family section on 2 October 2026. This is a local extension of the approved Studio/Plum & Porcelain/Spatial Workspace direction, not a new visual world or permission to alter existing family plans. Native disclosure groups and retained mounted drafts implement that choice; unknown/read-only/stale/failed states remain explicit.

Source sections 5.1, 5.3, 10 and 12.4–12.5 guide migration 202610020007, confirmed applied by the owner. Optional environments extend the existing child-language goals; they do not duplicate goals, assume support, infer child proficiency or become reviewed activity content. Revision-checked explicit save/clear is the only client write path. The older setup form cannot delete a goal carrying richer context until that context is explicitly cleared. Private caregiver foreign keys and identity guards prevent dangling/cross-family references while retaining whole-family cascades. Bounds are engineering input limits, not language-learning guidance. New details are included in the learning-record export but excluded from current AI transfers. UI, new-language creation, planner use and independent-session/hosted-positive verification remain unfinished; this is implementation progress within the approved language-planning scope, not additional approval of a design or launch.

### Profile preservation implementation consequence

Source sections 5.1, 5.3, 10 and 12.5 require explicit reports, stable related data and safe saves. Before adding richer language context, migrations 202610020005/006 preserve retained caregiver/language/goal identities, stop defaulting new language proficiency to fluent, and reject implicit caregiver deletion through a blank name. Existing legacy proficiency is not rewritten or assumed to be an explicit report. The owner confirmed both migrations. These are corrections to inspected conflicts with the adopted baseline, not a new language pedagogy or clinical claim. The 40-option helper does not authorize translations, provider transfers, exposure targets or activity publication. Concurrent stale profile submissions and the complete language editing workflow still require work.

## EDITORIAL-PUBLISHER-2026-10-02 — A separately designated editor authorizes release

- **Explicit owner decision:** “Another designated editor will authorize publication” after independent review, rather than the founder or an ordinary family-owner role automatically gaining that authority. The editor's identity/account and external review arrangements remain unspecified. Nobody was enrolled by this change.
- Source sections 9.3, 11.3, 12.4–12.5 require the distinction between drafting, independent review, editorial publication and current-family eligibility. The offline compiler now prepares an exact JSON transport package only after the complete candidate/review checker passes. Its `publicationAllowed: false` remains a statement that compilation does not confer authority.
- Migration `202610020004_editorial_publication.sql` uses a separate, empty-by-default `content_publishers` allowlist. Only an administrator can enroll the owner's designated editor after identity/account verification. Authenticated family roles cannot enroll themselves. Enabled editorial permission and a separate documented decision are required for publication/retirement; permissions are locked through each transaction. The table and private publication archive deny application, anonymous and service-role grants.
- Publication imports a new immutable activity identity, its reviewed instruction language/readiness/exclusions, capability/track associations, exact source-linked claims and final review in one transaction. A stable release UUID recovers an identical retry; changed payload/decision is rejected. No replacement of existing templates or mutation of family plans occurs. Retirement is one-way and keeps historical records; replaying publication cannot reactivate it.
- The editor must independently verify reviewer identity/expertise/independence, actual source/content review and rights before providing the publication decision. Software validates identities *as references*, fingerprints, required paperwork, dates and shapes—not the truth of professional assertions. Publisher enrollment is powerful and must not be granted to an AI/runtime account. No genuine review or publication occurred in these tests.
- Honest evidence categories now include practice explanations, implementation packages, frameworks, professional positions and policy statements, avoiding relabelling these as empirical reviews or consensus. The claim still describes general mechanisms, not activity-specific efficacy. This is a representation correction, not new scientific approval.
- Owner confirmed applying the migration. Hosted read-only ordinary-family/anonymous denials and unchanged-plan checks passed; positive publication, rollback, retirement and eligibility integration are isolated fictional SQL fixtures only. Actual editor enrollment, real reviewed releases, publisher usability/workflow and content/age/language coverage remain open.

## JOURNAL-RETRY-2026-10-02 — Preserve one observation across uncertain retries

- Authority: source sections 5.5, 12.5 and 18.4; owner's ongoing reliability instruction. An explicit direct observation remains a single-step action without AI or an unnecessary confirmation.
- A random draft request ID and per-user database receipt bind child, date, area, normalized title and exact original note. Repeating the identical request recovers its ID; different details never overwrite it. A new observation deliberately receives a new ID. Permissions are checked again even for a completed request.
- An uncertain client result freezes only the submitted draft while offering retry. A changed/removed result permits an explicit new draft with the retained words, not automatic resubmission. Closing/reloading the page can still lose an unsaved draft; no browser persistence/offline support is claimed.
- Receipts retain a tombstone after observation deletion to prevent resurrection, without a second raw note copy. Child/account deletion cascades receipts. The salted digest remains sensitive metadata; this does not resolve operational retention or full privacy export/erasure. Historical entries are not rewritten.
- Owner applied `202610020003_idempotent_journal_saves.sql`; old unchecked creation is denied, so older open forms require refresh. Local SQL/action/client tests and scoped hosted disposable-owner checks passed. No hosted unrelated-family/viewer or independent first-write race claim is made.
- The Insights query now explicitly selects the composite child-consistent relationship. This fixes the observed ambiguous-relationship error without removing integrity constraints or changing family data. Existing authenticated browser rendering was verified read-only.

## EXTRACTION-ALLOWANCE-2026-10-02 — Reserve profile and journal requests before transfer

- Authority: source sections 8.6, 12.5, 13 and 18.5; owner's ongoing v1 reliability instruction. Inspection after complete-activity review work confirmed the other two runtime AI entry points still used non-atomic log counts. This repair keeps their existing request limits and provider/payload, rather than weakening content publication gates to manufacture a usable library.
- Profile and journal receive a shared extraction ledger with separately serialized 10/30 requests per user per rolling 24 hours. Both include legacy feature logs; Guide retains its already-applied ledger/20-request policy. A reservation permits at most two attempts within five minutes and remains counted after failure, abandonment or unknown completion. These are engineering request limits, not an entitlement to successful responses or a provider spend guarantee.
- The journal retains its 60,000 reported-token stop, counting the same legacy reports plus known new reports. Missing/in-flight/failed usage is not known zero; this observed threshold is not a hard token/dollar cap. Metadata reported through authenticated RPCs is not independently trusted billing evidence. Verified provider/global spend settings and rates remain unresolved.
- Current owner/caregiver membership, the chosen feature's permission and disclosure v2 are required at each dispatch authorization. Viewer Guide access does not imply extraction access. The application also rechecks AI permission before displaying a returned suggestion. Withdrawal cannot undo an already-sent request; completion accounting remains possible without authorizing another transfer.
- New accounting omits note/hash/output/child ID and uses nullable unknown usage. A failed success record withholds the AI result, keeps the original form input and never triggers a provider retry. Journal's deterministic fallback remains local metadata, not an AI interpretation; direct note saving and manual profile editing still work. Existing logs are preserved, not retroactively relabelled or erased.
- Owner applied `202610020002_atomic_extraction_allowance.sql`; scoped hosted disabled-feature/anonymous/private/missing-request checks passed with existing plans unchanged. Local 22-file suite, full SQL chain, type/build and lint pass. No independent-session race proof, full privacy certification, new content approval or release readiness is implied.

## COMPLETE-ACTIVITY-REVIEW-2026-10-02 — Review finished activities, not just invitation drafts

- Authority: source sections 7.3, 9.1–9.4, 11.3 and 12.5; owner requires research-derived usable activity stacks and authorized preparation of an independent-review package. Inspection found the current AI output contains only title/invitation/caregiver wording/optional noticing/claim IDs, not a complete runtime template.
- The offline authoring contract preserves those exact origin fields and fingerprints while leaving missing safety, age, resource, timing, setting, variations and context data null. It never imports legacy template defaults as reviewed content. Quarantined drafts cannot start this workflow. The editor must complete every runtime content field and explicitly describe applicability, changes and unresolved findings.
- A release is one instruction-language variety with an exact proposed age range, context contract, claim scope/limits and capability/track associations. This does not decide whether the owner's 30–40-language requirement means UI translation, language environments or both. It does not claim coverage in a language based on a selector or BCP-47 tag. Runtime enforcement/publication of language and association review remains separate work.
- Final review binds the entire authored candidate, not merely the original primitive or an AI-generated sentence. The returned response must name the same draft, age range and language, provide current source appraisal and resolve all review checks. Any content, requirement, variation, claim or association edit changes its fingerprint. Reordered JSON also changes this existing byte-serialization fingerprint; reviewers should return the separate response without rewriting the candidate.
- Structural completeness and professional-sounding names cannot verify expertise, independence, source accuracy, rights or safety. Result states deliberately stop at readiness for a separate authorized editorial decision, with publication/scheduling/identity/substantive-review flags false. No family role is granted publication authority. There is no SQL generator, publishing command or live import in this increment.
- The new offline command and tests use no provider/credentials or family data. Positive completed content and reviews exist only as explicitly fictional in-memory software fixtures. Existing catalogue content, plans, research history and approval records are unchanged. Next is the immutable authorized import boundary after genuine editorial review, not relabelling the existing drafts as ready.

## CONTEXT-ELIGIBILITY-2026-10-02 — Unknown conditions cannot become eligible by default

- Authority: source sections 5, 8.2–8.3, 9.2, 11.2 and 12.4–12.5; continued owner instruction to implement the source while preserving existing plans. The owner confirmed application of 011, 012 and `202610020001_activity_context_requirements.sql`; their scoped hosted read-only checks pass.
- An exact-version reviewed contract must explicitly address materials, environment, supervision, readiness and restrictions. Every category needs questions or a reviewed not-required rationale, and supervision always needs a question. This is an engineering structure, not an assertion that text completeness proves safety. Real questions and rationales still require qualified content review; neither the parent nor AI can approve them.
- Parent reports are child/template/version-specific yes/no/unknown answers. All required answers must be yes for selection; no answer, uncertainty, expiry or a changed contract blocks the candidate without rewriting a saved plan. Saving answers is not accepting a plan change. Existing snapshots, plans and observations stay unchanged, with no fabricated historical answers.
- Engineering limits are 1–12 questions, an explicitly reviewed validity window of 1–7 days and a parent-selected start within the next 14 days. Default is the selected day only. These bounds limit stale assumptions; they are not developmental, clinical or empirically validated intervals. A stricter template may require a fresh daily report. Date handling currently uses UTC and says so in the UI; family-local timezone remains unfinished.
- New selections record exact answers and questions as parent-reported provenance, not evidence that materials were inspected or the child was clinically assessed. Historical context is labelled as historical. Saving new answers does not silently rewrite that record. Current selection/use checks still revalidate eligibility.
- Context rows are member-readable, editor-saveable only through a guarded RPC, and unavailable for direct client writes. Export format 5 adds current context rows; saved context is also in instance history. No extra data is sent to AI by this change. Operational privacy export/erasure and retention policy remain separate unresolved work.
- Local 20-file suite, full SQL chain, production build/TypeScript and scoped lint pass. Hosted checks prove schema and scoped denials/no candidates, not real reviewed-content use, independent concurrency, full tenant certification or first-family readiness. Impeccable guided retained-input/error/read-only states without changing the approved visual direction.

## EDITORIAL-INTAKE-2026-10-02 — Complete paperwork is not automatic approval

- Authority: source sections 9.2–9.4, 11.3, 12.5 and 15; owner requests research-derived primitives/activities and has asked for a review package while an independent reviewer is not yet arranged.
- Returned reviews use a separate exact-package response, not edits to the exported evidence. An explicit draft selection prevents review of one example from covering another. Source records, primitive/generation content and the whole exported package are fingerprint-bound. Changed content requires a new review target. Scope-specific partial submissions are allowed without pretending the entire library was reviewed.
- The deterministic intake checks completeness/provenance/dates/references, not scientific validity or whether a named reviewer genuinely performed the work. It cannot verify expertise/independence by seeing nonempty text. No reviewer identity, approval, language coverage or age applicability has been invented for actual content. All positive tests are fictional software fixtures.
- Family-owner export access is not editorial publication authority. The command and route do not write approvals, publish templates or bypass resource/readiness/supervision checks. Every assessment keeps `publicationAllowed` and `schedulable` false. A future reviewed-release bridge must separately authorize publication of complete reviewed templates and enforce their requirements before family use.
- Completed reviewer submissions may contain personal professional details and must remain outside the public repository. Assessment output omits reviewer text; no retention policy or full privacy certification is inferred. No extra personal data is sent to Nebius and no new provider/AI policy is introduced.

## GUIDE-ALLOWANCE-2026-10-02 — Reserve before dispatch, keep uncertain usage unknown

- Authority: source sections 8.6, 12.5 and 13; owner's continuing request for a working, reliable v1. This closes the inspected Guide count-then-call race without changing provider, model, personal payload, content approval or family plans.
- Migration 012 serializes reservations per authenticated user. The existing 20-request rolling 24-hour Guide allowance includes older `ai_runs` during transition; each reservation allows at most two dispatch authorizations, matching the existing bounded transport retry. Reservations cannot be reused after completion or five minutes, and failed/abandoned/uncertain outcomes remain counted for 24 hours. These are engineering limits, not a monetary cap or a promise of twenty successful answers. A returned-but-lost reservation may consume allowance without a provider call; there is deliberately no automatic refund.
- Each attempt checks current family membership and Guide permission/policy. Viewer access to bounded read-only Guide explanations is preserved, not promoted to mutation access. Table writes are unavailable to client roles. Finalization only updates caller-owned metadata and never restores allowance. Authenticated callers can report metadata, so reported usage is not provider billing evidence or an anti-fraud source.
- The ledger contains no question, input hash, answer, child ID or source text. Family deletion nulls the family link rather than resetting the user's allowance; account deletion cascades. Operational retention, privacy export and erasure policies remain unresolved release work, not implied indefinite retention approval. Existing learning-record export is not a complete personal-data export.
- Missing or invalid provider token counters remain unknown in Guide's new record. Invalid model output/transport failures may have unknown usage; dispatch authorization does not prove provider receipt. Logging failure retains the reservation and never causes another provider request. Profile/journal extraction still use their older non-atomic checks and need separate conversion; no system-wide spend guarantee is claimed.
- Local 18-file suite, full SQL migration chain through 012, lint and production build pass. Single-session PGlite verifies allowance/state/role boundaries, not independent-session contention or hosted configuration. 011 and 012 remain pending application/hosted verification. No real-family data, AI settings or content approvals changed.

## EVIDENCE-VERSIONS-2026-10-02 — Source changes require fresh activity review

- Authority: source sections 7.3, 9.2–9.4, 11.3 and 12.5; owner explicitly prioritizes research-backed primitives/activities and source-of-truth fidelity while preserving existing plans.
- Migration 011 adds explicit claim applicability/unsupported-overstatement fields and an exact evidence snapshot on the internal template review. Missing source context stays unknown and blocks selection; no old review is retroactively filled or source label treated as independent verification.
- A claim or association edit advances affected template versions. Exact review and replacement acceptance then fail until the new version has a genuine review; restoring an old string does not reuse a prior acceptance. The new atomic library RPC returns the evidence checked with the template. Client roles cannot write editorial claims or associations or execute the new private helpers.
- New activity snapshots preserve source rows/links alongside template wording; older records remain unchanged and disclose unavailable evidence provenance. Moves of an outdated saved version are blocked even when a newer current version is reviewed, while direct history/observation use is preserved. The implementation creates no new content approval authority for family owners or AI.
- Source scope, limits and dates are progressively disclosed in preparation and Guide without a visual redesign. Guide's v2 disclosure already covers public source records; no additional personal data category or provider is introduced by these source fields.
- Full-chain local SQL and 17 local test files pass; scoped synthetic Nebius regression passes eight cases. Hosted 011 application, positive reviewed-content testing and independent review remain pending. Claim types are still the existing evidence-type vocabulary; this work does not complete the full conceptual claims registry, approved language coverage or concern-routing contract.

## GUIDE-GROUNDING-2026-10-01 — Explain supplied material, do not invent a curriculum

- Follow-through: owner confirmed 008–010 application. Hosted disposable-owner tests passed their scoped integrity/AI-policy checks with existing plans unchanged and disposable AI off. Simplified production instructions and optional (rather than mandatory) next actions resolved the initial synthetic usefulness failures: seven-case batch plus two-option comparison passed. Reference and duplicate validation remain strict. Historical failed evaluations below are preserved, not current passing evidence. Real reviewed-content, clinical and multilingual readiness remain unproven.

- Authority: source sections 7.5, 9, 11–14 and 18.5; owner's request for research-based activities and useful, complete, concise answers. No provider/model switch or additional autonomous writes.
- Guide input is limited to the parent question, approximate age, eligible library snapshots and linked current source records. Missing context prevents dispatch. Source IDs are server-validated; reference links cannot be invented by the model. Response text remains subject to independent semantic evaluation, not self-certified by valid IDs.
- Answers target one to three complete sentences, with a strict length bound and visible source/preparation details. Unsupported answers use fixed application wording. Narrow listed facts must not be confused with evidence of developmental efficacy or suitability; clinical routing remains unreviewed and incomplete.
- Revalidate permission, child birth context and library/source versions before each dispatch and display. A stale answer is withheld; existing plans and observations remain unchanged. Input/reference limits are engineering bounds, not scientific thresholds.
- Migration 010 changes the shared disclosure version to v2. Existing flags are not rewritten, but v1 permissions are treated as off by the application until reviewed and saved again; this affects profile and journal extraction too because the present settings schema has one shared version. No old acceptance silently authorizes the expanded Guide payload.
- Local tests establish bounded retrieval/validation and failure behavior. Three real synthetic-provider batches still failed the useful-answer expectation through over-abstention; prompt edits did not cure it. Do not expose a readiness claim, weaken review gates, or fabricate live source approval to get a positive demonstration. Hosted 010 confirmation and real reviewed-content evaluation remain pending.

## CONTENT-HISTORY-2026-10-01 — Preserve selected instructions without inventing history

- Authority: source sections 7.3, 9.1–9.3, 12.5 and 14; owner requests the source-of-truth product while preserving existing plans.
- Migration 009 captures the exact reviewed template and review version/dates for each new non-null template assignment, and appends a family-readable content-version record when a template is replaced. Reviewer names/qualifications are not copied into family records. Moves, skips and observations do not rewrite that history. History follows instance deletion by cascade; this is not an indefinite-retention policy.
- Existing instances get no fabricated snapshot or retrospective review. Their saved title/instructions/selection note remain; UI labels original template version unknown instead of joining today's mutable guidance into yesterday's plan. Activity, Today and Week use saved snapshots, and export format 4 includes the version records.
- No reviewed personalization contract exists yet: newly selected title/instructions must match the exact reviewed row. Content/snapshot fields cannot be rewritten independently, instance identity is stable, and clearing a template is not a substitute for preserving it while skipping. These protections are not authorization to publish any draft.
- A read-only instance-use check distinguishes saved history from a changed/retired/expired or otherwise ineligible current recommendation. This is the existing baseline eligibility check, not completed resource/supervision/clinical suitability validation. Capability/track/claim links are not fabricated into the snapshot; their reviewed-version contract remains unfinished.
- Full-chain local SQL, synthetic rendering/action tests and build/lint checks pass. Read-only real-family legacy-record desktop/phone rendering was inspected without mutations. Migration 009 and positive hosted history remain unapplied/unverified at this checkpoint; 008 confirmation is also pending.

## REPLACEMENT-2026-10-01 — Parent choice binds to the displayed state

- Authority: source sections 7.5, 8.5–8.6, 12.5 and 18.4; continued owner request for tested correction rather than silent changes.
- Replacement requires a current instance revision and the exact displayed candidate row. A changed date/status/instance or changed candidate instructions invalidates that acceptance. A change-and-reversal still advances revision. A recorded observation blocks replacement even if an inconsistent status says planned.
- Migration 008 introduces integer instance revisions, a checked replacement RPC and revokes client execution on the former unchecked RPC. Existing instance content is preserved, with baseline revision 1; this is not a reconstructed historical snapshot. No migration/provider/AI content review approval is inferred.
- The inline form distinguishes stale context from unknown transport outcome and requires refresh rather than replaying an uncertain mutation. Local full-chain SQL, action validation, state rendering, lint and production build passed. Hosted application/verification is pending. Arbitrary direct instance field writes and immutable historic content remain separate gaps.

## PLAN-INTEGRITY-2026-10-01 — Current review validity and stable week identity

- Authority: source sections 8.2–8.6, 9.3 and 12.5; owner requests continued v1 correction while preserving existing plans.
- A new template selection needs a review valid both today and on its scheduled date. Selecting a past date cannot revive an expired review. Historical status/observation-only edits remain allowed.
- New activity assignments, including open slots, must fall within their linked seven-day plan. Validation is deferred to the transaction's final state so an occupied-day swap remains possible. Plan ID, child and week-start anchors cannot be reassigned after creation; there is no product workflow for moving a whole plan into another child's history or another week.
- Migration 007 changes functions/triggers only. Existing rows are not rewritten. Newly generated summaries describe actual selection/no-selection rather than assert a balanced portfolio. Retrying generation preserves an existing plan exactly.
- Full-chain in-memory PostgreSQL tests passed, including direct authenticated-editor writes, rollback, current-date expiry and unchanged legacy rows. Owner reported applying 007; hosted disposable-owner tests then passed new-summary/date/anchor checks with pre-existing plans unchanged. Current-date expiry with synthetic reviews remains local-only; no content approvals or readiness claim.

## DOMAIN-2026-10-01 — Owner reports kcmira.me

- Owner reports acquiring `kcmira.me` with SSL. Domain ownership/control and certificate setup are reported state, not verified by this note.
- Intended use can now be resolved for the MIRA website and verified email sending. DNS provider, hosting target, sender address and completed email-domain verification are not yet established.
- This report does not authorize changing DNS, deploying the application, replacing the local Supabase redirect URLs, or claiming public launch readiness. Keep localhost development working while those choices are confirmed.

## ELIGIBILITY-2026-10-01 — Exact review records and day-specific planning

- Authority: source sections 5.4, 8.2–8.6, 9.2–9.3 and 12.5, owner-defined under-seven boundary, and continued readiness instruction. Owner applied migration 006 after being told that old unreviewed activities cannot be moved or replaced.
- New selection requires `expert_reviewed` plus a separate internal review record matching the full current template row/version, an actual review date and a non-expired due date. No records are seeded, and family owners/caregivers/AI cannot write this table. Documentary fields do not themselves verify reviewer competence, safety or rights; independent editorial review remains required.
- Age is checked as a conservative month/year envelope for each scheduled date. Weekday and weekend limits are separate, with setup plus activity time counted. Missing capacity/preferences block selection instead of assuming defaults. A missed candidate leaves its own day open, not a shifted later slot.
- A deferred database guard also checks final non-null-template assignments and date moves, including raw client writes. Temporary swap dates are not mistaken for final dates. Existing rows are not rewritten; status/observation-only changes remain possible. Existing plan generation retries now return the existing plan without resetting its metadata.
- Library and preparation use the shared database candidate response, including the checked template snapshot, rather than re-reading potentially changed instructions. Unavailable saved choices stay visible in Saved and can be removed; removal is allowed after retirement/age changes. Existing family data and plans are preserved.
- Deliberate remaining work: reviewed source/claim associations, immutable instance-level snapshots, language context, confirmed resources/readiness/supervision, aggregate burden beyond the existing one-slot model, family timezone, stale replacement protection and concern routing. This migration is a baseline eligibility gate, not complete safety certification or first-user readiness.
- Verification: full migration chain and synthetic positive/negative cases run in an in-memory PostgreSQL runtime. Hosted tests then passed with a new disposable child/plan: no prototype candidates, seven open days, idempotent generation, denied direct prototype assignment/bookmark, private/anonymous denial and unchanged pre-existing test plans. Hosted positive reviewed-content tests were not run because no genuine reviews exist.

## SECURITY-2026-10-01 — Restrict internal RPC access

- Authority: owner requested first-family readiness, supplied disposable credentials and authorized live tests and continued correction. Source sections 12.4 and 15 require direct-API privilege checks.
- Observed: 14 scoped anonymous private-table reads were denied/empty. Six internal RPC probes returned domain/FK errors for anonymous requests rather than privilege denial, proving the functions were executing. Owner probes for those six were privilege-denied. No real IDs were passed to internal RPC probes; nonexistent fixture IDs caused rejection/transaction rollback, not a live plan change.
- Cause consistent with inspected migrations: internal function grants were revoked from PUBLIC and authenticated, but not from the explicit anon role. In particular, the internal portfolio population function relies on its caller's access check and must not be exposed directly.
- Repair: migration `202610010002_restrict_internal_rpc_access.sql` revokes all client execution from seven known internal helpers, verifies effective privileges and asks PostgREST to refresh its schema cache. Authenticated public wrappers, function bodies, data and plans remain unchanged. A missing signature or inherited permission causes transaction failure, not a partial repair.
- Deployment: owner reported application; live API tests subsequently confirmed privilege denial for all seven helpers as anon and authenticated. The public owner planner still generates a new disposable plan and retries without duplicating its instances. This is not full tenant or viewer certification. Future private-helper migrations must explicitly account for anon grants.

## DATA-2026-10-01 — Unknown observations and guarded correction

- Authority: source sections 5.5, 7.4 and 12.5; owner requests continuing source-aligned v1 implementation and applies migration 005.
- Engagement, challenge and repeat answers are optional; missing stays SQL null. Historical non-null answers are preserved, not reclassified. Parent-written notes retain exact submitted text.
- Revision checks and current-template identity prevent an old form overwriting newer observations or recording against a replaced activity. The old unversioned client RPC is disabled; open old forms must refresh.
- The inspected planner's two engagement expressions now score null neutrally rather than as low engagement. This repairs missingness, not a validated educational ranking model. No plans regenerated.
- Migration 005 adds a revision column/trigger and checked RPC. Live disposable-fixture tests passed for note-only save, reload, explicit false vs null, concurrent/stale rejection, invalid input, template mismatch, legacy/anonymous denial. Cross-family/viewer remains separate.

## PRIVACY-2026-10-01 — Family-controlled optional AI

- Authority: adopted source section 18.5 and continued v1 instruction; owner explicitly applies migration 004 with default-off behavior disclosed.
- Owner chooses Guide, profile extraction and journal metadata extraction separately. No row or stale disclosure version means off. Server authorization runs before each provider dispatch/retry; current provider/model is unchanged.
- Settings describes actual categories and provider, distinguishes saved state from edits and requires acknowledgment when enabling. Missing permission information fails closed. Withdrawal does not recall an already-sent request or certify historical deletion.
- Provider retention/deletion arrangements remain unverified; this control is not legal consent certification. Stored preferences retain latest actor/version/revision, not a complete historical consent-event ledger.
- Live disposable owner tests passed: save/reload, isolated feature flags, old-disclosure rejection, stale/concurrent protection, direct/anonymous write denial. Test family ends off; no provider requests used. Existing real-family preferences/plans were not changed.

## INTEGRITY-2026-10-01 — Cross-child linkage

- Source section 12.4 implemented with composite plan/activity and activity/observation foreign keys in migration 003. Owner reports application; live disposable fixtures confirmed valid links and rejected mismatched insert/update/parent reassignment.
- Existing data is not rewritten; migration refuses existing inconsistent links. Same-child integrity is not cross-family authorization certification.

## PILOT-BOUNDARY-2026-10-01 — Age boundary and independent review

- Owner explicitly chooses birth through age six, ending at the seventh birthday. Month/year age information still needs conservative boundary handling; this scope decision does not establish reviewed coverage for every stage.
- Owner asks for the review package and reports no reviewer arranged yet. Prepare source-linked, versioned drafts and review records; do not mark content expert-reviewed or publish unreviewed activity stacks to satisfy a numerical target.
- Implemented follow-through: Guide uses a conservative month/year age envelope and blocks dispatch when the seventh-birthday month is ambiguous or the age is outside the target. This does not collect an exact birthday, alter existing profiles/plans, or certify activity eligibility. The legacy SQL planner and Library still need equivalent boundary repairs; this is not a product-wide age-filter completion claim.
- Review handoff: owner-only Markdown worksheet and exact JSON records bind the current source catalog and draft fingerprints. Reviewer identities, qualifications, scope, findings and decisions remain unfilled. Exporting or filling the worksheet cannot publish content. No independent reviewer is invented.
- The earlier upper-age question below is resolved by this decision. Exact languages/varieties, provider retention, concern-routing review and other pilot gates remain open.

## SCOPE-2026-10-01 — Owner expands pilot ambition

- Owner explicitly requests ages 0–6 and English plus at least 30–40 international languages for first-family support.
- This supersedes the earlier 0–3 delivery target and limited multilingual target, but does not prove existing content covers the new scope.
- Exact upper-age boundary and language list/varieties are not established by “0–6” and “30–40”. Record these as open; do not infer language preferences from nationality or convert machine translation into reviewed coverage.
- Impact: source sections 3, 4, 9, 10 and 16; the target requires additional reviewed stage-appropriate content and language-context resources, language-quality evaluation, fonts/scripts and caregiver opportunity checks. Existing safety/rights/privacy gates still apply.
- Owner can provide disposable test accounts. Only those accounts may be used for new cross-tenant mutation tests; existing family plans remain protected.

## HARDEN-2026-10-01 — First-family workflow repairs

- Authority: owner requests first-user readiness and continued refinement, after replacing AGENTS.md with mandatory G0 alignment.
- Read-only repository audit: G0_ALIGNMENT_2026-10-01.md; live database evidence remains unverified.
- Repair existing workflows: preserve parent-written journal text, make AI optional for title/area only, bind saves to the child displayed when composing, select the signed-in user's membership, reject partial exports and fail closed when AI allowance cannot be checked.
- Rationale: original evidence must not be replaced by inference; a dependency failure must not look like missing family setup, a completed export or permission to spend.
- Source impact: sections 5.5, 7.4, 12.4–12.5, 13, 18.6. No invented requirement IDs. Optional per-request transfer acknowledgement is not a complete persisted consent/withdrawal system.
- No schema, model/provider, dependency or live-plan changes. Existing journal records are unchanged. No app-wide no-AI preference, reviewed-content approval or first-family release authorization is implied.
- Server Supabase requests now have a 12-second per-request timeout, matching the existing browser-client bound. No automatic mutation retry is added; an uncertain save asks the parent to inspect state first. This is not a guaranteed total page-load deadline.

## CORE-2026-10-01 — v1.1 adopted; research-to-content pipeline prioritized

- Owner explicitly supplied `MIRA_SOURCE_OF_TRUTH (1).md` and requested adoption plus research-backed primitives and activity stacks. Root canonical file now contains the supplied v1.1 text; v1.0 is preserved in `docs/archive/`.
- Later explicit UI selections remain effective. v1.1's historical proposals do not undo Guide/Spatial Workspace. References to companion research/acceptance files remain missing inputs, not fabricated evidence or approvals of unresolved decisions.
- Implement source/claim/primitive traceability and bounded AI draft compilation first. No AI may mark its own content reviewed. Research association is not specific-activity validation or WHO endorsement.
- Initial compilation uses public-source summaries and non-personal primitive briefs only. No family data is sent, no existing plan changed, and generated drafts cannot be scheduled. Existing Nebius provider/model configuration is preserved.
- Independent content, safety, stage applicability and rights reviews are required before promoting drafts to usable templates. These are external review gates, not tests an AI can award itself.

## ADOPT-2026-09-30 — Canonical source adopted

- Authority: explicit owner request in this conversation on 30 September 2026.
- Decision: preserve the uploaded `MIRA_SOURCE_OF_TRUTH.md` v1.0 in the repository root and use it as the highest project-level authority for app creation decisions.
- Rationale: make the owner's product intent durable across coding sessions and prevent drift from earlier assistant-generated plans.
- Affected sections: source sections 0.1–0.3 and 17; all future product decisions. The referenced requirement register was not supplied, so no requirement IDs are invented here.
- Documentation impact: add a pointer in `AGENTS.md`, subordinate the older specification and roadmap, and identify the next task as G0 alignment.
- Runtime/schema impact: none. No application code, database, provider configuration, or existing functionality changed by adoption.
- Verification: compare the saved source text with the uploaded original and inspect documentation changes. Runtime tests are not required for this documentation-only adoption.
- Open items remain open; adoption is not evidence of implementation or resolution of every H/O item.

## Items to reconcile during G0

- Source section 12.1 describes the Responses API; existing work uses a Nebius chat-completions adapter following earlier owner direction. Record an explicit reconciliation before any provider/routing change; adoption itself does not switch providers.
- Source section 7.1 names Insights; the existing navigation uses Journey. Assess whether the naming requires a decision rather than silently renaming the UI.
- Source sections 5.5 and 12.5 call for preserving original feedback alongside extraction; current extraction/storage behavior needs inspection before asserting compliance.
- Supported age boundary, reviewed language/content coverage, concern routing, retention/deletion, adaptation permissions, and pilot readiness remain unresolved as stated in the source.
- The source references a larger supporting package. Only the source-of-truth file was uploaded. Missing companion material must not be reconstructed as though supplied or verified.

These are audit prompts, not a completed gap inventory or newly approved implementation changes.

## DESIGN-2026-09-30 — Replacement UI options requested

- Authority: the owner explicitly rejected the current UI/UX and requested Impeccable-led options, selection before implementation, and rerolls if unsatisfied.
- Decision: explore distinct replacement interfaces; present visual options before changing the live application.
- Affected source sections: 6–8 (onboarding, interface, planning), 12.2 (AI responsibility split), and 17 (delivery evidence).
- Runtime/schema impact so far: none. No option is approved yet; proposed AI mutation interfaces do not authorize an unvalidated mutation path.
- Evidence and proposed next work: `DESIGN_REVIEW_2026-09-30.md`. This scoped design exploration does not claim completion of the full G0 audit.

## DESIGN-2026-10-01 — Spatial Workspace approved for implementation

- Authority: owner-selected Studio, Plum & Porcelain, individual screen options, Guide naming, and Spatial Workspace suite; subsequent explicit instruction to build.
- Decision: implement the selected left-navigation system with functional spatial motion. Do not add illustrations or decorative visuals to public home, login or email confirmation. Other motion must respect reduced-motion and clarify real state changes.
- Runtime impact: shared UI and selected page rewrites; guarded Week move/undo supplied behind a new SQL function. See PROJECT_STATUS.md for verified and unverified scope.
- AI boundary: no provider change, new pricing commitment, or autonomous memory/plan mutation authorized by a visual selection. Guide is the owner-approved name; its current server calls remain independent questions.
- Remaining source questions above are unchanged. Visual implementation is not a safety/content review or a launch approval.
