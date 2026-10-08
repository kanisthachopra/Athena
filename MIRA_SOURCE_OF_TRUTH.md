# MIRA — Source of Truth
## Product, behaviour, architecture and delivery baseline

**Version:** 1.1 · **Prepared:** 30 September 2026  
**Status:** Research-informed continuation of v1.0, prepared for owner adoption; not a verified implementation report.  
**Product owner:** The project founder/user. The sister is the intended first family tester, not an assumed approver of every design decision.  
**Repository, branch and commit:** Not supplied or inspected for this document.

> MIRA helps a parent create thoughtful, primarily offline learning opportunities that fit their family and adapt to observations of their child. It must not turn childhood into a performance programme, replace caregiving, or treat an AI interpretation as a fact.

This document is the canonical description of intended behaviour once adopted. It does not certify safety, clinical validity, legal compliance, or the correctness of existing code. Those require separate evidence. A requirement marked **MUST** is an acceptance condition, not a claim that it has already been implemented.

## 0. How to use this source of truth

### 0.1 Authority and provenance

The source conversation contains founder requests, assistant proposals, illustrative families, example code and changing implementation suggestions. They do not all have equal authority. This package keeps these categories separate:

| Label | Meaning | How to use it |
|---|---|---|
| **U — User requirement** | Explicitly requested by the founder in the conversation. | Preserve unless the owner explicitly changes it. |
| **D — Discussion baseline** | A recurring or later design direction proposed in the conversation. | Adopt as the working specification, not as a historically signed-off decision. |
| **H — Hardening proposal** | A new clarification, test or engineering safeguard added during this consolidation. | Identify it as new; obtain approval when it changes scope or behaviour. |
| **R — Reported state** | The user reports work has started or an account/project exists. | Record as reported; inspect the repository/environment before calling it implemented. |
| **V — External verification** | A narrowly checked current vendor-documentation fact. | See the dated verification notes; this is not evidence about the deployed app. |
| **O — Open decision** | The sources do not establish a final answer. | Keep unknown. Do not quietly invent a value. |

**Historical sources:** `S01` is the attached *MIRA idea log(1).pdf*, 231 pages. `C01–C05` identify relevant portions of the visible conversation that are not fully included in the PDF. References such as `[S01 pp. 25–27]` refer to physical PDF pages. The complete source map records page and original parsed-line ranges.

**Important limitation:** The PDF ends after the technical architecture discussion. It does not establish the current Codex implementation. It also jumps past the standalone Family + Child Information Model and Activity + Resource Knowledge Base discussions visible in this chat. Those are recovered as explicitly labelled chat supplements, not falsely attributed to PDF pages. [S01 pp. 48–50, 141–143, 229–231; C01; C02; C03]

### 0.2 Separate intended behaviour from actual behaviour

For **what the app should do**, use this specification and owner-approved decisions. For **what exists**, use the inspected repository, migration history, environment configuration and test results. When they disagree, document the gap. Existing code is not permission to silently weaken the intended behaviour; the specification is not permission to claim a feature works.

`AGENTS.md` is a compact entry point for coding agents. It points to this document and the relevant supporting files. `docs/PROJECT_STATUS.md` records implementation evidence. `docs/DECISIONS_AND_OPEN_QUESTIONS.md` records unresolved choices and changes. Acceptance scenarios are specifications until real tests execute them.

### 0.3 Adoption and change control

The first repository task is a **read-only alignment audit**, not a rebuild. Review existing instructions and work, then propose where these files should be merged. Do not overwrite an existing `AGENTS.md`, duplicate a working schema or restart Supabase.

After owner adoption, changes to scope, safety, permissions, data collection, model routing or core behaviour require a recorded decision with rationale, impacted requirement IDs, migration implications and tests. Typographical fixes need only a changelog entry. New agent sessions must not reinterpret a repeated “continue” as approval for unrelated features. [H; C03–C05]

---

## 1. Product identity and founding problem

**MIRA** is the working product name. No expansion of the acronym is established. Earlier labels such as “Learning Copilot” and “AI Development Copilot for Parents” describe the same project, not separate apps. [C04; O]

The founder wants to help their sister, a new parent considering homeschooling, overcome the effort of selecting resources and planning a broad education. The requested experiences include languages, problem solving, patterns, reading, general knowledge, independent attempts, asking for help, and culturally meaningful stories. The founder also wants the approach to work for families with different priorities. Low child screen exposure, freedom to stop and avoiding excessive pressure are explicit requirements. [U; S01 pp. 1–2]

**Core problem:** Parents face too much fragmented information and too much planning work. MIRA should explain what is appropriate to offer next, why it might be useful, how to do it with available people and materials, and what to change after observing the experience. [S01 pp. 21–22]

**Product promise:** Reduce planning friction and help the parent become a more capable educator. The system offers opportunities; it does not guarantee fluency, intelligence, academic acceleration or future success. [S01 pp. 25–27, 160]

**Important historical revision:** The opening message treats early social interaction as less valuable than intellectual learning. The conversation subsequently rejects that premise and includes relationships, social participation and emotional development in the product foundations. This is an explicit evolution in the record, not a belief MIRA should encode. This package is not a fresh review of developmental science. [S01 pp. 1–3, 31–32]

## 2. Constitution: non-negotiable product behaviour

### 2.1 Core requirements

MIRA MUST preserve the following intentions:

- **Parent-facing, child-first.** The adult uses the software; the child mainly experiences people, play, books, movement and the physical world.
- **Capability without coercion.** Participation, refusal, redirection, repetition and help-seeking remain legitimate. Do not make activity completion a condition for approval or affection.
- **Holistic opportunities.** Academic aspirations do not replace physical, relational, emotional, social or creative experiences.
- **Teach the parent.** Explain the purpose and adult role, with useful variations and optional deeper learning.
- **Adapt without labelling.** Use observations to adjust experiences. Do not produce IQ, giftedness, developmental rank, permanent learning-style or future-career labels.
- **Explain choices and trade-offs.** Parents can inspect why a recommendation was selected and compare changing the plan with keeping it.
- **Respect family capacity.** Time and energy are constraints, not targets to exhaust. A lighter day and no additional activity are valid outputs.
- **Evidence and privacy before apparent cleverness.** Do not invent scientific support, collect unnecessary child data, or claim a safety check makes the system infallible.

