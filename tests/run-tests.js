#!/usr/bin/env node

/**
 * Test Runner for traufix-a11y
 *
 * Runs each test file against its specific check.
 * All tests are EXPECTED TO FAIL (find issues).
 * A passing test means the check correctly identified the problem.
 */

const fs = require('fs');
const path = require('path');
const { analyze, TIERS } = require('../src/index.js');

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

// Test configurations: filename -> check name
// Note: filename (without extension) equals check name
const testDirs = ['html', 'angular', 'material', 'scss'];

function getAllChecks() {
  const allChecks = new Set();
  for (const tier of Object.values(TIERS)) {
    [...tier.html, ...tier.scss, ...tier.angular, ...tier.material, ...tier.cdk].forEach(c => allChecks.add(c));
  }
  return allChecks;
}

function runTests() {
  const testsDir = __dirname;
  const results = { passed: 0, failed: 0, skipped: 0, details: [] };
  const allChecks = getAllChecks();

  console.log('\n' + c.bold + '========================================' + c.reset);
  console.log(c.bold + '  TRAUFIX-A11Y TEST RUNNER' + c.reset);
  console.log(c.bold + '========================================' + c.reset + '\n');
  console.log(c.dim + 'Tests verify that checks correctly identify accessibility issues.' + c.reset);
  console.log(c.dim + 'Each test file contains intentionally bad code.' + c.reset);
  console.log(c.dim + 'A check "PASS" means it found the issue (expected).' + c.reset + '\n');

  for (const dir of testDirs) {
    const dirPath = path.join(testsDir, dir);
    if (!fs.existsSync(dirPath)) continue;

    console.log(c.cyan + c.bold + dir.toUpperCase() + ' CHECKS:' + c.reset);

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.html') || f.endsWith('.scss'));

    for (const file of files) {
      const checkName = path.basename(file, path.extname(file));
      const filePath = path.join(dirPath, file);

      // Check if this check exists
      if (!allChecks.has(checkName)) {
        console.log('  ' + c.yellow + '⊘ SKIP' + c.reset + ' ' + checkName + c.dim + ' (check not found)' + c.reset);
        results.skipped++;
        results.details.push({ check: checkName, status: 'skipped', reason: 'Check function not found' });
        continue;
      }

      // Run analysis with single check mode on full tier (to include all checks)
      const result = analyze(filePath, { tier: 'full', check: checkName });

      // We expect the check to FAIL (find issues)
      const foundIssues = result.summary.failed > 0;

      if (foundIssues) {
        console.log('  ' + c.green + '✓ PASS' + c.reset + ' ' + checkName + c.dim + ' (found ' + result.summary.issues.length + ' issues)' + c.reset);
        results.passed++;
        results.details.push({ check: checkName, status: 'passed', issues: result.summary.issues.length });
      } else {
        console.log('  ' + c.red + '✗ FAIL' + c.reset + ' ' + checkName + c.dim + ' (no issues found - check may be broken)' + c.reset);
        results.failed++;
        results.details.push({ check: checkName, status: 'failed', reason: 'Check did not find any issues' });
      }
    }

    console.log('');
  }

  // Summary
  console.log(c.bold + '========================================' + c.reset);
  console.log(c.bold + '  SUMMARY' + c.reset);
  console.log(c.bold + '========================================' + c.reset);
  console.log('');
  console.log('  ' + c.green + 'Passed:  ' + results.passed + c.reset);
  console.log('  ' + c.red + 'Failed:  ' + results.failed + c.reset);
  console.log('  ' + c.yellow + 'Skipped: ' + results.skipped + c.reset);
  console.log('');

  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

  if (results.failed === 0 && results.passed > 0) {
    console.log(c.green + c.bold + '  All checks are working correctly!' + c.reset);
  } else if (results.failed > 0) {
    console.log(c.red + 'Some checks may not be detecting issues correctly.' + c.reset);
    console.log(c.dim + 'Failed checks need investigation.' + c.reset);
  }

  console.log('\n' + c.dim + 'Pass rate: ' + passRate + '% (' + results.passed + '/' + total + ')' + c.reset + '\n');

  // Exit with error if any tests failed
  process.exit(results.failed > 0 ? 1 : 0);
}

runTests();
