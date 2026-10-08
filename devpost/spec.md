---
doc: spec
status: draft
---

# Athena — Technical Blueprint

**8 October implementation addendum.** Owner now explicitly requests an actual explorable world and an efficient alternative. A bounded prototype uses lazy-loaded Three.js 0.186.1 within the existing Next.js client boundary; it does not replace the framework. Procedural meshes/materials avoid introducing unlicensed game assets. Both modes share synthetic React plan/save state during a visit. No persistence or provider integration is implied. Production renderer budgeting, content contracts and live connections remain draft. Earlier “illustrated town” wording is superseded for immersive mode.

7 October 2026. First technical draft, not implementation authorization. Implements approved `prd.md`; provider additions, model selection and deployment remain subject to agreement and verification. No application changes or API calls using family data were made to prepare this plan.

## How This Works, In Plain Language

Keep the existing Next.js website and Supabase accounts/database. Build the illustrated town as the new interface. When a parent speaks, a speech service converts the recording to editable text. The guide uses the parent's confirmed context to find existing resources, then explains only content it can actually access. A recommendation stays separate from the saved plan until the parent accepts it. Confirmed preferences live in the database, not in an assumed model memory.

No custom ML training is proposed. Start with explicit eligibility rules, searchable resource metadata, confirmed preferences and a capable language model for interpretation and explanation. Evaluate quality with synthetic cases and inspected resources. Do not collect child data for training. The building guides share one bounded engine with different domain context and artwork; separate autonomous agents are unnecessary for this behavior.

## Inspected Baseline and Reuse

- `package.json` declares Next.js/React, Supabase and Tailwind; installed Next.js is 16.3.6. Preserve lockfile versions; do not upgrade dependencies as part of the reset.
- `lib/family-context.ts` checks claims and loads membership for the authenticated user. Reuse after permission tests, not as proof all access paths are secure.
- `lib/ai-preferences.ts` has versioned feature permissions. Extend explicitly for new audio/search transfers rather than treating old consent as authorization for new providers.
- `lib/ai/nebius.ts` calls the Nebius chat-completions endpoint, validates JSON parsing and reports usage. Its fallback model is Qwen3-30B-A3B-Instruct-2507; environment-selected model and live quality were not inspected. Current 12-second timeout and small response limits require evaluation for the new jobs.
- `lib/library-candidates.ts` requires expert-reviewed activity templates; `lib/guide-grounding.ts` validates activity IDs. Reuse validation patterns, not these activity-specific contracts.
- `app/today/page.tsx` reads activity_instances and links to preparation. It is not a resource-level daily board.
- Search for MediaRecorder/SpeechRecognition/transcrib in app/components/lib found no matches. This is a scoped absence check, not proof against every possible dependency.

## Stack and External Services

**7 October integration update:** The owner subsequently selected and authorized Tavily search/extraction. `lib/athena/tavily.ts` and `/api/athena/discovery` now implement that bounded integration; see `docs/ATHENA_TAVILY.md`. This supersedes Brave as the proposed search provider below, without approving the rest of this draft. Deepgram key presence was confirmed separately; voice is not yet implemented. The Tavily application key remains blank; explicit keyless provider smoke tests passed. No CLI OAuth token is used by the app.