These are compiled from the source principles and founder goals. Detailed acceptance conditions are in the requirement register. [U/D; S01 pp. 1–2, 22, 25–27, 45–46, 165–194; C01]

### 2.2 What the product is not

MIRA is not a child-facing chatbot, a diagnostic/screening tool, an autonomous parenting authority, a daily academic quota system, a leaderboard, a toy-shopping funnel or a detailed birth-to-18 curriculum. It must not portray homeschooling as universally superior, rank families, or use anxiety about “missing the critical window” as a conversion tactic. [D; S01 pp. 3, 13–14, 19–20, 169, 188, 197–198]

“Offline-first” describes **child experiences**, not a promise that the web app functions without an internet connection. True offline app synchronisation was not specified and remains out of the first release. [H clarification]

## 3. Scope and phased delivery

### 3.1 Intended MVP

The discussed MVP is a responsive web app for caregivers of children in the **0–3 age range**, with one active child in the initial experience. It includes family onboarding, a Family Education Constitution, Today and Week views, curated activity instructions, lightweight feedback, cautious interests, basic multilingual planning, parent explanations, and a bounded Ask copilot once its safety and evidence prerequisites are ready. [D; S01 pp. 197–198]

The underlying household model can support multiple members without immediately shipping multi-caregiver invitations or multi-child scheduling. One pilot family is a testing scope, not permission to omit tenant isolation. [C03; H clarification]

The exact upper age boundary is unresolved: the discussion uses “0–3”, a 24–36-month band and later code examples extending beyond 36 months. Do not silently choose either the third or fourth birthday as the supported limit. Until decided, do not promise support beyond reviewed coverage. [O; S01 p. 40; C03]

### 3.2 Delivery gates

| Gate | Deliverable | What is deliberately absent |
|---|---|---|
| **G0 — Align** | Inspect current repo, migrations, instructions and tests; document status and gaps. | Reinitialisation or feature expansion. |
| **G1 — Foundation** | Sign up, create family and child, persistence, family isolation, preferences and caregiver data as needed. | AI dependency. |
| **G2 — Experience loop** | Deterministic/mock plan, Today/Week, activity details, direct feedback, history. | Claims that mock content is reviewed or clinically validated. |
| **G3 — Understanding** | Schema-bound extraction of free-text goals/notes; parent verification; unknown remains unknown. | Unrestricted model writes or diagnosis. |
| **G4 — Planning** | Curated candidates, constraint filtering, portfolio selection, explanations and controlled adaptation. | Arbitrary invented activities. |
| **G5 — Private pilot** | Reviewed live content, operational privacy/security, fallback behaviour and required tests; bounded chat if ready. | Public launch claims or broad autonomous advice. |

These gates consolidate the later implementation sequence rather than add another competing sprint plan. Evidence may show some are already complete. Do not redo them because the document lists them. [S01 pp. 229–231; C03; H gate names]

### 3.3 Deferred scope

Voice input/audio generation, child photo/video analysis, document uploads, native apps, push notifications, elaborate calendar integration, marketplace/advertising, billing flows, institutional licensing, school-age curricula, every-world-language content, large vector infrastructure, fine-tuning and multi-agent orchestration are deferred. Some may later be useful; none is required to validate the first planning loop. [S01 pp. 197–198, 218, 225–228; C01; C02]

Content counts in the record are **stage estimates**, not release conditions: approximately 20 synthetic development templates, later 50–80 reviewed templates, and larger future libraries. Publish only what has actually been reviewed. No number of draft rows proves readiness. [S01 pp. 197, 229–230; C02; C03]

## 4. Developmental framework and terminology

### 4.1 Four levels

**Level 0 — Conditions for healthy development:** protect health/routines, nutrition-related care boundaries, physical and emotional safety, responsive caregiving, learning opportunities and caregiver capacity. The app is not a treatment, feeding or sleep-prescription service.

**Level 1 — Core human capabilities:** the nine domains below.

**Level 2 — Educational and enrichment tracks:** languages; literacy/literature; mathematics; science/nature; general knowledge; history/culture; geography; art/design; music; physical pursuits; making/practical skills; technology/computation; ethics/philosophy; leadership/biographies.

**Level 3 — Family-specific aspirations:** what the family values, why, and when. Aspirations are translated into suitable opportunities; they are not developmental deadlines. [D; S01 pp. 28–38]

### 4.2 Canonical domains

| Identifier proposed for code | Source terminology | Planning meaning |
|---|---|---|
| `relationships_attachment` | Relationships & attachment | Connection, responsive interaction and shared attention. |
| `emotional_regulation` | Emotional development & regulation | Emotional expression and adult-supported recovery. |
| `communication_language` | Communication & language | Gesture, listening, comprehension and expression. |
| `physical_motor` | Physical & motor development | Movement, coordination and object manipulation. |
| `cognition_problem_solving` | Cognition & problem solving | Cause/effect, comparison, memory, spatial reasoning and prediction. |
| `executive_function` | Executive function | Developing attention, flexibility and self-regulation foundations. |
| `curiosity_play_creativity` | Curiosity, play & creativity | Exploration, imagination, experimenting and making. |
| `independence_practical` | Independence & practical capability | Choices, participation, attempts and help-seeking. |
| `social_participation` | Social participation | Shared play, cooperation, belonging and interaction. |

The labels are preserved from the source; machine identifiers are an implementation proposal. Do not rename an existing code vocabulary without a mapping/migration decision. [S01 pp. 31–32; H identifiers]

### 4.3 Age, capability, milestone and opportunity

The six discussion bands are 0–3, 3–6, 6–12, 12–18, 18–24 and 24–36 months. The complete original nine-domain matrix is transcribed in `docs/DEVELOPMENT_MATRIX.md`, with its status as **unvalidated planning context**, not a milestone checklist or activity approval system. [S01 pp. 40, 48–50]

