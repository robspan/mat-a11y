# mat-a11y

**Lighthouse can't see your Angular Material components.** mat-a11y can.

82 accessibility checks for Angular + Material, scored per-page from your sitemap - exactly how Google sees your site.

```
mat-a11y ./my-angular-app
```
```
URL SCORES (67 URLs from sitemap.xml):
  Passing (90-100%): 61 URLs
  Needs Work (50-89%): 6 URLs
  Failing (<50%): 0 URLs

  83%  /
  87%  /about
  100%  /guide/how-to-plan
  ... and 64 more

FIX PRIORITIES:
  1. / (83%)
     - matIconAccessibility: 50 errors
     - colorContrast: 4 errors
```

## Quick Start

```bash
npm install mat-a11y
mat-a11y ./src
```

## Why mat-a11y?

| | Lighthouse | mat-a11y |
|---|:---:|:---:|
| Angular Material checks | - | 29 checks |
| SCSS analysis (focus styles, contrast) | - | 14 checks |
| Source file + line numbers | - | yes |
| Runs without browser | - | yes |
| Scores each sitemap URL | - | yes |
| CI/CD friendly | slow | fast |

**Sitemap-based scoring**: Google ranks pages independently. Your admin panel's score doesn't affect your landing page. mat-a11y reads `sitemap.xml` and scores exactly what Google crawls.

## Usage

```bash
# Analyze (uses sitemap.xml by default)
mat-a11y ./src

# Generate reports
mat-a11y ./src --json           # mat-a11y-report.json
mat-a11y ./src --html           # mat-a11y-report.html

# Tiers
mat-a11y ./src --basic          # Quick wins across all categories (default)
mat-a11y ./src --material       # ONLY mat-* checks (29 checks)
mat-a11y ./src --angular        # ONLY Angular + CDK checks (10 checks)
mat-a11y ./src --full           # Everything (82 checks)

# Debug
mat-a11y --list-checks          # Show all checks
mat-a11y ./src --check imageAlt # Run single check
```

### CI Integration

```yaml
# .github/workflows/a11y.yml
- name: A11y Check
  run: npx mat-a11y ./src --json

- uses: actions/upload-artifact@v3
  with:
    name: a11y-report
    path: mat-a11y-report.json
```

Exit codes: `0` = passing, `1` = failing pages exist, `2` = error

---

## Checks (82 total)

| Category | Count | Examples |
|----------|-------|----------|
| HTML | 29 | `imageAlt`, `buttonNames`, `formLabels`, `headingOrder` |
| Angular Material | 29 | `matFormFieldLabel`, `matDialogFocus`, `matIconAccessibility` |
| SCSS | 14 | `colorContrast`, `focusStyles`, `touchTargets` |
| Angular | 7 | `clickWithoutKeyboard`, `routerLinkNames` |
| CDK | 3 | `cdkTrapFocusDialog`, `cdkLiveAnnouncer` |

Run `mat-a11y --list-checks` for full list with descriptions.

### HTML Checks (29)

| Check | Weight | WCAG | Description |
|-------|--------|------|-------------|
| `buttonNames` | 10 | 4.1.2 | Buttons must have accessible names |
| `imageAlt` | 10 | 1.1.1 | Images must have alt text |
| `formLabels` | 10 | 1.3.1 | Form inputs must have labels |
| `linkNames` | 10 | 2.4.4 | Links must have accessible names |
| `ariaRoles` | 7 | 4.1.2 | ARIA roles must be valid |
| `ariaAttributes` | 7 | 4.1.2 | ARIA attributes must be valid |
| `uniqueIds` | 7 | 4.1.1 | IDs must be unique |
| `headingOrder` | 3 | 1.3.1 | Headings must be in logical order |
| `tableHeaders` | 7 | 1.3.1 | Tables must have headers |
| `iframeTitles` | 7 | 2.4.1 | Iframes must have titles |
| `listStructure` | 3 | 1.3.1 | Lists must use proper structure |
| `dlStructure` | 3 | 1.3.1 | Definition lists must be structured |
| `videoCaptions` | 10 | 1.2.2 | Videos must have captions |
| `objectAlt` | 7 | 1.1.1 | Objects must have text alternatives |
| `accesskeyUnique` | 3 | 4.1.1 | Accesskeys must be unique |
| `tabindex` | 3 | 2.4.3 | Tabindex should not be positive |
| `ariaHiddenBody` | 10 | 4.1.2 | Body must not be aria-hidden |
| `htmlHasLang` | 7 | 3.1.1 | HTML must have lang attribute |
| `metaViewport` | 7 | 1.4.4 | Viewport must allow zoom |
| `skipLink` | 3 | 2.4.1 | Page should have skip link |
| `inputImageAlt` | 7 | 1.1.1 | Input images need alt |
| `autoplayMedia` | 3 | 1.4.2 | Media should not autoplay |
| `marqueeElement` | 7 | 2.2.2 | Marquee element not allowed |
| `blinkElement` | 7 | 2.2.2 | Blink element not allowed |
| `metaRefresh` | 3 | 2.2.1 | No auto-refresh |
| `duplicateIdAria` | 7 | 4.1.1 | IDs referenced by ARIA must be unique |
| `emptyTableHeader` | 3 | 1.3.1 | Table headers should not be empty |
| `scopeAttrMisuse` | 3 | 1.3.1 | Scope attribute used correctly |
| `formFieldName` | 7 | 4.1.2 | Form fields need names |

