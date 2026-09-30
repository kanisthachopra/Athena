# MIRA project authority

Read `MIRA_SOURCE_OF_TRUTH.md` in full before making product, behavior, architecture, scope, or delivery decisions. The owner explicitly adopted this document on 30 September 2026 as MIRA's highest project-level deciding authority. Keep this file in the repository so new sessions can load it; do not rely on conversation memory.

- The canonical baseline supersedes conflicting earlier assistant proposals, `docs/MIRA_PRODUCT_SPEC.md`, and `docs/DEVELOPMENT_ROADMAP.md`. Later explicit owner decisions must be recorded in `docs/DECISIONS_AND_OPEN_QUESTIONS.md` with their rationale and impact.
- Preserve the source's U/D/H/R/V/O distinctions. Adoption does not resolve questions marked open, turn historical examples into actual family data, or prove that requirements are implemented.
- Use inspected code, migrations, environment evidence, and executed tests for implementation claims. Record evidence and gaps in `docs/PROJECT_STATUS.md`.
- The next implementation step is the source's G0 read-only alignment audit. Do not continue the previous feature sequence until its gaps and conflicts have been assessed. A repeated “continue” does not authorize unrelated features.
- Referenced companion documents not supplied or present are missing inputs, not evidence. Do not invent their contents, requirement IDs, approvals, source verification, or test results.
- Preserve existing work and the Next.js instructions below. This adoption does not authorize rebuilding the project, altering live data, changing providers, or deleting existing functionality.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