Keep four concepts distinct: **milestone context** is background guidance; **capability** is an area of development; **opportunity** is an experience to offer; **observation** is what a caregiver reports happened. Do not convert “not observed” into “cannot do”. Do not treat a capability report as authority to bypass material safety. [S01 pp. 39–43; C01]

## 5. Family and child information model

### 5.1 Four kinds of information

Store parent-provided facts, family preferences, observations and AI inferences separately. Each meaningful item needs provenance and a date. For example, “Mum reports low engagement with these three books” is not “child dislikes reading”. An AI claim must carry its supporting observation IDs and be correctable. [C01; S01 pp. 10, 130–131, 176–177, 216–217]

### 5.2 Family profile

Relevant information includes broad country/region, timezone, caregiving arrangement, realistic weekday/weekend capacity, budget/resource preferences, preferred structure, screen preferences, routines to protect, home/outdoor opportunities, teaching interests, homeschooling intentions and avoidances. Culture or religion may be voluntarily stated for content preferences; do not infer them from names or location. No exact address, income or unrelated identity data is needed by default. [S01 pp. 7, 53–66; C01]

### 5.3 Caregivers and language environment

A caregiver profile is not automatically an app login. It represents a person the parent says interacts with the child, their relationship, availability, strengths, language comfort and useful routines. Connecting that person to an authenticated account is a separate access-control decision. Do not assume that “Mum”, “Dad” or “Grandmother” has a particular language or schedule. [S01 pp. 58–60, 127; C01; C03]

### 5.4 Child context and sensitive considerations

Use a nickname and minimally necessary age information. Exact date of birth is not required by default. Age precision must be stored honestly: month/year alone is not an exact age in days. Do not invent a birthday to decide eligibility near an age boundary. [C01; C03; H age-precision clarification]

Accessibility requirements, allergies or professional instructions are optional, sensitive, purpose-limited information. Separate them from generic profile notes; use only what is needed for activity adaptation. A parent report of a diagnosis remains a parent report, not a diagnosis made or verified by MIRA. [S01 pp. 55, 181, 184; C01]

### 5.5 Observations

An observation can be attached to a planned activity or come from ordinary life. The proposed fields are activity context, time, optional engagement, optional challenge, repetition/help/redirection flags and an optional note. Duration is optional and approximate. Store the original parent input separately from a model extraction. [S01 pp. 86–87, 98, 207, 215]

For every extraction, “not mentioned” MUST remain unknown. A missing help request is not evidence that the child worked independently. A skipped activity due to no time is not evidence of child dislike. These distinctions clarify the source's cautious interpretation principle. [H; C01]

### 5.6 Dynamic state and memory controls

Interests retain topic, first/last observation, evidence, recent strength and trend. Inferences retain claim, evidence, confidence label, review/expiry date and parent correction status. Confidence is an internal qualitative summary, not a calibrated probability of ability. Do not hard-code arbitrary evidence thresholds from illustrative examples. [S01 pp. 130–131, 216–217; C01]

Parents need a visible “What I understand” view with edit, correct and forget controls. Corrections must influence later plans. Retention expiry and reduced ranking weight are different mechanisms: an old observation may become less influential without being deleted; deletion must also handle derived summaries. Exact retention periods remain an owner/privacy decision. [C01; H derived-state clarification]

Maintain compact current state plus relevant recent evidence instead of repeatedly sending a child's full history to a model. This is not permission to discard safety restrictions or parent corrections during summarisation. [S01 pp. 213, 216–217]

## 6. Onboarding specification

### 6.1 Two experiences, one verified profile

The desired experience is conversational and progressive, with quick and detailed paths. The first implementation may be a conventional five-step form: child; goals; caregivers/languages; preferences; review. These are phased implementations of the same profile, not contradictory product requirements. The 3–5 and 10–15-minute estimates in the source are UX hypotheses, not guaranteed completion times. [S01 pp. 50–75; C03]

Save drafts without creating multiple households on refresh. Make optional/sensitive questions skippable. Explain why a question is asked. Never require a “learning style”, intelligence judgement or developmental exam. [D/H]

### 6.2 Required question families

| Question family | Source wording or faithful prompt | Stored result / branch |
|---|---|---|
| Purpose | “What are you hoping to give your child through taking a more active role in their learning and development?” | Founder/family aspirations; confirm extracted meaning. |
| Child | “Tell me a little about your child.” | Nickname, age context, optional adaptation needs and protected routines. |
| Qualities | “Imagine your child at around 10 years old. Forget grades for a moment.” | Long-term qualities and prioritisation, not predictions. |
| Opportunities | Which learning opportunities matter? | Track priorities; clarify that high priority does not mean early formal lessons. |
| People | “Who regularly spends meaningful time with your child?” | Caregivers, frequency and natural activity preferences. |
| Languages | Which languages are heard now, and desired later? | Speakers, comfort, contexts, oral/literacy goals; branch when support is absent. |
| Realistic time | “On a difficult weekday, how much additional time could you realistically give…?” | Capacity, variability and embedded-learning preference. |
| Resources | What can the family access and spend? | Materials/environment, free/borrow/buy preferences; not family income. |
| Screens | “How would you like screens to fit into your child's learning?” | Preference, within reviewed age/safety constraints. |
| Learning feel | What should happen when the child struggles or refuses? | Challenge/help/autonomy preferences without overriding non-coercion. |
| Parent learning | How much explanation is useful? | Minimal, short, educator or deep explanation preference. |
| Avoidances | “Is there anything you definitely don't want your child's learning plan to become?” | Explicit negative preferences. |

Preserve a final summary and the question **“What did I get wrong?”** before committing inferred preferences. Answers are editable later. Do not populate illustrative Hindi/Mandarin/French households as the founder's actual family. [S01 pp. 53–70]

### 6.3 Branches and contradictions