### Angular Material Checks (29)

| Check | Weight | Description |
|-------|--------|-------------|
| `matFormFieldLabel` | 10 | mat-form-field must have label |
| `matSelectPlaceholder` | 7 | mat-select needs placeholder or label |
| `matAutocompleteLabel` | 7 | mat-autocomplete needs label |
| `matDatepickerLabel` | 7 | mat-datepicker needs label |
| `matRadioGroupLabel` | 7 | mat-radio-group needs label |
| `matSlideToggleLabel` | 7 | mat-slide-toggle needs label |
| `matCheckboxLabel` | 7 | mat-checkbox needs label |
| `matChipListLabel` | 7 | mat-chip-list needs label |
| `matSliderLabel` | 7 | mat-slider needs label |
| `matButtonType` | 3 | mat-button should have type |
| `matIconAccessibility` | 10 | mat-icon needs aria-label or aria-hidden |
| `matButtonToggleLabel` | 7 | mat-button-toggle needs label |
| `matProgressBarLabel` | 7 | mat-progress-bar needs label |
| `matProgressSpinnerLabel` | 7 | mat-progress-spinner needs label |
| `matBadgeDescription` | 3 | mat-badge needs description |
| `matMenuTrigger` | 7 | mat-menu trigger needs aria |
| `matSidenavA11y` | 7 | mat-sidenav accessibility |
| `matTabLabel` | 7 | mat-tab needs label |
| `matStepLabel` | 7 | mat-step needs label |
| `matExpansionHeader` | 7 | mat-expansion-panel needs header |
| `matTreeA11y` | 7 | mat-tree accessibility |
| `matListSelectionLabel` | 7 | mat-selection-list needs label |
| `matTableHeaders` | 7 | mat-table needs headers |
| `matPaginatorLabel` | 3 | mat-paginator needs labels |
| `matSortHeaderAnnounce` | 3 | mat-sort-header announcements |
| `matDialogFocus` | 10 | mat-dialog focus management |
| `matBottomSheetA11y` | 7 | mat-bottom-sheet accessibility |
| `matTooltipKeyboard` | 3 | mat-tooltip keyboard access |
| `matSnackbarPoliteness` | 3 | mat-snackbar politeness |

### SCSS Checks (14)

| Check | Weight | Description |
|-------|--------|-------------|
| `colorContrast` | 7 | Text contrast ratio >= 4.5:1 |
| `focusStyles` | 10 | Focus states must be visible |
| `touchTargets` | 7 | Touch targets >= 44x44px |
| `outlineNoneWithoutAlt` | 7 | outline:none needs alternative |
| `prefersReducedMotion` | 3 | Respect prefers-reduced-motion |
| `userSelectNone` | 3 | user-select:none usage |
| `pointerEventsNone` | 3 | pointer-events:none usage |
| `visibilityHiddenUsage` | 3 | visibility:hidden usage |
| `focusWithinSupport` | 3 | :focus-within support |
| `hoverWithoutFocus` | 7 | :hover should have :focus |
| `contentOverflow` | 3 | Content overflow handling |
| `smallFontSize` | 7 | Font size >= 12px |
| `lineHeightTight` | 3 | Line height >= 1.5 |
| `textJustify` | 3 | Avoid text-align: justify |

