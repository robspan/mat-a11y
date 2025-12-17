#!/usr/bin/env node

/**
 * GUI Accessibility Test
 *
 * Runs the mat-a11y accessibility checker against its own GUI files.
 * Ensures we ship a 100% accessible example GUI.
 *
 * This test:
 * - Runs the CLI in headless file-based mode against gui/public
 * - Fails if any Error-level issues are found
 * - Allows Warning and Info level issues (acceptable for WCAG compliance)
 *
 * Part of the pre-commit hook to ensure only accessible GUI is shipped.
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');

const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  bold: '\x1b[1m'
};

const rootDir = path.resolve(__dirname, '..', '..');
const guiDir = path.join(rootDir, 'gui', 'public');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ${c.green}✓${c.reset} ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ${c.red}✗${c.reset} ${name}`);
    console.log(`    ${c.dim}${e.message}${c.reset}`);
  }
}

console.log('');
console.log(c.bold + 'GUI Accessibility Tests' + c.reset);
console.log('');

// Run the accessibility checker against the GUI
test('GUI has no Error-level accessibility issues', () => {
  let output;
  try {
    // Run the CLI - it may exit with code 1 even for warnings
    output = execSync(
      `node bin/cli.js --headless --file-based "${guiDir}"`,
      { cwd: rootDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch (e) {
    // CLI exits with 1 when issues are found, even warnings
    output = (e.stdout || '') + (e.stderr || '');
  }

  // Check for audit score
  const auditMatch = output.match(/AUDIT SCORE:\s*(\d+)%/);
  if (!auditMatch) {
    throw new Error('Could not parse audit score from output');
  }

  const auditScore = parseInt(auditMatch[1], 10);
  if (auditScore < 100) {
    throw new Error(`Audit score is ${auditScore}%, expected 100%`);
  }
});

test('GUI has at least 99% element coverage', () => {
  let output;
  try {
    output = execSync(
      `node bin/cli.js --headless --file-based "${guiDir}"`,
      { cwd: rootDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch (e) {
    output = (e.stdout || '') + (e.stderr || '');
  }

  // Check for element coverage
  const coverageMatch = output.match(/ELEMENT COVERAGE:\s*([\d.]+)%/);
  if (!coverageMatch) {
    throw new Error('Could not parse element coverage from output');
  }

  const coverage = parseFloat(coverageMatch[1]);
  if (coverage < 99) {
    throw new Error(`Element coverage is ${coverage}%, expected at least 99%`);
  }
});

test('GUI has no [Error] level issues', () => {
  let output;
  try {
    output = execSync(
      `node bin/cli.js --headless --file-based "${guiDir}"`,
      { cwd: rootDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch (e) {
    output = (e.stdout || '') + (e.stderr || '');
  }

  // Count error-level issues
  const errorMatches = output.match(/\[Error\]/g);
  if (errorMatches && errorMatches.length > 0) {
    throw new Error(`Found ${errorMatches.length} Error-level issues. Run 'node bin/cli.js --headless --file-based gui/public' to see details.`);
  }
});

// Summary
console.log('');
if (failed > 0) {
  console.log(c.red + c.bold + `✗ ${failed}/${passed + failed} tests failed` + c.reset);
  console.log('');
  console.log(c.dim + 'Run: node bin/cli.js --headless --file-based gui/public' + c.reset);
  console.log(c.dim + 'to see full accessibility report' + c.reset);
  process.exit(1);
} else {
  console.log(c.green + c.bold + `✓ All ${passed} tests passed` + c.reset);
  process.exit(0);
}