A desired language with no comfortable regular speaker triggers a question about outside support or parent learning, not automatic daily lessons. A music aspiration for an infant is a future direction, not a request for a piano syllabus. Competing high priorities with little time trigger an explicit breadth-versus-focus trade-off. [S01 pp. 71–72]

The source's “structured” autonomy option sometimes implies compulsory completion, which conflicts with “capability without coercion”. Record that conflict; the recommended interpretation is **predictable routines, not forced completion**. Obtain owner confirmation before exposing such an option. [D/H; decision D-01]

### 6.4 Family Education Constitution

Create a readable summary of purpose, learning philosophy, challenge, help, autonomy, screens, observation/assessment and fit with family life. Keep the structured settings linked to its version. A template is sufficient at G1; later AI may help phrase it without inventing values. It is family-specific and subordinate to product safety/privacy boundaries. [S01 pp. 69–70; C03]

## 7. Daily experience and interface contract

### 7.1 Navigation

The discussed top-level navigation is **Today, Week, Ask, Insights, Family**. Optional resources, languages and parent learning can be reached from relevant activities or Family. Do not build a giant menu before the core loop. Ask need not be exposed before its gate is ready. [S01 pp. 75–76, 104]

Proposed usability detail: keep core controls readable on phones, keyboard/focus accessible and labelled with text rather than emoji or colour alone. [H]

### 7.2 Today and Week

Today answers what to offer, why it was selected, the effort/materials required and one optional observation prompt. A typical light display may have two to four opportunities, but no count is a required daily quota. Empty/no-plan is valid. The Week view shows direction and preparation burden, with move, replace, lighten and skip actions. Neither view has streaks, overdue lessons, deficits or progress-to-IQ charts. [S01 pp. 77–81, 96–98]

Plans mix **embedded**, **intentional** and **open exploration**. Open exploration is not a timed lesson or completion metric. Language interaction can attach to an existing routine/activity instead of becoming another task. [S01 pp. 45, 78–80, 121]

### 7.3 Activity detail

Show purpose, why selected, materials, setup, adult role, suggested opening language, bounded easier/harder versions, child choices, stop/modify guidance, safety requirements and optional observations. Parent Mode offers quick instructions, guided prompts, educator explanation and deeper sources. Preserve the selected template/version and the actual variant used. [S01 pp. 41–43, 82–85; C02]

The adult can read the preparation then put the device away. Do not require a timer, live child response, camera or continuous screen interaction to complete the experience. Print support is optional later, not a prerequisite for everyday play. [S01 pp. 85–86]

### 7.4 Feedback and Insights

Feedback is optional and brief: engagement, challenge, notable actions and a note. Structured taps require no model call. The app should distinguish “not offered”, “offered but declined”, “tried”, “happened naturally” and “not recorded”; no response is not failure. These state distinctions extend the source for implementation clarity. [S01 pp. 86–89, 100–107, 207; H states]

Insights is **“What we're noticing”**, not a report card. Describe context-bound observations and opportunities recorded. Absence in the log does not establish absence in the child's life. Show whether information is planned, offered, observed or unknown; do not imply complete measurement from selective logging. [S01 pp. 89–92; H missingness clarification]

### 7.5 Parent control and Ask

Low-energy mode reduces preparation, not safety. No-plan mode permits the day to remain open. “Already happened naturally” can replace a scheduled equivalent without marking the parent noncompliant. Ask helps with context changes, disagreements, explanations and trade-offs; it is not the home screen. [S01 pp. 93–107]

Chat returns a proposal for material plan changes, with the affected items and rationale. Applying it uses validated application actions. The record leaves silent versus confirmed mutations partly ambiguous; this package proposes confirmation for material changes and immediate execution for explicit bounded actions such as “skip this”. [H; decision D-12]

## 8. Planning and adaptation engine

### 8.1 Objective and authority

Select a small portfolio of feasible opportunities using current family priorities, child context, observed interests, recent experiences, resources and caregiver availability. Safety/eligibility are hard constraints; utility and preference are ranking factors. A high relevance score cannot rescue an ineligible activity. [S01 pp. 109–120]

The first plan is a conservative **Discovery Week**, with uncertainty stated. Illustrative activity counts are not standardised prescriptions. Information value may break a tie between otherwise suitable options; the child is not a research subject and the app must not add distress or risk to learn about them. [S01 pp. 72–75; H final boundary]

### 8.2 Pipeline

```text
Load authorised family/child state and current policy versions
  -> inspect explicit restrictions and current concerns
  -> identify opportunities, not school-subject quotas
  -> retrieve reviewed guidance and eligible templates
  -> filter safety, materials, time, environment and permissions
  -> rank eligible candidates
  -> select a balanced portfolio with slack and repetition
  -> personalise only permitted fields
  -> validate final activity, references and permitted changes
  -> attach faithful selection reasons and evidence provenance
  -> store versioned plan/audit metadata
  -> present to parent; apply changes under defined controls
```

The later safety pipeline has pre- and post-generation checks. It supersedes early examples that stop at age/time filtering. [S01 pp. 132, 193–194, 208–209, 223–224]

### 8.3 Inputs and constraints

Inputs include supported age context, current interests with evidence/recency, family aspirations, language opportunities, recent activity families, caregiver capacity, materials, preparation/cleanup tolerance, spending constraints, screen policy and explicit safety considerations. Unknown resource availability must not silently be assumed true. [S01 pp. 110–115]

An eligibility decision should return a reason code and the rule/version, not merely a boolean. Missing safety-critical information blocks the candidate or selects a reviewed alternative. Examples include `unsupported_stage`, `unreviewed_template`, `restricted_material`, `missing_supervision`, `time_budget_exceeded` and `unknown_required_context`. These names are proposals, not existing code. [H]

### 8.4 Ranking and portfolio

Rank for developmental opportunity fit, goal relevance, observed interest, challenge, caregiver/context fit, continuity, low friction, variety, repetition and information value. Any numerical weights are tunable engineering heuristics, not scientific constants. The source's example percentages are not adopted as fixed defaults. [S01 pp. 115–119]