### Angular Checks (7)

| Check | Weight | Description |
|-------|--------|-------------|
| `clickWithoutKeyboard` | 10 | (click) needs keyboard handler |
| `clickWithoutRole` | 7 | (click) on non-button needs role |
| `routerLinkNames` | 7 | routerLink needs accessible name |
| `ngForTrackBy` | 3 | *ngFor should use trackBy |
| `innerHtmlUsage` | 3 | [innerHTML] security |
| `asyncPipeAria` | 3 | async pipe with aria |
| `autofocusUsage` | 3 | autofocus attribute usage |

### CDK Checks (3)

| Check | Weight | Description |
|-------|--------|-------------|
| `cdkTrapFocusDialog` | 10 | Dialogs must trap focus |
| `cdkAriaDescriber` | 7 | CDK aria describer usage |
| `cdkLiveAnnouncer` | 7 | CDK live announcer usage |

---

## Output Formats (14)

mat-a11y supports 14 output formats for CI/CD, monitoring, and notifications.

| Formatter | Category | Output | Description |
|-----------|----------|--------|-------------|
| `sarif` | CI/CD | JSON | SARIF 2.1.0 for GitHub Security tab |
| `junit` | CI/CD | XML | JUnit XML for Jenkins, GitLab CI, CircleCI |
| `github-annotations` | CI/CD | Text | GitHub Actions workflow annotations |
| `gitlab-codequality` | CI/CD | JSON | GitLab Code Quality reports |
| `sonarqube` | Code Quality | JSON | SonarQube generic issue format |
| `checkstyle` | Code Quality | XML | Checkstyle XML format |
| `markdown` | Docs | Text | Markdown for PR comments, wikis |
| `csv` | Data | Text | CSV for spreadsheets |
| `prometheus` | Monitoring | Text | Prometheus exposition format |
| `grafana-json` | Monitoring | JSON | Grafana JSON datasource |
| `datadog` | Monitoring | JSON | DataDog metrics format |
| `slack` | Notifications | JSON | Slack Block Kit messages |
| `discord` | Notifications | JSON | Discord embed messages |
| `teams` | Notifications | JSON | Microsoft Teams Adaptive Cards |

**Example outputs:** See [`example-outputs/`](./example-outputs) for sample output from each formatter.

### Using Formatters

```javascript
const { formatters, analyzeBySitemap } = require('mat-a11y');

const results = analyzeBySitemap('./my-app');

// CI/CD Integration
const sarif = formatters.format('sarif', results);
const junit = formatters.format('junit', results);

// Monitoring
const prometheus = formatters.format('prometheus', results);

// Notifications
const slack = formatters.format('slack', results);
```

---

## Programmatic API

### Quick Analysis

```javascript
const { basic, material, angular, full } = require('mat-a11y');

// Quick wins - best value/effort (default)
const results = basic('./src');

// ONLY mat-* component checks (29)
const results = material('./src');

// ONLY Angular + CDK checks (10)
const results = angular('./src');

// Everything - all 82 checks
const results = full('./src');
```

### Sitemap-Based Analysis (Recommended)

```javascript
const { analyzeBySitemap } = require('mat-a11y');

const results = analyzeBySitemap('./my-app', { tier: 'material' });

console.log(`Analyzed ${results.urlCount} URLs`);
console.log(`Passing: ${results.distribution.passing}`);
console.log(`Warning: ${results.distribution.warning}`);
console.log(`Failing: ${results.distribution.failing}`);

// Worst URLs
for (const url of results.worstUrls) {
  console.log(`${url.path} (${url.score}%)`);
}
```

### Route-Based Analysis

```javascript
const { analyzeByRoute } = require('mat-a11y');

const results = analyzeByRoute('./my-app', { tier: 'full' });

for (const route of results.routes) {
  console.log(`${route.path}: ${route.auditScore}%`);
}
```

### Direct Content Analysis

```javascript
const { checkHTML, checkSCSS } = require('mat-a11y');

// Check HTML string
const htmlResults = checkHTML(`
  <button></button>
  <img src="photo.jpg">
