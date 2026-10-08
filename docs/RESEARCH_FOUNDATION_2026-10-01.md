# Research-backed content foundation — 1 October 2026

## Current follow-up: reviewer response intake — 2 October 2026

The historical checkpoints below describe their dates, not current coverage. The current repository has eight sources, six claims and eight primitives; seven stacks have structure-valid unpublished drafts and one is quarantined. None is independently approved or available to the live planner.

The review package now has a separate machine-readable response form. An authenticated owner can download it from `/library/research/export?format=response`, alongside the unchanged JSON evidence package and Markdown worksheet. Export permission is not content-approval authority. The response contains no family records and no prefilled review outcomes, ages, identities or language coverage.

Use `npm run review:research` to inspect the current package fingerprint without a network request. `npm run review:research -- --template` prints the blank response; `npm run review:research -- --check="C:\path\completed-response.json"` checks a returned response. The tool only reads JSON, does not load environment files, write files, use credits, approve content or access Supabase. A blocked/partial result exits 1. Keep completed reviewer identity/qualification records outside the public repository; the assessment output names fields and issue codes but does not echo their text.

Reviewers may submit only the primitives and linked sources within their expertise. For each selected draft index, provide explicit reviewed age bounds within 0–83 months, readiness/exclusions, BCP-47 language/variety tags, reviewer details and all ten checks. Source appraisals need full relevant-material access, limitations, rights assessment and dates. `null` means unanswered; a check with required changes, outside-expertise or reject cannot be treated as acceptable. Source appraisals must precede the associated content review, and review dates/due dates must be valid and current. Every response is bound to the exact exported package, source records and content fingerprints. Edits require a new package and review rather than altering a returned approval's target.

`ready_for_editorial_decision` means only structurally complete paperwork for the selected drafts. It does not authenticate the reviewer, verify qualifications/independence, appraise scientific reasoning, prove rights/safety or publish anything. Those validations remain human/editorial work. The next release stage needs a complete exact-version activity template, independently checked requirements and runtime enforcement of family resources/readiness/supervision. Intake results always say `publicationAllowed: false` and `schedulable: false`; there is no `--publish` switch or automatic conversion of research drafts into plan entries.

## What was actually delivered

The owner-supplied source of truth v1.1 replaces the root baseline; v1.0 is preserved in docs/archive. The owner requested a research-to-primitive-to-AI-library core, not another cosmetic milestone.

An authenticated Library subpage at /library/research exposes a versioned register of six sources, four bounded claims and six draft interaction primitives. These are not approved activities. All members can inspect the evidence; owners can inspect rejected model output behind an explicit audit disclosure.

The compiler is an offline editorial command, not a family-facing generation endpoint. It reads only the public briefs and configured model credentials. It has no Supabase writes, no family context and no publication path. Dry-run is the default; --live is explicit. No model output can grant itself review status or enter a plan.

## Research method and limitations

This is a targeted initial evidence map, not an exhaustive review. Search focused on responsive caregiving, early learning, shared reading and caregiver-child interaction in the first three years. Sources include WHO guidelines, the UNICEF/WHO Care for Child Development overview, a 102-trial systematic review, Harvard's responsive interaction explanation, AAP's literacy policy abstract and the nurturing-care framework.

Source-specific URLs, access depth, original summaries, scope limits and reuse records are stored in content/research/catalog.json. Several full manuals/guidelines were not appraised. AAP retrieval was limited to the publisher-indexed abstract. This work does not justify a GRADE rating, exact age eligibility, material safety, a dose, cultural generalisation or an activity-specific efficacy claim. No copyrighted activity cards or book excerpts were copied.

Next appraisal must include full documents and relevant supporting trials, quality/limitations, excluded evidence and contradictory findings. Broader movement, sensory, music, autonomy and multilingual/cultural coverage remain incomplete. A small set of similar interaction patterns is not yet a balanced library.

## Real AI run and rejection

One complete Nebius batch produced twelve drafts across six primitives, using the existing configured Qwen model. Recorded usage for that complete batch was 2,225 input tokens and 1,568 output tokens. This is not total billing for the session: failed/partial corrected attempts are not included, and no dollar cost was verified.

The initial provider rejected the JSON Schema uniqueItems keyword; local duplicate validation replaces it. Shape validation alone then proved insufficient: the complete batch invented memories/book content, introduced care tasks or positioning, and sometimes described hypothetical child behaviour as observed fact. The original output and per-primitive rejection reasons are preserved in content/research/archive. They are not active library templates.

