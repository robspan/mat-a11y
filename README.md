# traufix-a11y

Static accessibility analyzer for Angular/HTML templates with full Lighthouse audit coverage.

**67 checks** | **3 tiers** | **Angular Material support** | **WCAG 2.1 contrast calculation**

## Quick Start

```bash
# Install
npm install traufix-a11y

# Run on your project
npx traufix-a11y ./src/app
```

## Simple One-Liner API

```javascript
const { basic, enhanced, full } = require('traufix-a11y');

// Quick check (20 checks)
const results = basic('./src/app/media');

// Recommended for Angular (40 checks)
const results = enhanced('./src/app/media');

// Maximum coverage (67 checks)
const results = full('./src/app/media');
```

## Tiers

| Tier | Checks | Best For |
|------|--------|----------|
| **basic** | 20 | Quick CI checks, small projects |
| **enhanced** | 40 | Angular apps, daily development (default) |
| **full** | 67 | Production audits, maximum coverage |

### Basic (20 checks)
Core Lighthouse accessibility audits:
- HTML: buttons, images, forms, ARIA, headings, links, tables, iframes, videos
- SCSS: color contrast, focus styles, touch targets

### Enhanced (40 checks)
Basic + Angular + common Material:
- Angular: `(click)` handlers, `routerLink`, `*ngFor` trackBy
- Material: `mat-icon`, `mat-form-field`, `mat-button`, `mat-table`
- Extra HTML: viewport, skip links, autoplay media

### Full (67 checks)
Everything:
- All Material: dialogs, sliders, menus, tabs, steppers, chips, expansion panels
- CDK: focus trapping, aria describer, live announcer
- All SCSS: animations, font sizes, line heights, text-align

## CLI Usage

```bash
# Basic check (fastest)
traufix-a11y ./src --basic

# Enhanced check (default)
traufix-a11y ./src

# Full audit
traufix-a11y ./src --full

# Check specific folder only
traufix-a11y ./src/app/media

# JSON output for CI
traufix-a11y ./src -f json -o report.json

# HTML report
traufix-a11y ./src -f html -o report.html

# Ignore additional paths
traufix-a11y ./src -i "test" -i "mock"
```

### CLI Options

```
-b, --basic       Basic tier (20 checks)
-e, --enhanced    Enhanced tier (40 checks) [default]
-F, --full        Full tier (67 checks)
-f, --format      Output: console, json, html
-o, --output      Write to file
-i, --ignore      Ignore pattern (repeatable)
-c, --check       Run only a single specific check
-l, --list-checks List all available checks
-V, --verbose     Verbose output
-v, --version     Show version
-h, --help        Show help
```

### Single Check Mode

Test individual checks in isolation:

```bash
# Run only the buttonNames check
traufix-a11y ./src --check buttonNames

# Run only the matIconAccessibility check
traufix-a11y ./src --check matIconAccessibility

# List all available checks by name
traufix-a11y --list-checks
```

This is useful for:
- Debugging specific accessibility issues
- Running focused audits
- Testing your own fixes

## Programmatic API

```javascript
const { analyze, checkHTML, checkSCSS, formatConsoleOutput } = require('traufix-a11y');

// Analyze directory
const results = analyze('./src/app/media', {
  tier: 'enhanced',
  ignore: ['node_modules', 'dist', 'test']
});

console.log(formatConsoleOutput(results));

// Run a single check only
const buttonResults = analyze('./src/app', {
  tier: 'full',
  check: 'buttonNames'
});

// Check HTML string directly
const htmlResults = checkHTML('<button></button>', 'enhanced');

// Check SCSS string directly
const scssResults = checkSCSS('button { outline: none; }', 'full');
```

## Default Ignores

These paths are ignored by default:
- `node_modules`
- `.git`
- `dist`
- `build`
- `.angular`
- `coverage`

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Accessibility issues found |
| 2 | Error during analysis |

## CI Integration

### GitHub Actions

```yaml
- name: Accessibility Check
  run: npx traufix-a11y ./src --enhanced
```

### Pre-commit Hook

```json
{
  "scripts": {
    "a11y": "traufix-a11y ./src",
    "precommit": "npm run a11y"
  }
}
```

## Checks Reference

### HTML Checks (23)

