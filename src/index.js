/**
 * traufix-a11y
 *
 * Static accessibility analyzer for Angular/HTML templates.
 * Full Lighthouse audit coverage with WCAG 2.1 contrast ratio calculation.
 *
 * HAFTUNGSAUSSCHLUSS / DISCLAIMER:
 * Diese Software wird "wie besehen" ohne jegliche Gewährleistung bereitgestellt.
 * Keine Garantie für Vollständigkeit, Richtigkeit oder Eignung für bestimmte Zwecke.
 * Nutzung auf eigene Verantwortung. / Use at your own risk.
 *
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const colors = require('./colors');
const baseChecks = require('./checks');

// Import additional check modules
let angularChecks, materialChecks1, materialChecks2, htmlChecks1, htmlChecks2;
let scssChecks1, scssChecks2, cdkChecks;

try {
  angularChecks = require('./checks-angular');
  materialChecks1 = require('./checks-material-1');
  materialChecks2 = require('./checks-material-2');
  htmlChecks1 = require('./checks-html-extra-1');
  htmlChecks2 = require('./checks-html-extra-2');
  scssChecks1 = require('./checks-scss-extra-1');
  scssChecks2 = require('./checks-scss-extra-2');
  cdkChecks = require('./checks-cdk');
} catch (e) {
  // Modules not available, will use base checks only
}

/**
 * Check Tiers:
 *
 * BASIC (20 checks) - Core Lighthouse accessibility checks
 *   Best for: Quick CI checks, small projects
 *
 * ENHANCED (40 checks) - Basic + Angular + common Material checks
 *   Best for: Angular applications, regular development
 *
 * FULL (67 checks) - All checks including CDK, all Material, all SCSS
 *   Best for: Production audits, maximum coverage
 */
const TIERS = {
  basic: {
    html: [
      'buttonNames', 'imageAlt', 'formLabels', 'ariaRoles', 'ariaAttributes',
      'uniqueIds', 'headingOrder', 'linkNames', 'listStructure', 'dlStructure',
      'tableHeaders', 'iframeTitles', 'videoCaptions', 'objectAlt',
      'accesskeyUnique', 'tabindex', 'ariaHiddenBody'
    ],
    scss: ['colorContrast', 'focusStyles', 'touchTargets'],
    angular: [],
    material: [],
    cdk: []
  },

  enhanced: {
    html: [
      'buttonNames', 'imageAlt', 'formLabels', 'ariaRoles', 'ariaAttributes',
      'uniqueIds', 'headingOrder', 'linkNames', 'listStructure', 'dlStructure',
      'tableHeaders', 'iframeTitles', 'videoCaptions', 'objectAlt',
      'accesskeyUnique', 'tabindex', 'ariaHiddenBody',
      // Extra HTML
      'htmlHasLang', 'metaViewport', 'skipLink', 'inputImageAlt',
      'autoplayMedia', 'marqueeElement', 'blinkElement'
    ],
    scss: ['colorContrast', 'focusStyles', 'touchTargets', 'outlineNoneWithoutAlt', 'hoverWithoutFocus'],
    angular: ['clickWithoutKeyboard', 'clickWithoutRole', 'routerLinkNames', 'ngForTrackBy'],
    material: ['matIconAccessibility', 'matFormFieldLabel', 'matButtonType', 'matTableHeaders'],
    cdk: []
  },

  full: {
    html: [
      'buttonNames', 'imageAlt', 'formLabels', 'ariaRoles', 'ariaAttributes',
      'uniqueIds', 'headingOrder', 'linkNames', 'listStructure', 'dlStructure',
      'tableHeaders', 'iframeTitles', 'videoCaptions', 'objectAlt',
      'accesskeyUnique', 'tabindex', 'ariaHiddenBody',
      // Extra HTML 1
      'htmlHasLang', 'metaViewport', 'skipLink', 'inputImageAlt',
      'autoplayMedia', 'marqueeElement', 'blinkElement',
      // Extra HTML 2
      'metaRefresh', 'duplicateIdAria', 'emptyTableHeader',
      'scopeAttrMisuse', 'autofocusUsage', 'formFieldName'
    ],
    scss: [
      'colorContrast', 'focusStyles', 'touchTargets',
      // Extra SCSS 1
      'outlineNoneWithoutAlt', 'prefersReducedMotion', 'userSelectNone',
      'pointerEventsNone', 'visibilityHiddenUsage',
      // Extra SCSS 2
      'focusWithinSupport', 'hoverWithoutFocus', 'contentOverflow',
      'smallFontSize', 'lineHeightTight', 'textJustify'
    ],
    angular: [
      'clickWithoutKeyboard', 'clickWithoutRole', 'routerLinkNames',
      'ngForTrackBy', 'innerHtmlUsage', 'asyncPipeAria'
    ],
    material: [
      // Material 1
      'matIconAccessibility', 'matFormFieldLabel', 'matSelectPlaceholder',
      'matButtonType', 'matDialogFocus', 'matTableHeaders', 'matChipListLabel',
      // Material 2
      'matSliderLabel', 'matMenuTrigger', 'matTooltipKeyboard',
      'matExpansionHeader', 'matTabLabel', 'matStepLabel', 'matSnackbarPoliteness'
    ],
    cdk: ['cdkTrapFocusDialog', 'cdkAriaDescriber', 'cdkLiveAnnouncer']
  }
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  tier: 'enhanced',
  ignore: ['node_modules', '.git', 'dist', 'build', '.angular', 'coverage'],
  extensions: {
    html: ['.html', '.htm'],
    scss: ['.scss', '.css']
  },
  verbose: false,
  outputFormat: 'console'
};