Preserve [Next.js](https://nextjs.org/docs), [React](https://react.dev/), [Supabase](https://supabase.com/docs) and [Tailwind](https://v3.tailwindcss.com/docs). Read version-specific guides in `node_modules/next/dist/docs/` before coding. Use server routes/actions for credentials and authorized writes. Use existing CSS plus SVG/illustration assets and small transform/opacity transitions; no game engine is proposed.

Keep the existing [Nebius adapter](https://api.tokenfactory.nebius.com/docs) initially; evaluate current available models against Athena's needs before selecting one. Never silently equate the existing fallback with the requested quality. A provider change is a separate decision if no available model passes.

**Proposed additions, not selected services:** [Deepgram](https://developers.deepgram.com/docs/pre-recorded-audio) for speech transcription, [Brave Search](https://api-dashboard.search.brave.com/documentation/quickstart) for external discovery. These add paid API dependencies even though parent-facing resources are free. Account availability, current pricing, quotas, retention and contractual storage/display rights must be checked before enabling either. Optional spoken recaps need a separately verified speech-output adapter; browser speech can be evaluated but is not a guaranteed quality solution.

### Provider Contracts To Verify During Integration

- Nebius existing contract: POST `https://api.tokenfactory.nebius.com/v1/chat/completions`, Bearer credential, messages/model/schema request; parse `choices[0].message.content` and usage, then validate domain semantics. Model/account capabilities require a live synthetic evaluation.
- Deepgram documented candidate: POST `https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true`, Token credential and supported audio bytes; extract transcript from the returned channel alternative after validating shape. Start with recorded turns, not full duplex. This supports editable text after stopping; live partial text is an enhancement requiring a verified streaming transport, not a fake animation. Microphone formats and mobile compatibility need device tests.
- Brave documented candidate: GET `https://api.search.brave.com/res/v1/web/search` with query parameters and server credential per current authentication docs. Normalize returned titles/URLs/descriptions into candidates. Final headers, response contract, storage rights and plan-specific quotas must be pinned before adapter implementation. Search snippets are discovery clues, never sufficient evidence for a full resource summary.

## The Core Journey Through the System

Implements `prd.md > The Core Journey`.

Browser preference draft → account connection → authorized family context → deterministic resource eligibility → saved resource path → selected building. Speech bytes → server speech adapter → editable transcript → parent Send → guide engine retrieves minimal permitted family context plus eligible resources. If discovery is needed, submit a generic query stripped of names/private reflections to search. Validate accessible content and build source-linked results. Reflection text → stored original report → tentative interpretation → confirmation → scoped preference or session note → proposed route → explicit acceptance → version-checked atomic path update.

## Components

### Town and Resource Interface

Implements `Screens and Layout`, `Look and Feel`, P2. Responsive DOM controls sit over an illustrated town; use real buttons for buildings, with equivalent keyboard navigation and compact destination shortcuts. Separate artwork from controls. Parent avatar movement never delays access. Resource surfaces use provider-approved embeds where available, otherwise source links. No iframe assumptions for arbitrary websites. Illustrations must be original/licensed; actual resource previews must not be replaced by invented artwork.

### Resource Catalog and Discovery

Implements `Resource Discovery and Language Coverage`, P3–P4. Model resources independently of activity templates: canonical URL, publisher, content language/variety, audience, age applicability with basis, domain tags, format, access tier, duration if known, thumbnail rights, content access state and checked date. Keep source passages/transcripts only where permitted, with version/hash and precise citations. Distinguish checked catalog entries from fresh search candidates. Candidates that cannot be inspected remain external discoveries, not summarized or auto-planned resources.

Use catalog search first and external discovery for gaps or explicit exploration. Fetch only approved public HTTPS sources through a constrained fetcher: validate resolved addresses and redirects, reject private destinations, bound time/size/type and never execute retrieved instructions. An LLM cannot approve sources or invent URLs. Shared public metadata caching must exclude family inputs; provider terms determine what can be retained.

### Voice and Dialogue

Implements `Voice Conversation`, P5. Recorder states: idle, requesting permission, recording, processing, editable, sending, failed. Offer typed input immediately on denial or inability to record, and after two unsuccessful attempts. Cancel stops capture and pending work. No raw audio stored by Athena by default; provider retention is separately disclosed and verified. Dialogue result types: answer, clarification, unsupported, resource choices, proposal. Typed and spoken submissions use the same downstream authorization and validation.

### Preferences and Reflection Memory

Implements `Reflection and Preference Memory`, P6. Store original submitted text separately from tentative interpretation. A confirmation action creates/updates a scoped preference with source reflection and status. Stop using a preference excludes it from future model context and ranking, including invalidating dependent cached proposals. Corrections must not overwrite the original report silently. Deletion/export operations must cover new entities before a real-family pilot; define exact retention periods and subprocessors in the integration plan.

### Planner and Versioned Path Changes

Implements `General Path and Personalized Direction`, `Progression and Replacement`, P7. Baseline selection is deterministic over eligible resources and recorded choices with stable tie-breaking. Personalized ranking uses confirmed preferences; an LLM may propose a rationale or reranking only among validated candidates. Store immutable path versions plus an active pointer. Proposals record the base version, changed direction, preview resource IDs and preference revision. Acceptance checks membership, current versions, eligibility and idempotency, then commits atomically. Stale proposals require refresh; no partial plan updates.

Resource states distinguish planned, opened, awaiting reflection, tried, replaced and passed-by-choice. Opening does not imply trying. Unsuitable tried/reflected resources allow replace or advance. Untried items allow save for later/replacement/leave focus. New preference confirmation does not itself change the active path. Undo restores direction through a new compatible version, never deletes intervening observations.

### Data and Migration Boundary

Reuse existing identities, family membership, child IDs and calendar context. Proposed new logical entities: resources/source evidence; resource path versions/items; reflection interpretations; scoped preferences; path proposals. Map existing compatible storage before writing additive migrations; do not blindly add duplicate tables. Shared catalog writes require internal editorial authority. Family-linked rows and all mutation functions require server-checked family/child access and row-level protections.

Do not relabel old authored activities as new verified resources or migrate historical progress without a reviewed mapping. Build the new flow beside historical data; switch navigation only after it works. Applying live migrations remains a separate explicit action. No deletion of existing functionality or historical records is implied.

## Planned File Structure

All `athena` paths below are proposed; existing files above are inspected evidence.

```text
app/athena/                       # staged town experience, later navigation cutover
  page.tsx                       # town and daily board
  building/[domain]/page.tsx      # resource/guide surface
  resource/[id]/page.tsx          # consumption and grounded recap
  actions.ts                     # authorized confirmation/path mutations
app/api/athena/
  transcribe/route.ts             # bounded audio ingress
  guide/route.ts                  # validated conversational response
  search/route.ts                 # eligible catalog/discovery response
components/athena/
  town.tsx, guide-dialogue.tsx, voice-input.tsx
  resource-preview.tsx, resource-viewer.tsx
  reflection.tsx, path-comparison.tsx, memory-controls.tsx
lib/athena/
  catalog.ts, discovery.ts, source-access.ts, grounding.ts
  speech.ts, dialogue.ts, preferences.ts, planner.ts, path-changes.ts
public/athena/                    # original/licensed visual assets
content/athena/                   # versioned public resource inventory/rights records
supabase/migrations/              # additive changes after schema mapping
scripts/                         # synthetic behavioral and integration evaluations
```

## Verification and Build Sequence

1. Refresh schema/route/provider alignment and inspect applicable Next.js guides. Preserve dirty work; no destructive reset.
2. Show town, building and resource visual previews with original assets. Verify phone layout, keyboard access, contrast and reduced motion; owner reviews real visual quality.
3. Populate and check P3's resource inventory, then implement actual browse/open/summary flow with provenance.
4. Integrate real speech and guide adapters; test accents, background noise, retry, cancellation and transcript correction using synthetic adult samples.
5. Implement reflection confirmation, preference scope and versioned path choice with synthetic families; test stale/duplicate submissions, permission boundaries and memory exclusion.
6. Run the complete returning-parent flow with actual services, failed requests and source outages. Use existing regression suite plus targeted new tests, lint/type/build checks. Tests and provider evaluations are NOT RUN for this draft.

No fake resource discovery, static canned personalization or placeholder illustrations qualify as completed core features.

## Where It Runs and How Someone Tries It

Existing script: `npm run dev`, normally open `http://localhost:3000` (use the port reported by Next). Production build/start scripts exist. Exact local runtime prerequisites and installed lockfile versions need inspection before execution. Local browser microphone uses localhost; a shared deployment requires HTTPS and provider/server configuration. Do not deploy or change hosting during planning. Use synthetic families for the demo; deployment target and public access remain unconfirmed.

## Decisions and Open Issues

Recommendation for owner agreement: retain Next.js/Supabase and existing Nebius integration while evaluating model quality; add dedicated speech/search adapters if accounts and data terms are acceptable. The owner previously asked whether ML/data are necessary: no custom training dataset is proposed, and resource metadata plus source-backed examples support retrieval/evaluation instead. This is an architectural recommendation, not a measured proof of model quality.

Before spec approval: agree on the added provider direction or identify existing preferred accounts; settle speech-output provider strategy; finish exact API contracts/retention and map the existing schema. Resource inventory and visual preview reviews are explicit build gates, not assumptions of availability. This draft must not be marked build-ready while these integration choices remain unresolved.

## 8 October 2026 — Authorized resource/voice integration addendum

The owner explicitly prioritized functioning resource discovery and voice after accepting the playable direction. This bounded approval supersedes earlier staged-only guidance for this slice; the overall spec is not retroactively marked fully implemented. The existing world preview now shares `ResourceDesk` across world/focused entry points. Static catalog browsing needs no account. `/api/athena/status`, `/resources` and `/voice` require current caregiver membership and enabled family Guide, plus per-operation disclosure for paid provider dispatch. Existing `/discovery` keeps its earlier flag.

Tavily, Deepgram and Nebius server keys are present and live synthetic calls passed on 8 October. Earlier blank-key statements are historical. Deepgram uses Nova-3 English prerecorded transcription with mip_opt_out=true; browser recording is capped at 60 seconds with cancel and editable transcript/type fallback. Tavily reads sources; Nebius returns bounded source-passage citations. Source explanation has a 40-second timeout and no retry to fit the existing two-attempt reservation. Existing Nebius callers retain default timeout/retry behavior.

Twenty-two starter resources cover all five places; English and ten foreign-language options have individually checked starting links. Age cells may remain empty. The catalog records publisher versus editorial age basis, free access at inspection, parent/together audience and attributed thumbnails where checked. No resource is called expert-reviewed. Original material opens at its publisher; reading/video embedding and persistent resource/reflection plans remain separate unfinished work. See docs/ATHENA_RESOURCE_FUNCTIONALITY.md and docs/ATHENA_RESOURCE_SOURCES.md.