| Check | Description |
|-------|-------------|
| buttonNames | Buttons must have accessible names |
| imageAlt | Images must have alt attributes |
| formLabels | Form controls must have labels |
| ariaRoles | ARIA roles must be valid |
| ariaAttributes | ARIA attributes must have valid values |
| uniqueIds | IDs must be unique |
| headingOrder | Headings must follow logical order |
| linkNames | Links must have accessible names |
| listStructure | Lists must have proper structure |
| dlStructure | Definition lists must use proper markup |
| tableHeaders | Tables must have headers |
| iframeTitles | Iframes must have titles |
| videoCaptions | Videos should have captions |
| objectAlt | Objects must have alt text |
| accesskeyUnique | Accesskey values must be unique |
| tabindex | No positive tabindex values |
| ariaHiddenBody | Body cannot have aria-hidden |
| htmlHasLang | HTML must have lang attribute |
| metaViewport | Viewport must allow zooming |
| skipLink | Skip navigation link should exist |
| inputImageAlt | Input images must have alt |
| autoplayMedia | Autoplay media must be muted with controls |
| marqueeElement | Marquee element not allowed |

### Angular Checks (6)

| Check | Description |
|-------|-------------|
| clickWithoutKeyboard | (click) needs keyboard handler |
| clickWithoutRole | (click) needs role and tabindex |
| routerLinkNames | routerLink needs accessible name |
| ngForTrackBy | *ngFor should have trackBy |
| innerHtmlUsage | [innerHTML] usage warning |
| asyncPipeAria | Async pipe content needs aria-live |

### Angular Material Checks (14)

| Check | Description |
|-------|-------------|
| matIconAccessibility | mat-icon needs aria-hidden or aria-label |
| matFormFieldLabel | mat-form-field needs mat-label |
| matSelectPlaceholder | mat-select needs label, not just placeholder |
| matButtonType | mat-button only on button/a elements |
| matDialogFocus | mat-dialog needs focus management |
| matTableHeaders | mat-table needs header row |
| matChipListLabel | mat-chip-list needs aria-label |
| matSliderLabel | mat-slider needs label |
| matMenuTrigger | Menu trigger needs accessible name |
| matTooltipKeyboard | matTooltip needs focusable host |
| matExpansionHeader | Expansion panel needs header |
| matTabLabel | mat-tab needs label |
| matStepLabel | mat-step needs label |
| matSnackbarPoliteness | Snackbar politeness warning |

### CDK Checks (3)

| Check | Description |
|-------|-------------|
| cdkTrapFocusDialog | Dialogs should trap focus |
| cdkAriaDescriber | Complex widgets may need descriptions |
| cdkLiveAnnouncer | Dynamic content may need announcements |

### SCSS Checks (14)

| Check | Description |
|-------|-------------|
| colorContrast | WCAG 2.1 AA color contrast |
| focusStyles | Interactive elements need focus indicators |
| touchTargets | Minimum 44x44px touch targets |
| outlineNoneWithoutAlt | outline:none needs alternative focus |
| prefersReducedMotion | Animations should respect motion preference |
| userSelectNone | user-select:none warning |
| pointerEventsNone | pointer-events:none on interactive elements |
| visibilityHiddenUsage | visibility:hidden usage info |
| focusWithinSupport | Complex components may need :focus-within |
| hoverWithoutFocus | :hover should have matching :focus |
| contentOverflow | overflow:hidden may hide content |
| smallFontSize | Font sizes below 12px warning |
| lineHeightTight | line-height below 1.2 warning |
| textJustify | text-align:justify readability warning |

---

## Haftungsausschluss / Disclaimer

**DEUTSCH:**

Diese Software wird "wie besehen" ohne jegliche Gewährleistung bereitgestellt.
Keine Garantie für Vollständigkeit, Richtigkeit oder Eignung für bestimmte Zwecke.
Die Nutzung erfolgt auf eigenes Risiko.

Diese Software ersetzt keine professionelle Barrierefreiheits-Prüfung und garantiert
keine Konformität mit WCAG, BITV 2.0 oder anderen Standards.

**ENGLISH:**

This software is provided "as is" without warranty of any kind.
No guarantee of completeness, accuracy, or fitness for any purpose.
Use at your own risk.

This software does not replace professional accessibility audits and does not
guarantee compliance with WCAG, BITV 2.0, or other standards.

---

## License

MIT License - see [LICENSE](LICENSE)

## Testing

The library includes test files that verify each check correctly identifies accessibility issues.

```bash
# Run the test suite
node tests/run-tests.js
```

Each test file in `tests/` contains intentionally bad code that should fail its respective check. The test runner expects 100% detection rate - all checks should find issues in their test files.

### Test Structure

```
tests/
├── html/           # HTML check test files
├── angular/        # Angular check test files
├── material/       # Material check test files
├── scss/           # SCSS check test files
└── run-tests.js    # Test runner script
```

## Contributing

Contributions welcome! Please open an issue or PR.

---

Made with care by **Robin Spanier** - Freelance Web Developer

- [Traufix](https://traufix.de) - Website Builder for Bridal Couples
- [robspan.de](https://robspan.de) - Freelance Services
- Contact: robin.spanier@robspan.de