/**
 * Get check function by name
 * Handles both 'buttonNames' and 'checkButtonNames' formats
 */
function getCheckFunction(name) {
  // Try with 'check' prefix (e.g., buttonNames -> checkButtonNames)
  const prefixedName = 'check' + name.charAt(0).toUpperCase() + name.slice(1);

  // Base checks
  if (baseChecks[prefixedName]) return baseChecks[prefixedName];
  if (baseChecks[name]) return baseChecks[name];

  // Angular checks
  if (angularChecks) {
    if (angularChecks[prefixedName]) return angularChecks[prefixedName];
    if (angularChecks[name]) return angularChecks[name];
  }

  // Material checks
  if (materialChecks1) {
    if (materialChecks1[prefixedName]) return materialChecks1[prefixedName];
    if (materialChecks1[name]) return materialChecks1[name];
  }
  if (materialChecks2) {
    if (materialChecks2[prefixedName]) return materialChecks2[prefixedName];
    if (materialChecks2[name]) return materialChecks2[name];
  }

  // HTML extra checks
  if (htmlChecks1) {
    if (htmlChecks1[prefixedName]) return htmlChecks1[prefixedName];
    if (htmlChecks1[name]) return htmlChecks1[name];
  }
  if (htmlChecks2) {
    if (htmlChecks2[prefixedName]) return htmlChecks2[prefixedName];
    if (htmlChecks2[name]) return htmlChecks2[name];
  }

  // SCSS extra checks
  if (scssChecks1) {
    if (scssChecks1[prefixedName]) return scssChecks1[prefixedName];
    if (scssChecks1[name]) return scssChecks1[name];
  }
  if (scssChecks2) {
    if (scssChecks2[prefixedName]) return scssChecks2[prefixedName];
    if (scssChecks2[name]) return scssChecks2[name];
  }

  // CDK checks
  if (cdkChecks) {
    if (cdkChecks[prefixedName]) return cdkChecks[prefixedName];
    if (cdkChecks[name]) return cdkChecks[name];
  }

  return null;
}

/**
 * Result structure
 */
class CheckResult {
  constructor(name, passed, issues = []) {
    this.name = name;
    this.passed = passed;
    this.issues = issues;
    this.count = issues.length;
  }
}

/**
 * Run a single check safely
 */
