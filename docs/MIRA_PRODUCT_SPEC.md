# MIRA product specification

This document is the working source of truth for MIRA. It distills the complete 231-page product conversation in `MIRA idea log.pdf`. When implementation choices conflict with this specification, the conflict must be made explicit and resolved before development continues.

## Product definition

MIRA is an adaptive, evidence-informed parent copilot for ages 0-3. It translates family aspirations into developmentally appropriate, primarily offline experiences embedded in everyday life, teaches the parent how and why to facilitate them, and adapts future plans from cautious interpretations of caregiver observations.

MIRA is not a child-facing learning app, a school timetable, a developmental assessment, a performance dashboard, a giant activity catalogue, or a general chatbot with a parenting prompt.

The product promise is:

> Tell me what is appropriate for my child now, why it matters, how to do it with the time and resources I have, and what to change based on what happened.

## Non-negotiable principles

1. **Child first.** Adult ambition never overrides developmental appropriateness, physical or emotional safety, sleep, health, responsive care, or the child's agency.
2. **Capability without coercion.** Opportunities are offered, not imposed. Refusal, redirection, and stopping are meaningful signals rather than non-compliance.
3. **Parent-facing technology, child-facing reality.** The adult uses MIRA; the child experiences caregivers, books, objects, conversation, play, nature, movement, culture, and other people.
4. **Holistic development.** Intellectual opportunity does not displace relationships, emotional security, physical development, creativity, or social participation.
5. **Evidence before confidence.** General claims come from reviewed sources. Child-specific conclusions stay traceable, cautious, temporary, and correctable.
6. **Observation is not diagnosis.** MIRA organizes patterns and concerns but does not score intelligence, diagnose, or perform developmental screening.
7. **Explain the why.** Recommendations, changes, and inferences retain their reasons and evidence.
8. **Alternatives, not commands.** Meaningful choices show trade-offs and preserve parental authority unless a safety boundary applies.
9. **Parent education.** MIRA should make the caregiver progressively more capable of adapting learning opportunities without it.
10. **Long horizon, short planning.** Maintain direction over years and months, but make detailed plans only for the immediate future.
11. **Restraint is intelligence.** MIRA should sometimes recommend nothing, remove an activity, admit uncertainty, or refer a concern rather than generate more content.

## The four-layer learning model

### Layer 0: protected conditions

- Health and sleep
- Nutrition boundaries
- Physical and emotional safety
- Responsive caregiving
- Opportunities to learn
- Caregiver capacity and wellbeing

These are constraints, not competitive goals. No aspiration or recommendation may override them.

### Layer 1: nine core human capabilities

1. Relationships and attachment
2. Emotional development and regulation
3. Communication and language
4. Physical and motor development
5. Cognition and problem solving
6. Executive function
7. Curiosity, play, and creativity
8. Independence and practical capability
9. Social participation

These are not school subjects and must not be reduced to one activity category each. A single experience may support several capabilities.

### Layer 2: educational and enrichment tracks

- Languages
- Literacy and literature
- Mathematics
- Science and nature
- General knowledge
- History and culture
- Geography
- Art and design
- Music
- Physical pursuits
- Making and practical skills
- Technology and computation
- Ethics and philosophy
- Leadership and biographies

Tracks sit on top of development. A parent's aspiration for mathematics at 18 months may translate into sorting, quantity comparison, spatial language, stacking, prediction, and cause-and-effect play—not formal arithmetic.

### Layer 3: family-specific aspirations

Family goals are prioritized aspirations, not requirements imposed on the child. They are translated through age/stage suitability, observed capabilities, current interests, family environment, available caregivers, and protected conditions before becoming an experience.

## Planning horizons

- **Long term (1-3 years):** broad direction and family aspirations.
- **Medium term (1-3 months):** a small set of current themes, exposure strategies, and parent-learning goals.
- **Immediate (today/this week):** concrete, optional opportunities that fit current family reality.

Specificity decreases with distance. MIRA replans rather than pretending a detailed multi-year curriculum will remain accurate.

## Family Learning Profile and Constitution

Onboarding should begin with high confidence about the family and low confidence about the child. It should collect progressively:

- the family's purpose and desired qualities;
- prioritized enrichment aspirations;
- caregivers, availability, interests, and roles;
- language environment and realistic proficiency;
- everyday routines that should be protected;
- time, energy, budget, space, materials, and transport constraints;
- screen policy;
- autonomy, refusal, challenge, and help philosophies;
- parent explanation depth;
- negative preferences and explicit exclusions;
- optional accessibility needs, professional guidance, and concerns;
- schooling intentions.

The default experience is conversational and branch-aware, with quick and detailed paths. AI may extract structure from free text, but the user must see “Here is what I heard” and correct it before storage.

The verified result becomes a concise Family Education Constitution and structured rules used by planning.

## Daily experience

The home screen answers four questions:

1. What matters today?
2. Why these opportunities?
3. How much parent effort is required?
4. What, if anything, might be worth noticing?

It should usually show a small portfolio rather than one lesson or seven equal tasks:

- **Embedded opportunity:** learning inside a routine already happening.
- **Intentional activity:** a deliberately prepared experience.
- **Open exploration:** explicitly protected, unstructured time.
- **Language opportunity:** a suitable caregiver, context, and language attached to real interaction.

The parent's available time is a ceiling, not a target. There are no overdue activities, completion streaks, or missed-task guilt.

## Activity knowledge model

An activity is a reviewed primitive with structured metadata, not a title and a paragraph. It should eventually contain:

