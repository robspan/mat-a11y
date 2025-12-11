# traufix-a11y Refactoring Implementation Plan

## Overview

Refactor from monolithic check files to a modular, self-verifying, parallelized architecture.

**Current State:** 67 checks spread across 9 files, separate test folder
**Target State:** 67 self-contained check folders with parallel execution

---

## Architecture

### Target Structure

```
src/
├── checks/
│   ├── buttonNames/
│   │   ├── index.js        # Check function + metadata
│   │   └── verify.html     # Self-test (pass + fail sections)
│   ├── imageAlt/
│   │   ├── index.js
│   │   └── verify.html
│   ├── colorContrast/
│   │   ├── index.js
│   │   └── verify.scss
│   ... (67 total)
│
├── core/
│   ├── loader.js           # Dynamic check discovery & loading
│   ├── runner.js           # Parallel execution coordinator
│   ├── worker.js           # Worker thread implementation
│   ├── verifier.js         # Self-test logic
│   └── parser.js           # Parse verify files (@a11y-pass/@a11y-fail)
│
├── index.js                # Public API (backwards compatible)
└── cli.js                  # CLI entry point

bin/
└── cli.js                  # Shebang wrapper

tests/
└── integration/            # Integration tests for the whole system
```

### Check Module Format

Each `checks/{name}/index.js`:

```javascript
module.exports = {
  // Metadata
  name: 'buttonNames',
  description: 'Buttons must have accessible names',
  tier: 'basic',              // 'basic' | 'enhanced' | 'full'
  type: 'html',               // 'html' | 'scss'
  wcag: '4.1.2',              // WCAG reference (optional)
  weight: 10,                 // Lighthouse weight

  // The check function
  check(content) {
    const issues = [];
    // ... check logic
    return { pass: issues.length === 0, issues };
  }
};
```

### Verify File Format

Each `checks/{name}/verify.{html|scss}`:

```html
<!-- @a11y-pass -->
<button>Click me</button>
<button aria-label="Submit">→</button>

<!-- @a11y-fail -->
<button></button>
<button>   </button>
```

Parser extracts content between markers for testing.

---

## Implementation Phases

### Phase 1: Core Infrastructure
**Priority: CRITICAL | Agents: 2 parallel**

#### 1.1 Parser Module (`src/core/parser.js`)
- Parse `@a11y-pass` and `@a11y-fail` sections from verify files
- Handle both HTML and SCSS files
- Return `{ passContent: string, failContent: string }`
- Error handling for malformed files

#### 1.2 Loader Module (`src/core/loader.js`)
- Scan `src/checks/` for all check folders
- Dynamically require each `index.js`
- Validate check module format (has required fields)
- Build check registry: `Map<name, checkModule>`
- Cache loaded checks
- Error isolation: one bad check doesn't break others

**Deliverables:**
- `src/core/parser.js`
- `src/core/loader.js`
- Unit tests for both

---

### Phase 2: Check Migration
**Priority: HIGH | Agents: 8 parallel (one per check category)**

Migrate existing checks to new folder structure.

#### Agent Distribution:

| Agent | Category | Checks | Source Files |
|-------|----------|--------|--------------|
| 1 | HTML Basic | 17 | checks.js |
| 2 | HTML Extra | 6 | checks-html-extra-1.js, checks-html-extra-2.js |
| 3 | SCSS Basic | 3 | checks.js |
| 4 | SCSS Extra | 11 | checks-scss-extra-1.js, checks-scss-extra-2.js |
| 5 | Angular | 6 | checks-angular.js |
| 6 | Material 1 | 7 | checks-material-1.js |
| 7 | Material 2 | 7 | checks-material-2.js |
| 8 | CDK | 3 | checks-cdk.js |

#### Per-Check Migration Steps:
1. Create folder `src/checks/{checkName}/`
2. Create `index.js` with check function + metadata
3. Create `verify.{html|scss}` with pass + fail sections
4. Verify check works in isolation