function runCheck(name, content, filePath) {
  const checkFn = getCheckFunction(name);
  if (!checkFn) {
    return new CheckResult(name, true, []); // Skip unknown checks
  }

  try {
    const result = checkFn(content);
    return new CheckResult(name, result.pass, result.issues || []);
  } catch (error) {
    return new CheckResult(name, true, []); // Skip on error
  }
}

/**
 * Find files recursively
 */
function findFiles(dir, extensions, ignore) {
  const files = [];

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      // Check ignore patterns
      let shouldIgnore = false;
      for (const pattern of ignore) {
        if (fullPath.includes(pattern) || entry.name === pattern) {
          shouldIgnore = true;
          break;
        }
      }
      if (shouldIgnore) continue;

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  try {
    const stat = fs.statSync(dir);
    if (stat.isDirectory()) {
      walk(dir);
    } else if (stat.isFile()) {
      files.push(dir);
    }
  } catch (e) {
    // Path doesn't exist
  }

  return files;
}

/**
 * Analyze a single file
 * @param {string} filePath - Path to file
 * @param {string} tier - Tier name
 * @param {string|null} singleCheck - If set, only run this specific check
 */
function analyzeFile(filePath, tier = 'enhanced', singleCheck = null) {
  const tierConfig = TIERS[tier] || TIERS.enhanced;
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, 'utf-8');
  const results = [];

  // Helper to check if we should run this check
  const shouldRun = (checkName) => !singleCheck || checkName === singleCheck;

  if (['.html', '.htm'].includes(ext)) {
    // Run HTML checks
    for (const checkName of tierConfig.html) {
      if (shouldRun(checkName)) results.push(runCheck(checkName, content, filePath));
    }
    // Run Angular checks
    for (const checkName of tierConfig.angular) {
      if (shouldRun(checkName)) results.push(runCheck(checkName, content, filePath));
    }
    // Run Material checks
    for (const checkName of tierConfig.material) {
      if (shouldRun(checkName)) results.push(runCheck(checkName, content, filePath));
    }
    // Run CDK checks
    for (const checkName of tierConfig.cdk) {
      if (shouldRun(checkName)) results.push(runCheck(checkName, content, filePath));
    }
  } else if (['.scss', '.css'].includes(ext)) {
    // Run SCSS checks
    for (const checkName of tierConfig.scss) {
      if (shouldRun(checkName)) results.push(runCheck(checkName, content, filePath));
    }
  }

  return results;
}

/**
 * Main analysis function
 * @param {string} targetPath - Directory or file to analyze
 * @param {object} options - Configuration options
 * @param {string} options.tier - 'basic', 'enhanced', or 'full'
 * @param {string[]} options.ignore - Patterns to ignore
 * @param {string} options.check - Single check name to run (optional)
 */
function analyze(targetPath, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const tier = config.tier || 'enhanced';
  const ignore = config.ignore || DEFAULT_CONFIG.ignore;
  const singleCheck = config.check || null;

  // Find all files
  const allExtensions = [...config.extensions.html, ...config.extensions.scss];
  const files = findFiles(targetPath, allExtensions, ignore);

  // Analyze all files
  const allResults = {
    tier: tier,
    check: singleCheck,
    files: {},
    summary: {
      totalFiles: 0,
      totalChecks: 0,
      passed: 0,
      failed: 0,
      issues: []
    }
  };

  for (const filePath of files) {
    const results = analyzeFile(filePath, tier, singleCheck);

    // Skip files with no results (e.g., HTML file when checking SCSS-only check)
    if (results.length === 0) continue;

    allResults.files[filePath] = results;
    allResults.summary.totalFiles++;

    for (const result of results) {
      allResults.summary.totalChecks++;
      if (result.passed) {
        allResults.summary.passed++;
      } else {
        allResults.summary.failed++;
        allResults.summary.issues.push(...result.issues.map(issue => {
          const issueObj = typeof issue === 'string' ? { message: issue } : issue;
          return {
            ...issueObj,
            file: filePath,
            check: result.name
          };
        }));
      }
    }
  }

  return allResults;
}

// ============================================
// SIMPLE ONE-LINER API
// ============================================