Choose a set, not the top N near-identical activities. Balance over rolling windows, avoid daily domain quotas, preserve free time and keep a route for unfamiliar interests. Repetition with engagement may be useful; novelty alone is not success. [S01 pp. 119–125]

### 8.5 Adaptation

Use engagement and challenge together. Low engagement does not imply inability. A failed attempt with enjoyment can merit repetition; a completed task with disinterest need not. Help should be responsive, not withheld until distress. The source support ladder—wait, restate, hint, offer options, demonstrate part, participate together—is optional scaffolding, not a mandatory sequence for every age or activity. [S01 pp. 123–124]

A context event such as travel or a natural outing can replace prepared activities. A parent choosing something else is not noncompliance. Significant changes must show what changes, what remains, alternatives, burden and uncertainty. Stored explanations must reflect actual selection inputs, not post-hoc invented personalisation. [S01 pp. 128–139]

### 8.6 Failure paths

Proposed engineering requirements: a failed model call, refusal, timeout, malformed result or exhausted budget must not destroy the existing plan. Fall back to a compatible reviewed template/deterministic plan or say no suitable recommendation is available. Do not lower safety thresholds, expose raw provider errors or retry indefinitely. Check plan/state versions before applying delayed results. [H; V02]

## 9. Activity and resource knowledge system

### 9.1 Four layers

Use **primitive -> reviewed template -> personalised variant -> activity instance**. A primitive is a general interaction, a template a bounded implementation, a variant a permitted contextual adaptation, and an instance the actual recommendation/experience recorded for a child. These four concepts need not be four tables at the first gate, but must remain distinguishable. [C02; S01 pp. 214–215]

Templates may cover container play, hide/find, stacking, construction, imitation, matching, comparison, pretend play, music, movement, stories, household participation and open exploration. These are conceptual families, not automatically approved activities for every child. [C02; C03]

### 9.2 Template contract

A template includes identifier, version, stage/readiness context, experience type, domains/tracks, materials and constraints, setup/duration/cleanup/cost, environment, supervision, adult role, prompts, choices, stop signals, reviewed simpler/harder options, editable fields, evidence/provenance and review status. The detailed conceptual contract is in `docs/DATA_CONTRACTS.md`. [S01 pp. 41–43, 114–115; C02]

**Green fields:** wording/theme/interest connection within constraints. **Amber fields:** only approved substitutions or difficulty options. **Red fields:** safety requirements, forbidden materials, contraindications, stage exclusions and review/provenance controls. No model is allowed to mark its own generated content approved. [C02; S01 p. 182]

### 9.3 Content lifecycle

Discover/create -> review source -> check rights -> define safety and applicability -> review content -> publish a version -> monitor -> revise or retire. Parent enjoyment is not evidence of safety or developmental efficacy. Model-generated variants remain labelled and bounded; popularity does not automatically promote them into the trusted library. [C02; S01 pp. 189–191]

Prefer available household resources, owned materials, free/borrowable resources, then necessary purchases according to family preferences. Material classes are preferable to brands. Food and small-part substitutions require specific review; “less messy” is never enough to approve a replacement. [C02; decision D-05]

### 9.4 Resource types and evidence

Keep development guidance, experiences and external resources conceptually separate. Content includes activities, routine opportunities, books, songs/rhymes, parent mini-lessons, outings, printables and language packs. Resources carry language/variety, provenance, rights status, applicability and freshness where relevant. Do not reproduce a commercial resource merely because it is educational or publicly accessible. Rights review is a task, not a legal conclusion in this specification. [C02]

Distinguish support for a **general mechanism** from evidence for a **specific activity**. An illustrative bridge game is not a validated intervention because a paper discusses play. The source transcript itself is product history, not scientific evidence for a live recommendation. [C02; S01 pp. 172–177, 187–189]

## 10. Multilingual engine

A language is modelled first as a **communication environment**, not an identical daily lesson block. [S01 p. 142]

For each language, retain role (family/heritage/community/additional/future), caregiver/support access, speaker comfort, contexts, regularity, interaction type, oral goal, literacy goal and active/maintenance/future/paused state. Separate reported exposure from inferred proficiency, receptive observations from expressive observations, and oral goals from reading/writing goals. [S01 pp. 143–162]

A family may use speaker, setting, routine, topic or natural mixed-language patterns. The app must not enforce one-parent-one-language, treat mixing as failure, or impose equal proficiency. Those are source-derived product directions; clinical explanations supplied to users still need reviewed sources. [S01 pp. 147–149]

Use sustainable anchors such as a story, dressing routine or shared play, subject to caregiver capacity. Keep richer communication available in a language the adult can comfortably use. When nobody can provide meaningful interaction in a desired language, explain support options, realistic goals and opportunity cost rather than promise fluency. [S01 pp. 150–159]

Parent language packs attach to a context/activity and may later include script, meaning, romanisation where useful and audio. Record language variety, provenance and review status; do not label an unreviewed translation as native-quality. Audio and exhaustive language coverage are later scope. [S01 pp. 152–154]

Review sustainability without guilt. A routine that rarely happens may need a simpler context, support, postponement or a changed goal. Heritage-language choices follow explicit family preferences, not inferred identity. Language concerns route to the safety lane; no automatic diagnosis, reassurance that “it is just bilingualism”, or instruction to drop a home language. [S01 pp. 155–160]

## 11. Safety, concerns and evidence integrity

### 11.1 Three response lanes

| Lane | Allowed product behaviour | Prohibited shortcut |
|---|---|---|
| Education | Explain and adapt reviewed learning opportunities. | Inventing material safety from a prompt alone. |
| Development-related concern | Organise parent observations, communicate uncertainty, surface reviewed professional-care guidance. | Diagnose, calculate developmental risk, dismiss a concern or prescribe exercises as treatment. |
| Potentially urgent health/safety | Interrupt ordinary planning and surface a separately reviewed, jurisdiction-appropriate escalation path. | Continue as if it is merely a curriculum question. |