#### Check List (67 total):

**HTML Basic (17):**
- [ ] buttonNames
- [ ] imageAlt
- [ ] formLabels
- [ ] ariaRoles
- [ ] ariaAttributes
- [ ] uniqueIds
- [ ] headingOrder
- [ ] linkNames
- [ ] listStructure
- [ ] dlStructure
- [ ] tableHeaders
- [ ] iframeTitles
- [ ] videoCaptions
- [ ] objectAlt
- [ ] accesskeyUnique
- [ ] tabindex
- [ ] ariaHiddenBody

**HTML Extra (6):**
- [ ] htmlHasLang
- [ ] metaViewport
- [ ] skipLink
- [ ] inputImageAlt
- [ ] autoplayMedia
- [ ] marqueeElement
- [ ] blinkElement
- [ ] metaRefresh
- [ ] duplicateIdAria
- [ ] emptyTableHeader
- [ ] scopeAttrMisuse
- [ ] autofocusUsage
- [ ] formFieldName

**SCSS Basic (3):**
- [ ] colorContrast
- [ ] focusStyles
- [ ] touchTargets

**SCSS Extra (11):**
- [ ] outlineNoneWithoutAlt
- [ ] prefersReducedMotion
- [ ] userSelectNone
- [ ] pointerEventsNone
- [ ] visibilityHiddenUsage
- [ ] focusWithinSupport
- [ ] hoverWithoutFocus
- [ ] contentOverflow
- [ ] smallFontSize
- [ ] lineHeightTight
- [ ] textJustify

**Angular (6):**
- [ ] clickWithoutKeyboard
- [ ] clickWithoutRole
- [ ] routerLinkNames
- [ ] ngForTrackBy
- [ ] innerHtmlUsage
- [ ] asyncPipeAria

**Material (14):**
- [ ] matIconAccessibility
- [ ] matFormFieldLabel
- [ ] matSelectPlaceholder
- [ ] matButtonType
- [ ] matDialogFocus
- [ ] matTableHeaders
- [ ] matChipListLabel
- [ ] matSliderLabel
- [ ] matMenuTrigger
- [ ] matTooltipKeyboard
- [ ] matExpansionHeader
- [ ] matTabLabel
- [ ] matStepLabel
- [ ] matSnackbarPoliteness

**CDK (3):**
- [ ] cdkTrapFocusDialog
- [ ] cdkAriaDescriber
- [ ] cdkLiveAnnouncer

**Deliverables:**
- 67 check folders with index.js + verify file each

---

### Phase 3: Verifier Module
**Priority: HIGH | Agents: 1**

#### 3.1 Verifier (`src/core/verifier.js`)
- Load a check's verify file
- Parse pass/fail sections
- Run check on pass section → expect 0 issues
- Run check on fail section → expect >0 issues
- Return verification result

```javascript
// API
verifyCheck(checkModule) → {
  verified: boolean,
  passResult: { expected: 'pass', actual: 'pass'|'fail', issues: [] },
  failResult: { expected: 'fail', actual: 'pass'|'fail', issues: [] },
  error: null | Error
}

verifyAll(checkModules) → Map<name, verificationResult>
```

**Error Handling:**
- Missing verify file → skip with warning
- Parse error → report, don't crash
- Check throws → catch, report as verification failure

**Deliverables:**
- `src/core/verifier.js`
- Unit tests

---

### Phase 4: Parallel Execution
**Priority: HIGH | Agents: 2 parallel**

#### 4.1 Worker Thread (`src/core/worker.js`)
- Receives: check name, file content, file path
- Loads check module
- Runs check
- Returns: result (serializable)
- Error isolation: catches all errors, returns error result

```javascript
// Worker message format
// Input:
{ type: 'run', checkName: string, content: string, filePath: string }
{ type: 'verify', checkName: string }

// Output:
{ type: 'result', checkName: string, result: CheckResult }
{ type: 'error', checkName: string, error: string }
```

