# mat-a11y Development Guide

This folder contains development tools for maintaining and extending mat-a11y. These files are **not shipped to npm** - only available when you clone the repository.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/robspan/traufix-a11y
cd traufix-a11y

# Run all tests
npm test

# Run full dev checks (structure + formatters + self-test)
npm run dev-check
```

## Project Structure

```
mat-a11y/
├── src/                    # Core source (shipped to npm)
│   ├── checks/             # 82 accessibility checks
│   │   └── <checkName>/
│   │       ├── index.js    # Check implementation
│   │       └── verify.html # Test file (NOT shipped to npm)
│   ├── core/               # Analysis engine
│   ├── formatters/         # 14 output formatters
│   └── index.js            # Main exports
├── bin/
│   └── cli.js              # CLI entry point
├── dev-tools/              # Development tools (NOT shipped)
│   ├── verify-structure.js # Validates check file structure
│   ├── verify-formatters.js# Tests formatters against fixtures
│   ├── generate-examples.js# Generate example outputs
│   ├── run-checks.js       # Run all dev checks
│   └── fixtures/           # Test fixtures
└── example-outputs/        # Sample formatter outputs (NOT shipped)
```

## npm Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run structure verification + formatter verification |
| `npm run verify-structure` | Verify all check verify files have required sections |
| `npm run verify-formatters` | Test all formatters against 21 fixtures |
| `npm run dev-check` | Full check: structure + formatters + self-test |

## Dev Tools

### verify-structure.js

Validates that every check's `verify.html` or `verify.scss` file contains all required test sections:

- `@a11y-pass` - Cases that should NOT trigger issues
- `@a11y-fail` - Cases that SHOULD trigger issues
- `@a11y-false-positive` - Accessible code that naive checks might incorrectly flag
- `@a11y-false-negative` - Inaccessible code that naive checks might miss

```bash
node dev-tools/verify-structure.js
```

### verify-formatters.js

Tests all 14 formatters against 21 fixtures (14 static + 7 generated from real check output):

```bash
node dev-tools/verify-formatters.js
node dev-tools/verify-formatters.js --verbose  # Show all results
```

### generate-examples.js

Generates example outputs for all 14 formatters from a real Angular project:

```bash
node dev-tools/generate-examples.js <path-to-angular-project>
```

Outputs go to `example-outputs/`.

### run-checks.js

Runs all development checks in sequence:

```bash
node dev-tools/run-checks.js
node dev-tools/run-checks.js --verbose
```

## Adding a New Check

1. **Create the check folder:**
   ```
   src/checks/myNewCheck/
   ├── index.js      # Check implementation
   └── verify.html   # Test file (or verify.scss for SCSS checks)
   ```

2. **Implement the check** (`index.js`):
   ```javascript
   'use strict';

   module.exports = {
     name: 'myNewCheck',
     description: 'Human-readable description',
     type: 'html',  // or 'scss'
     weight: 7,     // 1-10 (Lighthouse-style)
     wcag: '4.1.2', // WCAG criterion or null

     check(content) {
       const issues = [];
       let elementsFound = 0;

       // Your check logic here
       // Parse content, find issues, push to issues[]

       return { issues, elementsFound };
     }
   };
   ```

3. **Create the verify file** (`verify.html`):
   ```html
   <!-- @a11y-pass -->
   <!-- Obvious good cases -->
   <button aria-label="Save">Save</button>

   <!-- @a11y-fail -->
   <!-- Obvious bad cases -->
   <button></button>

   <!-- @a11y-false-positive -->
   <!-- Tricky accessible code that naive checks might flag -->
   <button><span class="sr-only">Save</span></button>

   <!-- @a11y-false-negative -->
   <!-- Tricky inaccessible code that naive checks might miss -->
   <button aria-label="">Save</button>
   ```

4. **Add to TIERS** in `src/index.js`:
   ```javascript
   const TIERS = {
     basic: {
       html: ['myNewCheck', ...],
     },
     // ...
   };
   ```

5. **Add weight** in `src/core/weights.js`:
   ```javascript
   const WEIGHTS = {
     myNewCheck: 7,
     // ...
   };
   ```

6. **Verify:**
   ```bash
   npm run verify-structure  # Check verify file structure
   npm test                  # Full test
   ```

## Adding a New Formatter

1. **Create the formatter folder:**
   ```
   src/formatters/myFormatter/
   └── index.js
   ```

2. **Implement the formatter:**
   ```javascript
   'use strict';

   module.exports = {
     name: 'my-formatter',
     description: 'Human-readable description',
     category: 'cicd',        // cicd|monitoring|notifications|code-quality|docs|data
     output: 'json',          // json|xml|text|html
     fileExtension: '.json',
     mimeType: 'application/json',

     format(results, options = {}) {
       // results can be SitemapAnalysisResult, RouteAnalysisResult, or AnalysisResult

       // Normalize to array of URLs/routes
       const urls = results.urls || results.routes || [];

       // Your formatting logic
       const output = {
         // ...
       };

       return JSON.stringify(output, null, 2);
     }
   };
   ```

3. **Test:**
   ```bash
   npm run verify-formatters  # Tests against 21 fixtures
   ```

## Fixture System

### Static Fixtures (`fixtures/sample-results.js`)

Hand-crafted edge cases:
- Empty results
- Single URL
- Multiple URLs
- All passing / all failing / mixed
- Edge cases (no issues, special characters, etc.)

### Generated Fixtures (`fixtures/generateFixtures.js`)

Dynamically generated from real check output:
- Runs actual checks against verify files
- Mixes different categories (HTML, SCSS, Angular, Material, CDK)
- Mixes different severities (Error, Warning)
- Creates realistic test data

## Self-Test System

The self-test verifies:

1. **Check verification** (82 checks):
   - Each check's verify file has pass/fail sections
   - Check finds 0 issues in pass section
   - Check finds >0 issues in fail section

2. **Formatter verification** (14 formatters x 21 fixtures = 294 tests):
   - No crashes with any input type
   - Valid output format (JSON parseable, XML well-formed, etc.)
   - Non-empty output

Run from CLI:
```bash
mat-a11y --self-test
mat-a11y --self-test --full  # Test all 82 checks
```

## GitHub Actions CI

PRs are automatically blocked if self-test fails. See `.github/workflows/ci.yml`.

The CI runs:
1. Structure verification
2. Formatter verification
3. Full self-test

## Package Publishing

### What ships to npm:

- `src/` - Core logic, checks (index.js only), formatters
- `bin/` - CLI
- `README.md`, `LICENSE`

### What stays in git only:

- `dev-tools/` - Development scripts, fixtures
- `example-outputs/` - Sample formatter outputs
- `src/checks/**/verify.html|scss` - Self-test files
- `.github/` - CI workflows

This is controlled by `package.json`:
```json
"files": [
  "src",
  "!src/checks/**/verify.html",
  "!src/checks/**/verify.scss",
  "bin",
  "README.md",
  "LICENSE"
]
```

## Debugging Tips

### Run single check:
```bash
mat-a11y ./my-app --check buttonNames
```

### Verbose output:
```bash
mat-a11y ./my-app --verbose
```

### Test formatter output:
```javascript
const { formatters, analyzeBySitemap } = require('./src');
const results = analyzeBySitemap('./my-app');
console.log(formatters.format('sarif', results));
```

### Check fixture generation:
```bash
node dev-tools/fixtures/generateFixtures.js
```