- age/stage applicability;
- core capabilities and enrichment tracks;
- family goals it may support;
- experience type;
- developmental and information value;
- materials and substitutions;
- cost, setup, cleanup, time, travel, screen, and caregiver-skill friction;
- parent preparation and layered explanation;
- step-by-step flow;
- adult role and support ladder;
- child choices and autonomy;
- “make easier” and “extend” variations;
- stop/modify signals;
- what not to teach, quiz, or directly correct;
- observation prompts;
- hazards, supervision, and deterministic safety rules;
- possible next experiences;
- claims, sources, provenance, review status, and version.

Resources attach to a selected activity or parent need. A searchable library may exist, but it is not the centre of the product.

## Feedback and child state

Structured feedback should take roughly ten seconds and capture:

- engagement;
- challenge fit;
- repetition;
- help requested;
- independent attempts;
- child redirection or invention;
- loss of interest;
- optional text or voice note.

Known values are stored directly without AI. AI is useful only for extracting cautious, structured observations from free text or voice.

Interest signals are contextual, confidence-bearing, time-decaying, and traceable to evidence. MIRA may infer that construction formats are currently engaging; it may not label a child a “visual learner,” score a capability, or infer inability from low engagement.

## Planning and recommendation engine

The planner is a bounded pipeline:

1. Load the current family, child, caregiver, language, and context state.
2. Apply protected-condition and child-specific constraints.
3. Identify useful developmental opportunities.
4. Retrieve approved claims and activity primitives.
5. Apply deterministic safety eligibility.
6. Apply deterministic constraint eligibility: time, materials, cost, screen, caregiver, recent rejection, and accessibility.
7. Rank eligible candidates using configurable product heuristics: developmental fit, family-goal fit, current interest, challenge, friction, rolling balance, continuity, novelty, and information value.
8. Build a balanced weekly portfolio—not merely the top N activities.
9. Protect slack and reject overload.
10. Use AI only where valuable: portfolio judgement under trade-offs, minor personalization, parent wording, or unusual context.
11. Validate AI output against IDs, rules, schemas, safety, and approved claims.
12. Store reasons, inputs, versions, and audit data with the plan.

Balance operates over rolling days and weeks, not daily subject quotas. Repetition can be desirable; current interests should deepen engagement without trapping the child in one theme.

## Multilingual engine

A language is a communication environment, not automatically a lesson. Each language needs:

- role: natural family, heritage/community, supported additional, parent-learning, or future aspiration;
- oral and literacy goals kept separate;
- caregiver proficiency and confidence;
- sustainable people, routines, settings, and interaction types;
- receptive and expressive observations kept separate;
- dialect or variety where relevant;
- provenance and review status for vocabulary, phrases, and audio.

MIRA matches a language to a suitable caregiver, activity, and natural context. It does not promise fluency, enforce one-parent-one-language, treat code-switching as failure, or blame multilingual exposure for developmental concerns.

## Safety and evidence architecture

Safety has veto power over usefulness, preference, convenience, and novelty.

MIRA uses three response lanes:

- **Education:** normal activity and parent-coaching work.
- **Development-related information:** general reviewed information, uncertainty, and appropriate professional guidance without diagnosis.
- **Health or urgent safety:** stop educational problem-solving and show reviewed, region-appropriate escalation guidance.

Required structures include:

- a hazard taxonomy and deterministic activity rules;
- region packs for guidance, services, and privacy context;
- a claim registry with source tier, approved/forbidden wording, evidence strength, review dates, and freshness;
- explicit parent concerns separate from AI inferences;
- content and rule versioning;
- plan-generation audit records;
- post-generation safety and claim validation;
- incident reporting and a permanent adversarial evaluation suite.

The initial product does not perform developmental screening. Loss of previously acquired skills and other significant concerns must route to reviewed professional guidance rather than more activities.

## Role of AI

Normal software owns authentication, access control, age calculation, storage, safety blocks, activity eligibility, material/time checks, recency, exposure, time decay, portfolio limits, validation, and database writes.

AI is appropriate for:

- free-text onboarding extraction;
- free-text or voice observation extraction;
- activity personalization inside approved boundaries;
- recommendation explanations;
- parent tutoring;
- complex trade-off analysis;
- unusual family contexts;
- structured portfolio selection among pre-filtered candidates;
- conversational questions in the Ask experience.

The model never receives arbitrary SQL access and never writes directly to the database. It returns a structured proposal; application code validates and applies permitted changes.

Chat exists as **Ask your learning copilot**, but structured product surfaces handle routine work. The product must never collapse into a blank chat box.

## V0.1 scope

The first release tests whether the adaptive parent-planning loop is useful:

- one family and one active child in the primary experience;
- ages 0-3;
- conversational onboarding and a verified Family Education Constitution;
- Today and Week portfolios;
- 20 initial activity primitives growing toward 50-80 reviewed templates;
- embedded, intentional, language, and open opportunities;
- rich activity detail and Parent Mode;
- quick structured feedback and everyday observations;
- simple multilingual environment planning;
- parent explanations and Ask;
- deterministic safety rules and a small reviewed claim registry;
- responsive parent-facing web experience.

Postpone child accounts, school-age curriculum, diagnostic assessment, video analysis, a marketplace, a child-facing gamified app, thousands of activities, fully autonomous agents, fine-tuning, and complex native applications.

## Primary navigation

- **Today:** what is useful now.
- **Week:** the current portfolio and its direction.
- **Ask:** context-aware conversational copilot.
- **Noticing/Journey:** observations, interests, exposure, and cautious inferences.
- **Family:** constitution, goals, child context, languages, preferences, privacy.

Resources and activity discovery are contextual tools, not a permanent primary destination.

