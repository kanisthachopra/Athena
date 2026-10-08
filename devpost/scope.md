---
doc: scope
status: approved
---

# Athena

**Owner correction, 8 October 2026:** Offer two entry modes: a bounded, genuinely explorable game world with a moving parent avatar, enterable buildings and in-world NPC guides; and an efficient mode with direct access to the same plans, resources and guides. Static illustrated-town previews were rejected as the immersive experience. This later decision supersedes any lighter “game-like” interpretation below. Art and controls still require owner evaluation; see ATHENA-PLAYABLE-WORLD in the decision register.

Approved by the owner on 7 October 2026: "No, this works well now." Consolidates the reset interview and recorded owner decisions. Scope approval establishes the first-release direction; explicitly unresolved behavior and design details remain open. This is not an implementation report. Read alongside the adopted source of truth and later owner decisions; conflicting historical scope is superseded by this approved direction.

**One line:** Athena helps caregivers find, understand and use existing educational resources for a young child's foundational development, through a beautifully illustrated town, conversational guides and an adaptive daily plan.

## The Unique Kernel

A parent can speak a real need to a friendly building guide, discover useful resources, understand how to use them, then return with observations that improve the next plan. The polished game world makes this process inviting and understandable. Both resource usefulness and visual execution are essential to the product's identity; uniqueness is not a claim that no competitor has similar features.

## Who It's For

Parents, guardians and other caregivers in India supporting children aged 0–6, including families exploring homeschooling and families supplementing everyday learning. They want guidance without technical AI knowledge or having to assemble their own web-research workflow. The adult operates Athena. Recommendations must distinguish infant, toddler and preschool needs rather than treating the age range uniformly.

## The Core Loop

1. **Arrive:** A short, animated introduction asks child age, caregiver priorities and language context before account connection. No affordability question or long qualifications survey.
2. **Choose today's focus:** Enter the town square and open the daily board. Day one introduces the experience and helps select a foundational area; later days use saved preferences and reflections.
3. **Visit a building:** A simple visual path leads to the relevant guide. Choose today's resources or speak a request in English. Brief NPC dialogue responds on screen, with an explicit follow-up action.
4. **Explore resources:** Choose among real videos, reading and other suitable source formats, with meaningful thumbnails, source links and concise reasons for relevance. Resources can support adults who do not speak a chosen target language.
5. **Understand:** A short entry transition opens the resource experience. Present material inside Athena where access and rights permit; otherwise provide a clear source-opening route. The guide offers a concise grounded summary and practical takeaways from inspected content, with attribution. Do not imply a video was understood without access to its content.
6. **Use and reflect:** The caregiver has an opportunity to use the resource with the child, then returns for a short spoken reflection about use, usefulness and observed response.
7. **Adapt:** Reflections improve subsequent resource choices and daily planning. The next level follows the use-and-reflect step, not an arbitrary timer. Additional resources remain available; gently suggest breadth across foundations without forcing a switch.

## Inspiration & Identity

[Duolingo](https://www.duolingo.com/) and [Brilliant](https://brilliant.org/) are owner-provided experience references, not asset sources or claims of visual inspection. Athena should feel warm, animated, welcoming and lightly gamified, with the maturity to appeal to adults around 30–35. The owner explicitly makes well-developed graphics a key attraction, not optional late polish.

The world includes a town square, recognizable buildings, a parent avatar, a female lead guide and expressive building characters. A starfish is the leading mascot concept; final design is open. Use coherent illustrations, thoughtful proportions, readable dialogue, real resource previews, smooth transitions and subtle character expressions throughout onboarding, town, building, resource and reflection screens. Avoid a generic dashboard reskinned with game icons. No complex 3D game requirement.

Propose a distinctive warm/calm palette without red or pink as its main color. Final palette, building taxonomy and visual composition need concrete previews. Keep text short, navigation legible on phone and desktop, and motion comfortable with a reduced-motion alternative. Exact navigation and accessibility behavior belong in the PRD.

## Why This Matters

The owner wants families to translate their hopes into thoughtful support for the child. The product should make existing resources accessible to caregivers who do not know how to orchestrate technical AI tools. Core usefulness and a beautiful experience take priority over peripheral account-page polish.

## First Release Boundary

- Foundational development for ages 0–6, initially India. Research the developmental categories before naming all buildings; the previously mentioned nine domains are not an approved scientific taxonomy. Use appropriate evidence, including WHO where relevant, without claiming blanket endorsement of resources.
- Resource discovery, a useful browsable collection, source-grounded comprehension support, an adaptive daily planner and saved progress/reflections.
- English voice input for guide conversation and reflection from the first release. Concise text replies are required; a short optional spoken paraphrase remains a proposal. This is not a full real-time voice character simulation.
- Eleven resource languages: English plus ten foreign languages. Proposed foreign set: Mandarin Chinese, Japanese, French, Spanish, German, Korean, Italian, Portuguese, Arabic and Russian. Exact set is submitted with this draft for approval. Home languages remain profile context; studying all eleven is never a requirement. Language varieties must be identified per resource.
- Resource paths/levels represent the caregiver's learning journey and topics explored, not a diagnostic score or proof of the child's development.
- A functional, coherent visual journey, including real thumbnails, lesson-entry motion, resource presentation and NPC dialogue. Illustrations and animation are part of acceptance, not postponed to a hypothetical future release.
- Appropriate account continuity, data controls and useful failure handling support the core flow. No promise of professional medical expertise or of verified educational efficacy.

This is the owner's requested useful first product, not the curriculum's default tiny 2–4-hour experiment. Technical feasibility, sequencing and estimates follow inspection and research, not an invented delivery promise.

## What Working Looks Like

A caregiver enters a few preferences, reaches a polished town and speaks a specific need. Athena returns relevant, working source links with recognizable previews; the caregiver can open a resource and receive a faithful explanation. They use what suits the family, return with spoken feedback, and see that feedback meaningfully affect the next recommendations. Their plan and progress persist when they return.

Visual acceptance spans the whole loop: onboarding, town, building conversation, resource consumption and reflection must feel like one finished product. Owner review should use actual representative screens and motion before broad implementation. Resource retrieval, speech input, grounding, persistence and adaptation must work with real services during verification; a beautiful static mockup is insufficient. Equally, functional forms with placeholder artwork do not satisfy the visual requirement.

## Later

Older children, teenagers and independent child accounts; full school-subject/curriculum coverage; additional resource languages and Indian-language collections; non-English voice/UI; potentially original educational content through a separate future decision. Teen privacy/oversight remains unresolved and outside this release.

## Explicitly Cut

- Athena-authored activity generation and its reviewer dependency: rejected by the owner in favor of existing resources.
- Mandatory child quizzes, performance ranks or time-based lockouts: not the intended progression model.
- Long onboarding, affordability questions and compulsory typed conversational input: conflict with the intended ease of use.
- Elaborate game mechanics that obstruct resource access, or copied reference-app characters/assets: neither is needed for the intended experience.

## Decisions To Resolve In The PRD And Technical Plan

Exact developmental buildings; resource sourcing and quality criteria; free/paid resource policy; unavailable/blocked-source behavior; minimum useful coverage per language and age group; lawful in-app display and thumbnail use; progression when a resource is unsuitable or cannot be tried; transcript correction and microphone fallback; parent control over adaptation; optional voice output; concrete visual previews and palette. These gaps do not silently become approved behavior.

Research must compare search/content and speech APIs, capable models, and whether any custom ML or training data is necessary. No provider migration or custom model training is selected by this scope. Reconcile the existing G0 audit and code with this replacement direction before implementing it; preserve existing work and family data.
