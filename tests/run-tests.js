#!/usr/bin/env node

/**
 * Test Runner for traufix-a11y
 *
 * Uses the new verifier module to run verification on all checks.
 * Each check has its own verify file (verify.html or verify.scss)
 * with @a11y-pass and @a11y-fail sections.
 *
 * A verified check correctly:
 * - Passes (no issues) on the @a11y-pass section
 * - Fails (finds issues) on the @a11y-fail section
 */

const { verifyByTier, getVerifySummary, formatVerifyResults } = require('../src/core/verifier');

// ANSI colors
const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

function runTests() {
  console.log('\n' + c.bold + '========================================' + c.reset);
  console.log(c.bold + '  TRAUFIX-A11Y VERIFICATION' + c.reset);
  console.log(c.bold + '========================================' + c.reset + '\n');
  console.log(c.dim + 'Running verification on all checks using the new modular system.' + c.reset);
  console.log(c.dim + 'Each check is tested against its verify.html or verify.scss file.' + c.reset + '\n');

  // Run verification on full tier (all checks)
  console.log(c.cyan + 'Verifying FULL tier (67 checks)...' + c.reset + '\n');

  const results = verifyByTier('full');
  const summary = getVerifySummary(results);

  // Output formatted results
  console.log(formatVerifyResults(results, { verbose: true }));

  // Additional summary with colors
  console.log('');
  console.log(c.bold + '========================================' + c.reset);
  console.log(c.bold + '  FINAL SUMMARY' + c.reset);
  console.log(c.bold + '========================================' + c.reset);
  console.log('');
  console.log('  ' + c.green + 'Verified: ' + summary.verified + c.reset);
  console.log('  ' + c.red + 'Failed:   ' + summary.failed + c.reset);
  console.log('  ' + c.yellow + 'Skipped:  ' + summary.skipped + c.reset);
  console.log('');

  const total = summary.verified + summary.failed;
  const passRate = total > 0 ? ((summary.verified / total) * 100).toFixed(1) : 0;

  if (summary.failed === 0 && summary.verified > 0) {
    console.log(c.green + c.bold + '  All checks are working correctly!' + c.reset);
  } else if (summary.failed > 0) {
    console.log(c.red + 'Some checks failed verification.' + c.reset);
    console.log(c.dim + 'Failed checks need investigation - see details above.' + c.reset);
  }

  console.log('\n' + c.dim + 'Pass rate: ' + passRate + '% (' + summary.verified + '/' + total + ')' + c.reset + '\n');

  // Exit with error if any tests failed
  process.exit(summary.failed > 0 ? 1 : 0);
}

runTests();