Compiler v2 strengthens prompts and local checks: optional noticing, explicit opt-out, no invented memories or added care tasks, evidence-ID allowlisting, bounded text, strict fields, unique titles and immutable code-assigned draft status. Regex checks are incomplete guardrails, not semantic safety validation.

Corrected attempts did not yield a complete accepted batch: one failed validation; the final bounded attempt timed out. No partial bundle was published or presented as success. Paid retries stopped. The full original rejected batch remains inspectable; generated text was not silently rewritten and relabelled as raw model output.

## Publication remains blocked

There is deliberately no approval checkbox that turns a family owner into an expert reviewer. Remaining work is full source appraisal, independent developmental/safety/content/rights review, a versioned publication workflow and a planner bridge admitting only reviewed versions. Family eligibility, substitutions, stop signals and immutable plan snapshots must be checked before that bridge opens.

The v1.1 non-AI permissions, observation/interpretation separation and proposal acceptance gates remain separate required work. This increment does not certify the whole source of truth as implemented.

## Complete activity authoring and exact-release review (2 October follow-up)

The short AI invitations are not full activity templates. `npm run review:activity` lists the current assessable drafts and offline commands. Quarantined output is excluded, and none of these commands publishes content, writes files, calls a provider, reads environment credentials or changes family data.

1. `npm run review:activity -- --template=shared-book:0` prints an authoring candidate for that exact draft (indices are zero-based). Save a copy outside the live catalogue for the editor to complete. It copies only actual invitation/caregiver/observation wording and source provenance; missing age, materials, duration, setup, safety, variations and context requirements remain null. Neither legacy database defaults nor the product-wide age target fill those gaps.
2. Complete the candidate's template, applicability, one instruction-language variety, explicit capability/track associations and source claim scope/limits. The original review package and its drafting findings remain necessary companion material. Document changes and resolve authoring findings; an empty findings list is only the author's declaration. New evidence needs a properly updated research package, not an invented source ID. Every required context category needs questions or a reviewed not-required rationale; supervision needs an explicit question.
3. `npm run review:activity -- --check=path-to-candidate.json` checks structural completeness and provenance. `ready_for_exact_version_review` means paperwork can be reviewed, not that the instructions are safe, useful or approved. The existing one-language-per-release contract does not provide translated UI or 30–40-language support.
4. `npm run review:activity -- --worksheet=path-to-candidate.json` prints an escaped, readable review worksheet of every field. `--review-form=path-to-candidate.json` prints a separate response bound to the entire candidate fingerprint. Send the full candidate, worksheet, source package and response together to the appropriate independent reviewers. Do not substitute an earlier primitive-only review.
5. `npm run review:activity -- --assess-review=path-to-candidate.json --response=path-to-completed-release-review.json` checks the returned paperwork, source appraisal, exact draft, current review dates, final age range and final instruction-language variety. Editing any candidate field invalidates the response's fingerprint. Result logs omit reviewer prose; retain professional details in confidential editorial storage, not the public repository.

All command output goes to stdout; failures set a nonzero exit code. A candidate/response input is bounded to 1 MiB. Unknown/duplicate CLI options and publication flags are rejected. A structurally complete response still has `publicationAllowed: false`, `schedulable: false`, `identityVerified: false` and `substantiveReviewVerified: false`. It awaits a separate authorized editorial decision and an immutable database import with evidence/association/language controls. Those publication/import steps are not implemented by this tool. No actual reviewer identity, complete activity or publication decision has been fabricated to demonstrate a passing workflow.

## Verification

- TypeScript check, ESLint and production build passed. Build retains the pre-existing missing metadataBase warning.
- Research tests exercise a clearly synthetic current-format fixture, 23 rejection cases, rejected-output quarantine, obsolete live-batch rejection and an always-false scheduling boundary. These are not clinical/content validation.
- Library and Week pure regression scripts passed without writing family data.
- Read-only authenticated browser inspection verified the research route, source links and disclosures. Responsive screenshot evidence is local and ignored by Git because app chrome can contain a family name.
- Impeccable finish review requested one correction: replace text disclosure glyphs with the established icon system. The reviewer scored that correction resolved and returned ship at that scope. Evidence covers the actual 858px desktop, an expanded desktop section and the first viewport of an authenticated 390px iframe; lower mobile content and whole-product readiness are not certified.
- No migration, deployment, account change, plan modification or family-data provider transfer was performed.

## Next engineering order

