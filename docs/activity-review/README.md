# MIRA activity review package

Prepared 2 October 2026 for the independent early-years reviewer and the separately designated publication editor. This package contains six complete, AI-assisted authoring drafts, their exact-version response forms and source-reading notes. **None is approved, published or intended for families to try.**

The drafts turn earlier Nebius invitations into concrete adult instructions. They retain their original provenance and document what was rewritten. They introduce no objects and focus on responsive communication and ordinary shared moments. This is a deliberately narrow first set, not a balanced library or evidence that MIRA is ready for children from birth to seven.

## Read the activities

In MIRA, sign in as the family owner and open **Library → Research → Review complete activities**. The seven current candidates (the six below plus the later mark-making candidate) each have a complete Markdown worksheet, exact candidate/source JSON packet and blank JSON response. The web worksheet appends the full originating research batch, including the original drafts and recorded limits. Other batch drafts are context, not additional complete-activity review targets. The original foundation-only downloads remain separately labelled below the collection.

These downloads contain no family data and confer no review or publishing permission. Do not upload completed reviewer records into family notes or Guide; use the private editorial handoff. No reviewer or editor has been arranged yet.

Open a worksheet to see the entire candidate, including instructions, safety boundaries, variations, context questions, proposed capability associations and source claims. The corresponding JSON is the authoritative review target; its fingerprint appears in both the worksheet and response form.

| Draft | Proposed age in months | Main review question |
|---|---:|---|
| [Answer a small signal](answer-a-small-signal.md) | 0–11 | Is this invitation appropriately bounded for infants, including communication access and stopping for care? |
| [Answer their sound](answer-their-sound.md) | 6–23 | Is an optional quiet echo suitable, and when should it be omitted? |
| [Notice it together](notice-without-moving.md) | 12–35 | Are the stationary indoor context and communication requirements sufficiently clear? |
| [An unhurried hello](an-unhurried-hello.md) | 12–35 | Does the greeting preserve choice without imposing speech, contact or a family language pattern? |
| [A little story from today](a-story-that-just-happened.md) | 24–35 | Is the brief shared-event account suitable without becoming a recall test or inventing family facts? |
| [A difference they notice](a-difference-they-notice.md) | 36–83 | Should this broad age band be narrowed or split, and does the source support the proposed comparison opportunity? |

All age bands are author proposals, not validated developmental thresholds. One-to-three-minute estimates are planning allowances, not doses or completion targets. English is the only authored instruction language. A suggestion to use the adult's comfortable language is not a reviewed translation.

## Read the evidence and its gaps

The [source-reading notes](../../content/research/activity-source-notes-2026-10-02.json) record exactly what was accessible and what remains unappraised. The [source catalog](../../content/research/catalog.json), [original generation checkpoint](../../content/research/review-checkpoint.json) and [drafting findings](../../content/research/preflight-review.json) preserve the original research and generation record. The notes supplement that record; they do not change its fingerprints or count as an independent review.

Start with the linked primary material, not just MIRA's summaries. The [WHO overview](https://www.who.int/publications/i/item/97892400020986/) concerns responsive care and early learning in the first three years. Its full guideline download was inaccessible in this pass. The [UNICEF participant manual](https://www.unicef.org/media/91176/file/3-CCD-Participant-Manual.pdf) belongs to a counselling package, not a standalone app intervention. Only selected sections were read. The full text of the [Harvard practice handout](https://developingchild.harvard.edu/wp-content/uploads/2024/10/HCDC_ServeReturn_for_Parents_Caregivers_2019.pdf) was read; that does not appraise its underlying studies.