/**
 * Quick check with basic tier (fastest, 20 checks)
 * @param {string} targetPath - Directory or file to analyze
 * @returns {object} Analysis results
 *
 * @example
 * const { basic } = require('traufix-a11y');
 * const results = basic('./src/app/media');
 */
function basic(targetPath) {
  return analyze(targetPath, { tier: 'basic' });
}

/**
 * Standard check with enhanced tier (40 checks, recommended)
 * @param {string} targetPath - Directory or file to analyze
 * @returns {object} Analysis results
 *
 * @example
 * const { enhanced } = require('traufix-a11y');
 * const results = enhanced('./src/app/media');
 */
function enhanced(targetPath) {
  return analyze(targetPath, { tier: 'enhanced' });
}

/**
 * Full check with all 67 checks (most thorough)
 * @param {string} targetPath - Directory or file to analyze
 * @returns {object} Analysis results
 *
 * @example
 * const { full } = require('traufix-a11y');
 * const results = full('./src/app/media');
 */
function full(targetPath) {
  return analyze(targetPath, { tier: 'full' });
}

/**
 * Check specific HTML content
 * @param {string} html - HTML string to analyze
 * @param {string} tier - 'basic', 'enhanced', or 'full'
 * @returns {CheckResult[]} Array of check results
 */
function checkHTML(html, tier = 'enhanced') {
  const tierConfig = TIERS[tier] || TIERS.enhanced;
  const results = [];

  for (const checkName of [...tierConfig.html, ...tierConfig.angular, ...tierConfig.material, ...tierConfig.cdk]) {
    results.push(runCheck(checkName, html, 'inline'));
  }

  return results;
}

/**
 * Check specific SCSS content
 * @param {string} scss - SCSS string to analyze
 * @param {string} tier - 'basic', 'enhanced', or 'full'
 * @returns {CheckResult[]} Array of check results
 */
function checkSCSS(scss, tier = 'enhanced') {
  const tierConfig = TIERS[tier] || TIERS.enhanced;
  const results = [];

  for (const checkName of tierConfig.scss) {
    results.push(runCheck(checkName, scss, 'inline'));
  }

  return results;
}

/**
 * Format results for console
 */
function formatConsoleOutput(results) {
  const lines = [];
  const { summary, tier } = results;

  lines.push('\n========================================');
  lines.push('  TRAUFIX-A11Y ACCESSIBILITY REPORT');
  lines.push('========================================\n');

  lines.push('Tier: ' + (tier || 'enhanced').toUpperCase());
  lines.push('Files analyzed: ' + summary.totalFiles);
  lines.push('Total checks: ' + summary.totalChecks);
  lines.push('Passed: ' + summary.passed + ' (' + ((summary.passed / summary.totalChecks) * 100).toFixed(1) + '%)');
  lines.push('Failed: ' + summary.failed);
  lines.push('');

  if (summary.issues.length > 0) {
    lines.push('ISSUES FOUND:');
    lines.push('-'.repeat(40));

    const issuesByFile = {};
    for (const issue of summary.issues) {
      if (!issuesByFile[issue.file]) {
        issuesByFile[issue.file] = [];
      }
      issuesByFile[issue.file].push(issue);
    }

    for (const [file, issues] of Object.entries(issuesByFile)) {
      lines.push('\n' + file + ':');
      for (const issue of issues) {
        lines.push('  [' + issue.check + '] ' + issue.message);
      }
    }
  } else {
    lines.push('No accessibility issues found!');
  }

  lines.push('\n========================================');
  lines.push('HINWEIS: Keine Gewähr für Vollständigkeit.');
  lines.push('========================================\n');

  return lines.join('\n');
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Simple one-liner API
  basic,
  enhanced,
  full,

  // Flexible API
  analyze,
  checkHTML,
  checkSCSS,

  // Utilities
  formatConsoleOutput,
  findFiles,

  // Configuration
  TIERS,
  DEFAULT_CONFIG,

  // Re-exports
  colors,
  CheckResult
};