`, 'material');

// Check SCSS string
const scssResults = checkSCSS(`
  .button:focus { outline: none; }
`, 'material');
```

### Color Utilities

```javascript
const { colors } = require('mat-a11y');

// Calculate contrast ratio
const ratio = colors.getContrastRatio('#ffffff', '#000000'); // 21

// Check WCAG compliance
colors.meetsWCAG_AA(ratio);   // true (>= 4.5)
colors.meetsWCAG_AAA(ratio);  // true (>= 7)

// Get rating
colors.getContrastRating(ratio); // 'AAA'
```

---

## TypeScript Support

Full TypeScript definitions included. See [`src/index.d.ts`](./src/index.d.ts) for complete type definitions.

```typescript
import {
  analyzeBySitemap,
  analyzeByRoute,
  formatters,
  SitemapAnalysisResult,
  RouteAnalysisResult,
  Tier
} from 'mat-a11y';

const results: SitemapAnalysisResult = analyzeBySitemap('./my-app', {
  tier: 'material' as Tier
});

const sarif: string = formatters.format('sarif', results);
```

### Key Types

```typescript
type Tier = 'basic' | 'material' | 'angular' | 'full';

interface SitemapAnalysisResult {
  tier: Tier;
  sitemapPath: string;
  urlCount: number;
  resolved: number;
  unresolved: number;
  distribution: { passing: number; warning: number; failing: number };
  urls: UrlResult[];
  worstUrls: WorstUrl[];
  internal: InternalPagesResult;
}

interface UrlResult {
  url: string;
  path: string;
  auditScore: number;
  issues: Array<{ message: string; file: string; check: string }>;
  audits: Array<{ name: string; weight: number; passed: boolean; elementsFound: number }>;
}
```

---

## CLI Reference

```
mat-a11y <path> [options]

Tiers:
  --basic              Quick wins (default)
  --material           ONLY mat-* checks (29)
  --angular            ONLY Angular + CDK checks (10)
  --full               Everything (82 checks)

Output:
  --json               Write mat-a11y-report.json
  --html               Write mat-a11y-report.html
  -f, --format <name>  Output format (sarif, junit, checkstyle, csv, etc.)
  -o, --output <path>  Custom output path

Options:
  -i, --ignore <pat>   Ignore pattern (can repeat)
  --check <name>       Run single check only
  --list-checks        List all available checks
  --file-based         Legacy file-based analysis
  -h, --help           Show help
  -v, --version        Show version

Exit Codes:
  0                    Success (no failing pages)
  1                    Failure (has failing pages with score < 50)
  2                    Error (couldn't run analysis)
```

### CLI Examples

```bash
# Basic analysis
mat-a11y ./src

# Generate reports with custom paths
mat-a11y ./src --json -o reports/a11y.json
mat-a11y ./src --html -o reports/a11y.html

# Output as SARIF for GitHub Security tab
mat-a11y ./src --format sarif -o results.sarif

# Output as JUnit for CI/CD
mat-a11y ./src --format junit -o test-results.xml

# Output as Slack webhook payload
mat-a11y ./src --format slack -o slack-message.json
```

---

## Scoring

Lighthouse-compatible weighted scoring:

```
Score = (sum of passing audit weights) / (sum of all audit weights) x 100
```

**Rules:**
1. Each check has a weight (1-10)
2. A check **passes** if it has 0 errors (warnings don't fail)
3. Only applicable checks affect the score

**Example:**
```
buttonNames (weight 10): 0 errors -> passes (+10)
imageAlt (weight 10): 2 errors -> fails (+0)
colorContrast (weight 7): 0 errors -> passes (+7)

Score = (10 + 0 + 7) / (10 + 10 + 7) x 100 = 63%
```

---

## Limitations

- **Static analysis only** - Cannot evaluate runtime behavior
- **CSS variables** - `colorContrast` cannot resolve CSS custom properties
- **Dynamic content** - Content loaded from APIs is not analyzed
- **Not a replacement** - Use alongside Lighthouse and manual testing

---

## Requirements

- Node.js >= 16.0.0
- Angular >= 12 (for sitemap/route analysis)
- Angular Material >= 12 (for mat-* checks)

## License

MIT - [Robin Spanier](https://robspan.de)
