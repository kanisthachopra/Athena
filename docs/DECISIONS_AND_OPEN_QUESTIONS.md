# Decisions and open questions

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