1. Complete/appraise the initial evidence pack and record versioned editorial decisions; resolve the target cohort/applicability boundaries.
2. Make compilation resumable with per-call audit records and content-budget controls, and run content-specific evaluations. Do not retry whole batches indefinitely.
3. Implement reviewed immutable template releases and deterministic eligibility; test with synthetic families before connecting any existing plan.
4. Add consent-scoped family adaptation and proposal review, preserving raw observations and making interpretations correctable.

## Follow-up: bounded resumable compilation

The compiler now defaults to one missing primitive per run, rather than retrying a whole batch. `node scripts/compile-research-drafts.mjs` remains a no-network dry run. `--limit=N` bounds work to 1–6 primitives; the unchanged provider adapter can make up to two transport attempts per primitive. `--live` is required to spend credits.

`--stream` emits one complete JSON checkpoint per attempted primitive to stdout, including completed stacks, current-run failures and remaining primitive IDs. Without streaming, the final checkpoint includes partial successes even if a later call fails. A failed call sets exit code 1 and stops subsequent calls. Capture/preserve the checkpoint output before another paid run; the command does not automatically create a durable checkpoint file. A killed process can still lose work that was not captured.

`--resume=path-to-checkpoint.json` accepts a single saved checkpoint object (not the entire JSON-lines stream). Before any provider call it checks current catalog/compiler/prompt fingerprints and draft contracts. It resumes only missing primitives, including retaining completed rejected outputs for review rather than paying to regenerate them silently. Changing source/prompt versions makes old checkpoints ineligible for resume. Failure records cover the current invocation only; preserve previous snapshots for an attempt history. Reported successful-call token usage is not a complete billing ledger.

Synthetic tests verify one-call defaults, stopping after timeout, partial retention, safe resume, rejected-output preservation, stale checkpoint refusal and always-false publication/scheduling flags. No additional live provider calls were made in this follow-up. This reliability change neither fixes editorial quality nor completes source appraisal. The owner's later ages 0–6 and English plus 30–40 language target expands the evidence and review work beyond this initial first-three-years map.
## Editorial publication handoff — 2 October 2026

Six complete, unpublished candidates now have a [readable review package](activity-review/README.md), matching exact-version worksheets and unanswered response forms. `npm run review:activity` lists their current structural assessments as well as the original short invitations. The source-reading supplement distinguishes full handout text, selected manual/article sections, overview-only access and retrieval failures. None of these authoring records is an independent approval. Proposed age coverage and complete fields do not establish safety, efficacy or a balanced library.

The owner has chosen **another designated editor** to authorize publication after independent review. No person/account has yet been identified or enrolled. Do not enable a family account, the runtime AI or a test fixture as a shortcut.

After the complete activity candidate and returned exact-version review pass their checks:

```powershell
npm run review:activity -- --publication-package=path/to/candidate.json --response=path/to/completed-release-review.json
```

This command writes a JSON package to stdout only. Treat it as confidential editorial material: it contains the full returned reviewer response, not family data. Keep real submissions outside the public repository. Preparing it does not publish, verify a reviewer or approve content.

The authorized editor must verify identity, relevant expertise, independence, substantive source/content findings and rights outside the structural checker. Record a separate decision object with `outcome: "publish"` and nonempty `authorizationReference`, `reviewerVerification`, `independenceAssessment`, `sourceContentAndRightsAssessment`, and `rationale`. These are the editor's accountable assertions, not software certification.

An administrator must first enroll the owner-designated editor's **verified Supabase Auth user ID** in `content_publishers`, with an authorization reference and `enabled: true`. There is no self-enrollment or family-role shortcut. Use that editor's authenticated session for `publish_activity_release(p_release_id, p_package, p_decision)`. Generate a fresh release UUID for a genuinely new release; retain it for exact retries. Do not use a service key or paste credentials into chat. An operator UI/client for this workflow is still pending; this describes the implemented database contract, not a finished editorial experience.

The transaction imports a new activity and its exact source/review associations. A changed retry fails rather than overwriting it. Required family context and age/time constraints still apply before it can be selected. `retire_activity_release(p_template_id, p_reason)` withdraws it from eligibility without deleting family history; a retired release cannot be reactivated by retry. Corrections need a separately reviewed release.

Migration `202610020004_editorial_publication.sql` is owner-confirmed applied. Local successful publication tests are explicitly fictional, isolated software fixtures. Hosted checks verified only denial for ordinary/anonymous accounts and unchanged plans. No genuine activity has been published, no reviewer credentials verified, and no editor enabled by this work.