The [Jeong review](https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1003602) concerns parenting programmes, not these individual scripts. The older-child candidate instead links to [NAEYC practice guidance](https://www.naeyc.org/node/3796) and the uncertainty recorded for [Skene's guided-play synthesis](https://doi.org/10.1111/cdev.13730). Neither establishes the efficacy or safety of that candidate. The DOI could not be retrieved again in this pass; full independent appraisal is still required.

No source illustrations, worksheets or training cards are included. The reviewer must assess rights and attribution as well as evidence. Public availability is not permission to adapt a programme or imply endorsement.

## Complete an independent review

1. Use the worksheet and the matching candidate under `content/research/activity-candidates/`. Read the full relevant source material. Reject unsupported claims or request narrower wording, scope or variants.
2. Work on a **private copy** of the matching `.response.json` form in this folder. Reviewer identity, qualifications, conflicts, source appraisals and check outcomes are intentionally unanswered. Do not commit a completed personal review record to this repository.
3. Assess the exact candidate: its materials, exclusions, age/readiness, communication access, adult wording, easier/extended options, source claims, context questions and capability/track associations. Empty `unresolvedFindings` means the author says the earlier drafting defects were addressed; it is not your approval.
4. The ten checks require the responsible reviewer, findings and evidence. Record changes required or rejection where appropriate. Do not mark every field acceptable merely to pass the checker. If your competence or source access is insufficient for an area, leave it unresolved and identify the additional review needed.
5. Return the response securely to the designated editor. A candidate edit changes its fingerprint and needs a fresh response for that version. Structural validation cannot establish reviewer identity, competence, independence or correctness.

The editor separately verifies the review and decides whether publication is justified. No editor is enrolled by this package. Reviewers do not need family accounts, child data, API keys or access to existing plans.

## Check the handoff

From the repository root, this lists both the original short invitations and complete authored candidates without network calls:

```powershell
npm run review:activity
```

Check one exact candidate and assess a returned private response:

```powershell
npm run review:activity -- --check=content/research/activity-candidates/answer-a-small-signal.json
npm run review:activity -- --assess-review=content/research/activity-candidates/answer-a-small-signal.json --response=path/to/private/completed-response.json
```

The supplied unanswered forms must return `blocked`. Neither command publishes anything. The [publication handoff](../RESEARCH_FOUNDATION_2026-10-01.md#editorial-publication-handoff--2-october-2026) describes the separate authorized-editor step.

## What this set does not cover

There are no reviewed activities here yet. Movement, making, music, book/material choices, wider exploration, cultural resources and actual translated instruction packs remain substantial content work. Independent source and safety review, the designated editor's authorization, family-specific eligibility and pilot testing are still required. Existing family plans are unchanged.

## Separate play-expansion batch — 2 October 2026

The [play-expansion worksheet](play-expansion-worksheet.md) adds four **primitive concepts**, not four complete releases: small voluntary movement, quiet vocal rhythm, open mark-making and child-chosen block arrangements. Its [catalog](../../content/research/expansion/catalog.json) records three narrowly scoped sources and three practice claims. Relevant Harvard practice-guide sections and the NAEYC process-art article were read; the WHO movement overview is background only because the full guideline could not be accessed. This is not an extensive systematic review, safety assessment or birth-to-six coverage.

The [current Nebius checkpoint](../../content/research/expansion/review-checkpoint.json) preserves eight generated drafts. Six are quarantined: incomplete wording, an inferred mental state or duplicate titles failed the corrected contract. Two mark-making drafts passed structural checks but retain wording and material/applicability gaps. [Preflight findings](../../content/research/expansion/preflight-review.json) name these issues; they are AI-assisted inspection, not independent approval. The earlier child-directed attempt and its exact prompt/catalog provenance are retained alongside the checkpoint. No generated record was silently edited into approval.

Use the separate [unanswered response form](play-expansion-response.json) for the exact primitive package. This is **not** interchangeable with the six complete-template response forms above. An independent primitive review cannot publish an activity; a complete, revised template still needs the separate exact-version release review and designated editor. Do not ask families to try these drafts to resolve safety questions.

Offline commands (no API calls, family data or publication):

```powershell
npm run review:research -- --batch=play-expansion
npm run review:research -- --batch=play-expansion --worksheet
npm run review:research -- --batch=play-expansion --package
npm run review:research -- --batch=play-expansion --check=path/to/private/primitive-response.json
npm run review:activity -- --batch=play-expansion
```

The existing commands without `--batch` still select the original foundation, preserving its exact catalog, prompts, six complete candidates and review fingerprints. The expansion is not imported by the family-facing app or live planner. Further work must resolve concrete material/context requirements and broaden the evidence base before proposing complete releases; counts of generated concepts are not pilot readiness.

### Complete mark-making candidate

[Marks of their own](marks-of-their-own.md) is now a full authoring candidate derived from the first mark-making draft, with a [separate unanswered release response](marks-of-their-own.response.json). The authoritative JSON is [here](../../content/research/expansion/activity-candidates/marks-of-their-own.json). It proposes 48–71 months, plain paper and one labelled intact wax crayon, continuous adult attention, optional participation, no copied picture, no physical guidance and no material substitutions. These are proposals for expert assessment, not validated eligibility or product approval. Dimensions, breakage, individual access and the Indian pilot context need qualified scrutiny; the child-wide age range is not an approval for every child in it.

The later [authoring-source supplement](../../content/research/expansion/authoring-sources.json) attaches the AAP's material-selection article to this exact review package without changing the original Nebius prompt, claims or output. This source must receive its own appraisal in the complete-template response. Its omission, stale fingerprint, expired review or appraisal after the content review blocks the handoff. US label guidance is not represented as Indian certification. No material-safety finding is implied by the software check.

```powershell
npm run review:activity -- --batch=play-expansion --check=content/research/expansion/activity-candidates/marks-of-their-own.json
npm run review:activity -- --batch=play-expansion --assess-review=content/research/expansion/activity-candidates/marks-of-their-own.json --response=path/to/private/complete-activity-response.json
```

The primitive package and its worksheet remain unchanged. Do not use the primitive response as the complete-template response. The full activity response binds the later source package and entire candidate. Its blank form correctly fails. Migration `202610020011_practice_source_classification.sql` is required before eventual publication of these descriptive practice-source types; it grants no editorial authority or approval. No reviewer/editor has been arranged and nothing in this package is live family guidance.