The concern-routing system is not itself a validated diagnostic/triage tool. Specific escalation copy, clinical thresholds and local contacts need qualified review before live use. Do not hard-code the historical screening schedule in the transcript as universally current. [S01 pp. 165–171]

### 11.2 Activity safety

The source hazard taxonomy includes choking/ingestion, suffocation, cords/strangulation, water, falls/heights, sharp/hot/electrical/chemical hazards, food/allergy, heavy objects, entrapment, outdoors/roads, animals/plants and recalls. Map actual materials, dimensions and context rather than trust an adjective such as “safe”. Supervision does not automatically make a blocked material acceptable. [S01 pp. 178–182]

Review before and after permitted AI changes. Rule checks enforce known constraints, but do not prove a novel activity safe. Unreviewed physical substitutions and uncertain safety-critical context should not be executed in the live planner. Preserve an incident-report path separate from engagement feedback; support retirement of affected templates. [S01 pp. 182, 191, 193–194; H fail-closed detail]

### 11.3 Claims registry

Each significant claim needs an ID, type, approved wording, source provenance, scope, evidence status, review date/due date and disallowed overstatement. Distinguish scientific findings, professional guidance, safety/legal requirements, educational practice, product heuristics, parent reports and child-specific inferences. Do not claim a source is current or reviewed merely because a URL exists. [S01 pp. 172–177]

A claim checker verifies that wording is supported, including population/context and degree of certainty. If not supported, remove, narrow or escalate for review. Never fabricate a reference or let a model grade its own statement into an approved claim. Marketing must obey the same evidence boundaries. [S01 pp. 187–189]

## 12. Architecture and data boundaries

### 12.1 Chosen direction, not an instruction to replace working code

The later discussion converges on **Next.js App Router + React + TypeScript + Supabase PostgreSQL/Auth + a server-side AI service**, using schema-bound outputs and the Responses API when AI is introduced. Earlier FastAPI/Clerk/extra-database suggestions are alternatives, not simultaneous requirements. Use the actual repository lockfile, folder layout and package scripts after inspection. No framework upgrade or starter recreation is authorised by this document. [S01 pp. 17, 198–203, 229; C03]

### 12.2 Responsibility split

Normal code handles authentication/authorisation, persistence, input validation, age context, resource/time filters, safety rules, candidate/reference validation, recency, duplicate prevention and audit records. Model calls handle bounded free-text extraction, explanations, contextual wording, trade-off proposals and selected planning tasks. Models have no arbitrary SQL, secret access, membership administration or direct authoritative writes. Imported resources and parent notes are untrusted data, never instructions that can expand tool permissions or override the product rules. [H trust-boundary clarification] [S01 pp. 201–209, 221–224]

```text
Parent UI
  -> authenticated server/application boundary
  -> authorised database operations + deterministic rules
  -> curated candidates and reviewed claims
  -> optional bounded model proposal
  -> schema + domain + authorisation validation
  -> authorised mutation / unchanged safe fallback
```

Structured outputs constrain shape, not correctness. Handle refusals/incomplete responses and validate semantics, source references, permitted fields and tenant ownership before storing. This is a verified vendor limitation and an engineering requirement, not a criticism of the selected model. [V02; H]

### 12.3 Logical entities

The persistent model covers users/auth identities; families; family memberships; children; preferences; caregivers and their languages; aspirations and child language goals; activity templates; plans and instances; observations; interests; inferences; evidence claims; resources. Optional protected considerations and concerns require explicit boundaries. [S01 pp. 161–162, 214–217; C01; C03]

The table inventory in earlier replies is a **design sketch**, not authoritative deployed DDL. Preserve existing names when they implement the same semantics. Before altering a schema, inspect migrations and compare actual database state. `docs/DATA_CONTRACTS.md` defines relationships/invariants without assuming a migration has run.

### 12.4 Tenant and role protection

Every personal row and linked reference must resolve to an authorised family/child. The model can suggest an ID only from authorised candidates; the server validates it again. Constraints should prevent an observation for Child A linking to an instance for Child B, including within one family. [D/H; S01 pp. 200, 223; C03]

The historical RLS examples distinguish family membership but do not distinguish viewer writes. **Do not copy them as a security-complete implementation.** Proposed role contract: owner manages the family and membership; caregiver has explicitly granted operational access; viewer is read-only; content approval is an internal editorial permission, not a family-owner permission. Invitation and role mutation can remain unimplemented. [H; decision D-04]

Protect exposed tables with intentional grants and RLS; inspect views, functions, storage and service-role paths separately. Privileged helper functions need deliberate placement, caller checks and execution grants. A successful query in an administrative SQL editor does not prove user-level isolation. Test anonymous access, unrelated families, same-family viewer writes and cross-linked IDs through the actual app/API credentials. [V03–V05; H]

### 12.5 Reliability and mutation safety

Proposed release invariants: family/member/first-child creation must be atomic or explicitly recoverable; retries must not duplicate households, plans or observations; failed AI extraction must not lose the parent's original feedback; updates must detect stale versions; blocked writes must not partly apply. Store immutable plan/template versions or sufficient snapshots to explain historical outputs, subject to retention rules. [H; S01 pp. 189–190, 217; C03]

## 13. AI use, model transitions and costs

The model used **by Codex to develop MIRA** is separate from the models **MIRA calls at runtime**. Switching the coding assistant must not silently rewrite production model configuration, pricing assumptions or product scope. The user reports starting development in Codex with Sol Medium; the repository and exact configuration were not inspected. [R; C05]

Use configurable runtime roles such as `extractor`, `planner` and `parent_assistant`. Select actual model identifiers and supported settings from current account/documentation when integrating. Historical Luna/Sol/Astra prices and model rankings remain historical discussion, not a permanent contract or a verified operating estimate in this package. [S01 pp. 205–206, 218–222; O]

Reduce spend by storing structured answers directly, processing free text only when needed, reusing reviewed wording, bounding input/output, retrieving compact state and avoiding unnecessary live research. Record per-feature usage and verified rates. Cache family-specific content only with correct tenant/version boundaries. [S01 pp. 207–213, 221–222; H cache isolation]