#### 4.2 Runner/Pool (`src/core/runner.js`)
- Detect CPU count: `os.cpus().length`
- Create worker pool
- Job queue with work distribution
- Collect results
- Handle worker crashes gracefully

```javascript
// API
class CheckRunner {
  constructor(options = { workers: 'auto' })

  // Run checks on files
  async runChecks(files, checkNames, tier) → Results

  // Self-verify checks
  async verifyChecks(checkNames) → VerificationResults

  // Cleanup
  async shutdown()
}
```

**Error Handling:**
- Worker crash → restart worker, requeue job
- Worker timeout → kill worker, report timeout error
- All workers dead → fall back to single-threaded

**Deliverables:**
- `src/core/worker.js`
- `src/core/runner.js`
- Stress tests

---

### Phase 5: API & CLI Update
**Priority: MEDIUM | Agents: 2 parallel**

#### 5.1 Public API (`src/index.js`)
- Backwards compatible with current API
- Add new options

```javascript
// Existing (keep working)
const { basic, enhanced, full, analyze } = require('traufix-a11y');

// New options
analyze(path, {
  tier: 'full',
  verified: true,         // Run self-test first
  workers: 'auto',        // Parallel execution
  check: 'buttonNames',   // Single check mode
});

// New exports
const { verifyChecks, getCheckInfo } = require('traufix-a11y');
```

#### 5.2 CLI Updates (`bin/cli.js`)
- Add `--full-verified` flag
- Add `--workers <n>` flag
- Add `--self-test` flag (only run verification)
- Progress output for parallel execution

```bash
# New flags
traufix-a11y ./src --full-verified          # Verify then run
traufix-a11y ./src --workers 4              # Limit parallelism
traufix-a11y --self-test                    # Only verify checks
traufix-a11y --list-checks --verbose        # Show check metadata
```

**Deliverables:**
- Updated `src/index.js`
- Updated `bin/cli.js`
- Integration tests

---

### Phase 6: Cleanup & Documentation
**Priority: LOW | Agents: 1**

#### 6.1 Remove Old Files
- Delete `src/checks.js`
- Delete `src/checks-*.js` (all 8 files)
- Delete `tests/html/`, `tests/angular/`, etc.
- Keep `tests/integration/`

#### 6.2 Update Documentation
- Update README.md with new architecture
- Document check module format for contributors
- Document verify file format
- Add CONTRIBUTING.md

#### 6.3 Update package.json
- Update exports
- Add `test` script for new test runner

**Deliverables:**
- Cleaned repo
- Updated docs

---

## Error Handling Strategy

### Error Types & Isolation

| Error Type | Scope | Handling |
|------------|-------|----------|
| Check module syntax error | Single check | Skip check, warn, continue |
| Check runtime error | Single check | Catch, report as failed, continue |
| Verify file missing | Single check | Skip verification, warn |
| Verify file parse error | Single check | Skip verification, warn |
| Worker crash | Single worker | Restart worker, requeue job |
| Worker timeout | Single job | Kill, report timeout, continue |
| All workers dead | System | Fall back to single-threaded |
| File read error | Single file | Skip file, warn, continue |

### Error Result Format

```javascript
{
  type: 'error',
  checkName: 'buttonNames',
  filePath: '/path/to/file.html',
  error: {
    code: 'CHECK_RUNTIME_ERROR',
    message: 'Cannot read property x of undefined',
    stack: '...'  // Only in verbose mode
  }
}
```

---

## Parallelization Details

### CPU Detection

```javascript
const os = require('os');
const cpuCount = os.cpus().length;
const workerCount = Math.max(1, cpuCount - 1); // Leave 1 for main thread
```

### Work Distribution

```
Files: [a.html, b.html, c.html, d.scss, e.html]
Checks per file: 40 (enhanced tier)
Total jobs: 200

Workers: 4
Jobs per worker: ~50

Distribution strategy: Round-robin with job stealing
```

