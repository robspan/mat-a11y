#!/usr/bin/env node

/**
 * Parallel vs Sync Comparison Test
 *
 * Verifies that parallel mode produces identical results to sync mode
 * and measures performance difference.
 */

const { analyze } = require('../src');
const path = require('path');

const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

async function runTest(targetPath, label, isFirstRun = false) {
  console.log('\n' + c.cyan + 'Testing: ' + label + c.reset);
  console.log(c.dim + 'Path: ' + targetPath + c.reset + '\n');

  // Warmup run (first test only) - JIT and module loading
  if (isFirstRun) {
    console.log(c.dim + '  (warmup run...)' + c.reset);
    analyze(targetPath, { tier: 'full', workers: 'sync' });
  }

  // Run sync (explicit sync mode)
  const syncStart = Date.now();
  const syncResult = analyze(targetPath, { tier: 'full', workers: 'sync' });
  const syncTime = Date.now() - syncStart;

  // Run auto (default parallel mode)
  const parallelStart = Date.now();
  const parallelResult = await analyze(targetPath, { tier: 'full', workers: 'auto' });
  const parallelTime = Date.now() - parallelStart;

  // Compare results
  const fileMatch = syncResult.summary.totalFiles === parallelResult.summary.totalFiles;
  const issueMatch = syncResult.summary.issues.length === parallelResult.summary.issues.length;
  const scoreMatch = syncResult.summary.auditScore === parallelResult.summary.auditScore;
  const passed = fileMatch && issueMatch && scoreMatch;

  // Output
  console.log('  Sync:  ' + syncTime + 'ms | ' + syncResult.summary.totalFiles + ' files | ' + syncResult.summary.issues.length + ' issues | ' + syncResult.summary.auditScore + '%');
  console.log('  Auto:  ' + parallelTime + 'ms | ' + parallelResult.summary.totalFiles + ' files | ' + parallelResult.summary.issues.length + ' issues | ' + parallelResult.summary.auditScore + '%');

  const speedup = (syncTime / parallelTime).toFixed(2);
  if (parallelTime < syncTime) {
    console.log('  ' + c.green + '↑ ' + speedup + 'x faster' + c.reset);
  } else {
    console.log('  ' + c.yellow + '↓ ' + speedup + 'x slower' + c.reset);
  }

  if (passed) {
    console.log('  ' + c.green + '✓ Results match' + c.reset);
  } else {
    console.log('  ' + c.red + '✗ Results mismatch' + c.reset);
    if (!fileMatch) console.log('    - File count: ' + syncResult.summary.totalFiles + ' vs ' + parallelResult.summary.totalFiles);
    if (!issueMatch) console.log('    - Issue count: ' + syncResult.summary.issues.length + ' vs ' + parallelResult.summary.issues.length);
    if (!scoreMatch) console.log('    - Score: ' + syncResult.summary.auditScore + ' vs ' + parallelResult.summary.auditScore);
  }

  return passed;
}

async function main() {
  console.log(c.bold + '========================================' + c.reset);
  console.log(c.bold + '  PARALLEL VS SYNC COMPARISON' + c.reset);
  console.log(c.bold + '========================================' + c.reset);

  const results = [];

  // Test 1: Small codebase (src folder)
  const smallPath = path.join(__dirname, '..', 'src');
  results.push(await runTest(smallPath, 'Small codebase (mat-a11y src)', true));

  // Test 2: Large codebase (noro-wedding) if available
  const largePath = 'C:/Users/spani/OneDrive/Dokumente/GitHub/noro-wedding/src';
  const fs = require('fs');
  if (fs.existsSync(largePath)) {
    results.push(await runTest(largePath, 'Large codebase (noro-wedding)'));
  }

  // Final result
  const allPassed = results.every(r => r);
  console.log('\n' + c.bold + '========================================' + c.reset);
  if (allPassed) {
    console.log(c.green + c.bold + '  ALL TESTS PASSED' + c.reset);
  } else {
    console.log(c.red + c.bold + '  SOME TESTS FAILED' + c.reset);
  }
  console.log(c.bold + '========================================' + c.reset + '\n');

  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error(c.red + 'Test error: ' + err.message + c.reset);
  process.exit(1);
});