Do not label a dashboard budget notification a guaranteed hard stop. Current vendor documentation distinguishes spend alerts from separately enabled hard spend limits; enforcement can lag and a reached hard limit can interrupt requests. Verify the actual account setting. An app-side request budget, concurrency-safe reservations and bounded retries are a separate proposed control. Actual rates, storage, hosting, email, research/content review and support costs remain to be measured. [V06; H]

API data controls must be reviewed for the exact endpoints/features used. Do not promise zero provider retention simply because application logging is disabled or a `store` option is false. Minimise payloads and record the chosen provider data settings before a real-child pilot. [V07; H]

## 14. Privacy, observability and content rights

Use synthetic family data during development. Do not commit real child profiles, audio/video, professional documents, credentials, database dumps or raw production prompts to the repository. This package does not include such data. Keep sensitive considerations separately permissioned and purpose-limited. [C01; C03; S01 p. 192]

Parents need understandable storage/explanation controls, correction and deletion. Define how deletion affects observations, inferences, summaries, cached recommendations, provider-held files and backups. Retention periods, lawful basis, consent wording, subprocessors, supported jurisdictions and any child-data policies are unresolved launch work, not legal assurances. [C01; H]

Audit enough to explain decisions and incidents without indiscriminately storing raw sensitive conversations. Separate product usage measurements from child ability claims. Never turn developmental profiles into advertising segments. Use external materials only after checking rights and required attribution. [C01; C02; S01 pp. 190–192]

## 15. Evaluation and release acceptance

### 15.1 What passing means

A working prototype proves the parent flow persists and is isolated; it does not prove educational benefit. A model response that looks plausible does not prove safety. A documentation checker passing proves only the package is structurally consistent. [H]

The acceptance catalogue covers permissions, cross-child consistency, onboarding, refusal, material changes, uncertainty, language support, memory correction, portfolio constraints, evidence, cost/failure handling and handover. Each scenario has explicit expected/forbidden behaviour and a pending execution state. The source proposed 50–100 examples; this package supplies concrete cases rather than claim they already ran. [S01 pp. 194, 228]

### 15.2 Gate-specific evidence

G1 requires repeatable auth/persistence and negative access tests. G2 requires the parent experience loop without AI. G3 requires faithful extraction and unknown handling. G4 requires candidate/reference validation, bounded adaptation and graceful failure. G5 requires reviewed live content, incident/escalation pathways, privacy operations, access tests and owner acceptance. Public launch requires a separate readiness decision and relevant expert review. [D/H; S01 pp. 188–194, 229–231; C03]

Measure practical usefulness: clarity of instructions, effort to prepare, ease of skipping/replacing, whether parents understand why, whether corrections change recommendations, and whether failures preserve work. Time estimates and engagement reports are UX signals, not validated learning outcomes. [S01 pp. 21–22, 77–107]

## 16. Current state and unresolved decisions

**Known from this conversation:** the founder has begun work in Codex; a Supabase dashboard named MIRA was shown; project setup instructions and SQL examples were discussed. By 30 September, the founder reports an existing app and dissatisfaction with its UI/UX and AI handling. This is a reported state, not a verified screen or code audit. [C06] **Not known:** repository URL/branch/commit, files implemented, migrations actually applied, tests passed, deployment status, current model configuration, production data use or whether the GitHub connection issue was resolved. [R; C03–C05]

Do not infer the sister's location, exact child age, languages, caregiving arrangement, availability, cultural preferences or budget from illustrative examples. These remain onboarding/user-research questions. [S01 pp. 22–24, 162–163]

Before the pilot, decide the supported age boundary, initial real language coverage, clinical/content reviewers, retention/deletion policy, role permissions, exact plan budget/defaults, approved adaptation level, concern-routing pack, model configuration and rollout scope. See the decision register for owner and blocking gate.

## 17. Definition of done for any coding task

A task is complete only when the requested change is implemented within approved scope, relevant tests are executed or explicitly reported blocked, user work is preserved, new data access is authorised and tested, migrations are documented, and status/decision records reflect actual evidence. A model must report files changed, commands run, results, limitations and next specific milestone—never invented success. [H; C05]

Before modifying code after a model/session change: read the applicable instructions; inspect Git state, package scripts and migration history; compare implementation with this baseline; flag conflicts; then propose the smallest next change. Do not recreate the project, run destructive SQL, overwrite local work, publish, purchase services or rotate credentials without explicit authorisation. [H; C03–C05]

---

## 18. Competitive research and controlled experience redesign — v1.1

**Provenance:** C06 is the founder’s 30 September request for a distinctive, intuitive UI and better-controlled AI using Impeccable. C07 is the request to research competitors and update this specification. W01–W41 are dated public research sources. All specific design/engineering additions below are **H — proposals pending owner adoption**, unless an existing requirement already establishes the same boundary. Research is not an implementation instruction or approval.

### 18.1 Positioning and evidence discipline

The September research found material overlap with MIRA’s individual concepts. Do not claim that parent-only AI, routine-based activities, family preferences, selective regeneration or user control are unique features. A possible advantage is better execution of the family learning loop and multilingual-context fit; validate it with caregivers rather than treating it as established. [W01, W04, W17, W23–W24]

`docs/COMPETITIVE_RESEARCH.md` distinguishes vendor claims, product documentation, actual visual observations, public repository evidence and original MIRA recommendations. Absence from a public page is not proof that a feature is absent. Do not present a public mockup as an installed-app test or a public component library as a competitor’s complete application source.

### 18.2 Founder approval is different from parent control

For development, use the sequence **audit → proposed workflows → comparable previews → owner choice → one bounded implementation → review**. Preserve existing code and local work. Do not change auth, RLS, migrations, provider configuration, production prompts, dependency stack or product scope during a cosmetic redesign without a separate approval.