### Worker Pool Lifecycle

```
1. INIT
   - Spawn N workers
   - Workers load check modules
   - Workers signal ready

2. RUN
   - Main thread queues jobs
   - Workers pull jobs
   - Workers return results
   - Main thread collects results

3. VERIFY (if --full-verified)
   - Before RUN phase
   - Each worker verifies subset of checks
   - Collect verification results
   - Filter out failed checks from RUN phase

4. SHUTDOWN
   - Signal workers to exit
   - Wait for graceful shutdown
   - Force kill after timeout
```

---

## Agent Task Assignment

### Parallel Execution Plan

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Core Infrastructure (2 agents parallel)            │
├─────────────────────────────────────────────────────────────┤
│ Agent A: parser.js                                          │
│ Agent B: loader.js                                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Check Migration (8 agents parallel)                │
├─────────────────────────────────────────────────────────────┤
│ Agent 1: HTML Basic (17 checks)                             │
│ Agent 2: HTML Extra (6 checks)                              │
│ Agent 3: SCSS Basic (3 checks)                              │
│ Agent 4: SCSS Extra (11 checks)                             │
│ Agent 5: Angular (6 checks)                                 │
│ Agent 6: Material 1 (7 checks)                              │
│ Agent 7: Material 2 (7 checks)                              │
│ Agent 8: CDK (3 checks)                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: Verifier (1 agent)                                 │
├─────────────────────────────────────────────────────────────┤
│ Agent: verifier.js + tests                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: Parallel Execution (2 agents parallel)             │
├─────────────────────────────────────────────────────────────┤
│ Agent A: worker.js                                          │
│ Agent B: runner.js                                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 5: API & CLI (2 agents parallel)                      │
├─────────────────────────────────────────────────────────────┤
│ Agent A: index.js (API)                                     │
│ Agent B: cli.js                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 6: Cleanup (1 agent)                                  │
├─────────────────────────────────────────────────────────────┤
│ Agent: Cleanup + docs                                       │
└─────────────────────────────────────────────────────────────┘
```

### Agent Instructions Template

Each agent receives:
1. This plan document
2. Specific phase/task assignment
3. List of files to create/modify
4. Expected deliverables
5. Test requirements

---

## Testing Strategy

### Unit Tests
- `parser.test.js` - verify file parsing
- `loader.test.js` - check discovery/loading
- `verifier.test.js` - self-verification logic
- `worker.test.js` - worker message handling
- `runner.test.js` - pool management

### Integration Tests
- Full analysis run (all tiers)
- `--full-verified` mode
- Parallel vs single-threaded consistency
- Error recovery scenarios

### Self-Test (Built-in)
- Each check has verify file
- `--self-test` runs all verifications
- CI can use this for health checks

---

## Rollback Plan

If migration fails:
1. Old check files preserved in `src/legacy/`
2. Feature flag to use old system
3. Can revert by restoring old files

---

## Success Criteria

- [ ] All 67 checks migrated to folder structure
- [ ] All 67 checks have verify files
- [ ] `--full-verified` passes (100% self-test)
- [ ] Parallel execution works (measured speedup)
- [ ] Backwards compatible API
- [ ] No regressions in check detection
- [ ] Documentation updated

---

## Timeline Estimate

| Phase | Agents | Estimated Work |
|-------|--------|----------------|
| Phase 1 | 2 | Core infra |
| Phase 2 | 8 | Check migration (bulk) |
| Phase 3 | 1 | Verifier |
| Phase 4 | 2 | Parallel execution |
| Phase 5 | 2 | API/CLI |
| Phase 6 | 1 | Cleanup |

**Total: 16 agent tasks, parallelizable to ~5 sequential phases**

---

## Notes

- Keep `colors.js` utility - still needed
- Worker threads require Node.js 12+
- Consider `--no-workers` flag for environments without worker support
- Verify files should be small (just enough to test the check)
