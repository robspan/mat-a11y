# Refactor TODO (keep formatters aggregation-agnostic)

This TODO tracks the refactoring work to keep analysis/aggregation concerns out of formatters and maintain a clean stage separation:

- Stage 1: **Analyze** (produces raw results in any shape)
- Stage 2: **Normalize** (converts raw results → stable `{ total, distribution, entities, issues }`)
- Stage 3: **Format** (renders output; must not care about aggregation method)

## Guardrails (must-run checks)

Run these after *every* step below:

- Fast correctness: `npm test`
- Full benchmark/check suite: `npm run dev-check`

If a step changes output semantics, also run:

- Formatter verification alone: `node dev/verify-formatters.js`

## Parallelization (multiple foreground agents)

You can safely speed up this refactor by spawning multiple foreground agents **as long as each agent owns a disjoint slice of the codebase** and everyone follows the same guardrails.

### Rules for parallel work

- Each agent works on **one step only** and limits changes to the files listed in its assignment.
- After finishing, each agent must run:
  - `npm test`
  - `npm run dev-check`
- Prefer small PR-sized batches to reduce merge conflicts.
- Merge order: land the “normalization contract” changes first, then refactors on top.

### Suggested agent split

**Agent A — AI formatter migration**

- Scope: [src/formatters/ai.js](src/formatters/ai.js) (+ optional small helper in formatter utils)
- Task:
  - Convert AI formatter to use `normalizeResults()`
  - Preserve output structure + global dedupe behavior
- Validate: `npm test` + `npm run dev-check`

**Agent B — Typings alignment**

- Scope: [src/index.d.ts](src/index.d.ts)
- Task:
  - Add component analysis result type
  - Ensure exported types reflect supported shapes
- Validate: `npm test` + `npm run dev-check`

**Agent C — Component semantics (metrics correctness)**

- Scope: [src/core/componentAnalyzer.js](src/core/componentAnalyzer.js), [src/formatters/result-utils.js](src/formatters/result-utils.js), plus fixtures/tests if needed
- Task:
  - Decide Option A vs B (document vs include passing components)
  - Make `total/distribution/entities` semantics consistent
- Validate: `npm test` + `npm run dev-check`

**Agent D — CLI cleanup (optional / later)**

- Scope: [bin/cli.js](bin/cli.js)
- Task:
  - Reduce duplicated rendering logic (route everything through formatters where sensible)
  - Confirm default output filenames, `-o` precedence
- Validate: `npm test` + `npm run dev-check`

## TODO Steps

### 1) Make AI formatter aggregation-agnostic

**Goal**: [src/formatters/ai.js](src/formatters/ai.js) should consume `normalizeResults()` like the other formatters.

- Replace the current shape-branching / manual merging of `results.urls`, `results.routes`, `results.internal.routes` with:
  - `const normalized = normalizeResults(results)`
  - Build the TODO output from `normalized.issues` (or `normalized.entities[*].issues`) instead of raw shapes.
- Keep the existing grouping and global dedupe behavior stable.
- Preserve sitemap-only “internal routes” information if you still want it in the AI output:
  - Simplest: include it only when `results.internal?.routes` exists, as a separate section.

**Validate**: `npm test` then `npm run dev-check`

### 2) Tighten the normalization contract (edge cases)

**Goal**: keep `normalizeResults()` semantics consistent across modes.

- Review `normalizeResults()` behavior for:
  - empty inputs
  - malformed issues
  - component mode totals/distribution
- Extend the normalization dev tests in [dev/tests/test-result-normalization.js](dev/tests/test-result-normalization.js) with any missing edge cases you care about.

**Validate**: `npm test` then `npm run dev-check`

### 3) Decide/clarify semantics for component analysis entities

**Problem**: component analyzer currently returns only “components with issues” in `results.components`.

This impacts monitoring/reporting semantics:
- `normalized.total` uses `totalComponentsScanned`
- `normalized.entities` contains only failing entities
- any formatter computing averages over entities can be biased.

**Options (pick one)**:

- Option A (minimal): Document this clearly (entities are “failing components only”).
- Option B (better metrics): Change component analyzer to return *all* components, with empty `issues` for passing ones.
  - If you do this, adjust output size expectations and any console formatting.

**Validate**: `npm test` then `npm run dev-check`

### 4) Update TypeScript typings to match reality

**Goal**: public typings reflect all supported result shapes.

- Add an exported type for component analysis results in [src/index.d.ts](src/index.d.ts).
- Update any formatter type unions / exported API signatures accordingly.
- Ensure route analyzer typings match actual output fields if exposed.

**Validate**: `npm test` then `npm run dev-check`

### 5) Reduce CLI duplication / clarify output responsibilities

**Goal**: keep CLI focused on orchestration.

- There is legacy inline HTML/JSON formatting inside the CLI; consider routing everything through formatters to reduce duplicated rendering logic.
  - Keep behavior stable (no UX changes) unless explicitly intended.
- Confirm default output filenames behave as expected for:
  - `mat-a11y` (AI)
  - `mat-a11y --sarif`, `--junit`, `--html`, `--json`, etc.
  - `-o` always wins.

**Validate**: `npm test` then `npm run dev-check`

### 6) (Optional) Add a single end-to-end CLI smoke test

**Goal**: make sure the CLI → analyzer → formatter integration doesn’t regress.

- Add a dev test that runs the CLI against a tiny generated temp Angular project (like the PageResolver test does) and asserts:
  - exit code behavior (0 vs 1)
  - output file exists
  - output is non-empty

**Validate**: `npm test` then `npm run dev-check`