Compare three visual directions on the SAME synthetic Today, Activity and change-preview flow, including empty/failure states. The proposed directions in `docs/DESIGN_DECISIONS.md` are alternatives, not a selected brand. Keep useful standard interactions, readable type and multilingual coverage; novelty is not a reason to reduce accessibility. Any `PRODUCT.md` or `DESIGN.md` used by Impeccable is a derivative brief, subordinate to the adopted master and recorded owner decisions, not a new product authority. [C06–C07; W33–W37]

### 18.3 Task-first information architecture

Today prioritizes a suitable next experience, its effort/materials and a short real reason. Secondary routines should not compete visually with the primary action. “Leave today open” and a lighter day remain valid. Existing Today/Week/Ask/Insights/Family navigation is the baseline to test, not permission to add more top-level modules. Ask remains contextual and gated, not the application’s only control surface.

Activity preparation shows what the adult does, materials and readily accessible safety/stop guidance. Deeper parent education and evidence use progressive disclosure. Do not remove provenance or controls merely to make a screen sparse. Observations, source facts and tentative interpretations have different visual states. No child photograph is required. [W03, W09, W15–W20; existing sections 5–7]

### 18.4 Bounded changes, pinning and reversal

Model-generated or broad changes use the proposed contract in `docs/AI_INTERACTION_CONTRACT.md`: draft, validated proposal, parent acceptance, current-state revalidation and a single authorized commit. The preview names affected items, preserved/pinned items, burden changes and uncertainty. It provides an unchanged-plan option. A blocked/safety-invalid proposal cannot be accepted.

Explicit bounded parent actions such as “skip this activity” or saving a direct observation may execute without an unnecessary second confirmation. Show the result and feasible reversal. Pinning protects a parent’s choice from automatic replacement, not from a newly applicable safety block. If an item becomes ineligible, explain that and offer reviewed alternatives; do not keep it active merely because it was pinned.

An undo creates a compatible new state and must not erase later observations or other authorized work. Stale results, duplicate submission and conflicting updates do not silently mutate current state. A review click cannot broaden permissions, relax safety or authorize future unrelated changes. [W04, W09; D-12; existing sections 8 and 12]

### 18.5 Meaningful non-AI use and explicit data choices

Propose a parent-controlled non-AI mode: reviewed content, already-saved plans and direct observations remain usable with a functioning application backend. Optional AI extraction, chat and generation are unavailable when the relevant processing permission is off. Enforce this on the server and recheck queued requests, not only by hiding a button.

Before an external AI transfer, describe actual data categories, providers, purposes and relevant retention/observability arrangements. Material changes need a reviewed consent/version process. Withdrawal stops new transfers covered by that permission; historical deletion follows a disclosed process and must not be falsely described as immediate deletion everywhere. No-AI, AI failure and loss of network connectivity are different states. This is a proposed product/engineering control, not a legal-compliance certification. [W23–W25; existing sections 13–14]

### 18.6 First value, family resources and observation integrity

Offer a synthetic sample so parents can understand the service without entering a detailed profile. A real recommendation still needs age context and required safety/resource information. Use progressive profiling; avoid repeating completed questions. Preserve parent-written observations before any model processing. Show extraction as tentative, preserve unknowns and allow correction without restarting onboarding.

Prefer owned materials and parent-provided resource references. Do not implement a general web-to-curriculum importer, compliance portfolio or multi-child timetable merely because a competitor advertises one. Such capabilities remain deferred until separately approved with rights, safety and privacy review. Multilingual UI availability is not evidence of an effective language-exposure plan. [W04–W09, W15–W19; existing sections 6, 9–10]

### 18.7 Design states and validation

Target WCAG 2.2 AA and verify actual controls, keyboard access, focus, contrast, reflow and non-drag alternatives. A preferred 44px touch target is MIRA’s proposed usability target, not a statement that WCAG AA always requires 44px. Show distinct empty, loading, generating, stale, declined, disabled, saved and failed states. Never display a successful save when the backend has not confirmed it. Test long labels, text enlargement and the scripts in approved language coverage. [W37]

Ordinary navigation, reading a saved plan and structured feedback should not trigger new model calls. Evaluate relevant context, output length, bounded retries and actual need for AI together with fidelity and permissions. An attractive answer or fast generation is not enough. Usability targets and the small pilot sample in the research report are hypotheses, not validated educational results. [W12–W13; existing sections 13 and 15]

### 18.8 Open-source and content reuse

A freely accessible app or article is not automatically open-source or licensed for commercial modification. Public utilities are not core product code. Before reuse, record the exact artifact/commit, license, attribution/notice obligations, dependency impact and separate asset/content rights. Do not import third-party instructions or execute installation scripts without inspection/approval. Current research references are optional engineering inputs; none requires changing MIRA’s stack. [W18, W21, W26–W34, W38–W40]

### 18.9 Adoption and implementation status

The package adds MIRA-CMP-001 through MIRA-CMP-024 and AT-077 through AT-100. All 76 original requirement and scenario records are retained unchanged. Added application scenarios are NOT RUN. D-21 through D-28 are pending owner decisions. `docs/RESEARCH_CHANGES.md` explains the delta and merge approach. The founder reports an app exists; its current UI, runtime AI, repository and deployed schema remain uninspected here. No current implementation is certified or replaced by this package.


## Reference and operating files

`docs/SOURCE_MAP.md` contains historical provenance and limited current technical verification. `docs/DEVELOPMENT_MATRIX.md` preserves the original matrix. `docs/DATA_CONTRACTS.md` records conceptual fields and invariants. `docs/DECISIONS_AND_OPEN_QUESTIONS.md` prevents silent reconciliation. `docs/PROJECT_STATUS.md` separates reported and verified work. `docs/ROADMAP.md` defines the gates. `docs/REQUIREMENTS.json` indexes requirements. `evals/ACCEPTANCE_TESTS.md` and its JSON companion define pending acceptance scenarios. `docs/HANDOVER.md` provides the first Codex prompt. The v1.1 research, AI interaction, design, source register and Impeccable documents support section 18; they do not override the master.

**The operating rule:** preserve the original intent, make uncertainty explicit, inspect what actually exists, and change the system through small, reviewable, tested decisions.
