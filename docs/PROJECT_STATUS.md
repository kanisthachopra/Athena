# MIRA project status

## 30 September 2026 — Source adoption

Scope of this update: documentation adoption only. A full G0 implementation alignment audit has not been completed.

### Evidence inspected in this task

- Read the uploaded `MIRA_SOURCE_OF_TRUTH.md` v1.0 and saved its text in the repository root.
- Inspected existing `AGENTS.md`, the roadmap, the README introduction, and the documentation directory.
- Git HEAD before adoption: `9fee913` (`Add reviewable AI family profile suggestions`). The pre-existing untracked `tmp/` directory was preserved.
- No application or database change, deployment, provider change, live-data test, or fresh verification of earlier feature claims occurred in this task.

### Documentation authority

1. `MIRA_SOURCE_OF_TRUTH.md`: owner-adopted intended product baseline.
2. `DECISIONS_AND_OPEN_QUESTIONS.md`: adoption record and subsequent explicit decisions; open matters stay open.
3. `MIRA_PRODUCT_SPEC.md`, `DEVELOPMENT_ROADMAP.md`, `CURRENT_STATE_AUDIT.md`, and README feature descriptions: earlier context, subject to the new baseline and fresh evidence.

The source's own historical “current state” is not a report about this checkout. Requirements and acceptance scenarios are not passing tests.

### Referenced companion package

The upload did not include `docs/SOURCE_MAP.md`, `docs/DEVELOPMENT_MATRIX.md`, `docs/DATA_CONTRACTS.md`, `docs/ROADMAP.md`, `docs/REQUIREMENTS.json`, `evals/ACCEPTANCE_TESTS.md` or its JSON companion, or `docs/HANDOVER.md`. These were not found in the inspected documentation inventory. Their source references and verification labels remain unverified here.

This status file and the decision register were created locally during adoption; they are not the missing package's original companion documents.

### Next task

Perform G0: inspect applicable instructions, Git state, package scripts, migrations, relevant application code, and available tests; map actual behavior to the canonical baseline; record conflicts, gaps, and unverified live-database assumptions; propose the smallest next implementation step. Do not recreate completed foundations or resume the previous feature roadmap without this alignment.
