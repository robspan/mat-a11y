'use strict';

/**
 * Tests for Issue Optimizer
 * 
 * Verifies that the issueOptimizer module correctly:
 * - Groups issues by check+message pattern
 * - Collapses duplicate SCSS issues to root cause
 * - Preserves non-SCSS and unique issues
 * - Handles edge cases gracefully
 */

const fs = require('fs');
const path = require('path');
const { optimizeIssues, formatImpactAnnotation, getOptimizationSummary } = require('../../src/core/issueOptimizer');

// Colors
const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Test fixture directory
const FIXTURE_DIR = path.join(__dirname, 'verify-files', 'optimizer-fixtures');

// Setup test fixtures
function setupFixtures() {
  // Create fixture directory
  if (!fs.existsSync(FIXTURE_DIR)) {
    fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  }

  // Create shared animations file
  fs.writeFileSync(path.join(FIXTURE_DIR, '_animations.scss'), `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
`);

  // Create components that import the shared file
  for (let i = 1; i <= 5; i++) {
    fs.writeFileSync(path.join(FIXTURE_DIR, `component-${i}.scss`), `
@import 'animations';

.component-${i} {
  animation: fadeIn 0.${i}s;
}
`);
  }

  // Create an HTML file (should not be collapsed)
  fs.writeFileSync(path.join(FIXTURE_DIR, 'component.html'), `
<button>Click me</button>
`);
}

// Cleanup fixtures
function cleanupFixtures() {
  if (fs.existsSync(FIXTURE_DIR)) {
    const files = fs.readdirSync(FIXTURE_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(FIXTURE_DIR, file));
    }
    fs.rmdirSync(FIXTURE_DIR);
  }
}

// Sample results generators
function createEntityResults() {
  const entities = [];
  
  // Create 5 components with the same SCSS issue
  for (let i = 1; i <= 5; i++) {
    entities.push({
      name: `Component${i}`,
      selector: `app-component-${i}`,
      issues: [
        {
          message: '[Warning] Add prefers-reduced-motion media query for animations',
          file: path.join(FIXTURE_DIR, `component-${i}.scss`),
          check: 'reducedMotion'
        }
      ]
    });
  }

  // Add a component with a unique HTML issue
  entities.push({
    name: 'ButtonComponent',
    selector: 'app-button',
    issues: [
      {
        message: '[Error] Button missing accessible name',
        file: path.join(FIXTURE_DIR, 'component.html'),
        check: 'buttonNames'
      }
    ]
  });

  return {
    tier: 'full',
    total: 6,
    distribution: { passing: 0, failing: 6 },
    entities,
    issues: []
  };
}

function createFlatResults() {
  const issues = [];
  
  // 5 identical SCSS issues from different files
  for (let i = 1; i <= 5; i++) {
    issues.push({
      message: '[Warning] Add prefers-reduced-motion media query for animations',
      file: path.join(FIXTURE_DIR, `component-${i}.scss`),
      check: 'reducedMotion'
    });
  }

  // 1 HTML issue
  issues.push({
    message: '[Error] Button missing accessible name',
    file: path.join(FIXTURE_DIR, 'component.html'),
    check: 'buttonNames'
  });

  return {
    tier: 'full',
    total: 6,
    distribution: { passing: 0, failing: 6 },
    issues
  };
}

// Test runner
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(c.green + '  ✓ ' + c.reset + name);
    passed++;
  } catch (err) {
    console.log(c.red + '  ✗ ' + c.reset + name);
    console.log(c.red + '    ' + err.message + c.reset);
    failed++;
  }
}

function assertEqual(actual, expected, msg = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, msg = '') {
  if (!condition) {
    throw new Error(msg || 'Expected true but got false');
  }
}

// Run tests
function runTests() {
  console.log(c.bold + '\nIssue Optimizer Tests\n' + c.reset);

  // Setup
  setupFixtures();

  try {
    // Test 1: Disabled optimization returns unchanged results
    test('disabled optimization returns unchanged results', () => {
      const results = createEntityResults();
      const optimized = optimizeIssues(results, FIXTURE_DIR, { enabled: false });
      assertTrue(!optimized.optimization, 'Should not have optimization info');
    });

    // Test 2: Optimization adds metadata
    test('optimization adds metadata to results', () => {
      const results = createEntityResults();
      const optimized = optimizeIssues(results, FIXTURE_DIR, { enabled: true });
      assertTrue(optimized.optimization !== undefined, 'Should have optimization info');
      assertTrue(optimized.optimization.enabled === true, 'Should be marked as enabled');
    });

    // Test 3: Collapses entity-based issues
    test('collapses duplicate SCSS issues in entity results', () => {
      const results = createEntityResults();
      const optimized = optimizeIssues(results, FIXTURE_DIR, { enabled: true });
      
      // Count total issues after optimization
      let totalIssues = 0;
      for (const entity of optimized.entities) {
        totalIssues += entity.issues.length;
      }
      
      // Should have collapsed 5 SCSS issues into fewer + 1 HTML issue
      assertTrue(totalIssues < 6, `Should have fewer issues after collapse (got ${totalIssues})`);
    });

    // Test 4: Preserves HTML issues
    test('preserves non-SCSS issues', () => {
      const results = createEntityResults();
      const optimized = optimizeIssues(results, FIXTURE_DIR, { enabled: true });
      
      // Find HTML issues
      let htmlIssues = 0;
      for (const entity of optimized.entities) {
        for (const issue of entity.issues) {
          if (issue.check === 'buttonNames') {
            htmlIssues++;
          }
        }
      }
      
      assertEqual(htmlIssues, 1, 'Should preserve the 1 HTML issue');
    });

    // Test 5: Root cause issues are marked
    test('root cause issues have isRootCause flag', () => {
      const results = createEntityResults();
      const optimized = optimizeIssues(results, FIXTURE_DIR, { enabled: true });
      
      let rootCauseIssues = 0;
      for (const entity of optimized.entities) {
        for (const issue of entity.issues) {
          if (issue.isRootCause) {
            rootCauseIssues++;
          }
        }
      }
      
      assertTrue(rootCauseIssues > 0, 'Should have at least one root cause issue');
    });

    // Test 6: Impact count is set
    test('root cause issues have impactCount', () => {
      const results = createEntityResults();
      const optimized = optimizeIssues(results, FIXTURE_DIR, { enabled: true });
      
      for (const entity of optimized.entities) {
        for (const issue of entity.issues) {
          if (issue.isRootCause) {
            assertTrue(issue.impactCount >= 2, 'Impact count should be >= 2');
          }
        }
      }
    });

    // Test 7: Optimization summary
    test('getOptimizationSummary returns meaningful summary', () => {
      const results = createEntityResults();
      const optimized = optimizeIssues(results, FIXTURE_DIR, { enabled: true });
      const summary = getOptimizationSummary(optimized);
      
      assertTrue(summary.length > 0, 'Summary should not be empty');
      assertTrue(summary.includes('→'), 'Summary should show before → after');
    });

    // Test 8: formatImpactAnnotation
    test('formatImpactAnnotation formats correctly', () => {
      const issue = { isRootCause: true, impactCount: 5 };
      const annotation = formatImpactAnnotation(issue);
      assertTrue(annotation.includes('5 files'), 'Should mention file count');
    });

    // Test 9: Non-root cause has no annotation
    test('non-root cause issues have empty annotation', () => {
      const issue = { isRootCause: false };
      const annotation = formatImpactAnnotation(issue);
      assertEqual(annotation, '', 'Should return empty string');
    });

    // Test 10: minGroupSize option
    test('minGroupSize controls collapse threshold', () => {
      const results = createEntityResults();
      
      // With minGroupSize=10, should not collapse (only 5 duplicates)
      const optimized = optimizeIssues(results, FIXTURE_DIR, { 
        enabled: true, 
        minGroupSize: 10 
      });
      
      // Should not have collapsed anything
      let totalIssues = 0;
      for (const entity of optimized.entities) {
        totalIssues += entity.issues.length;
      }
      
      assertEqual(totalIssues, 6, 'Should not collapse with high minGroupSize');
    });

    // Test 11: Handles empty entities
    test('handles results with no entities', () => {
      const results = { tier: 'full', total: 0, entities: [], issues: [] };
      const optimized = optimizeIssues(results, FIXTURE_DIR, { enabled: true });
      assertTrue(Array.isArray(optimized.entities), 'Should return valid entities array');
    });

    // Test 12: Handles flat results
    test('optimizes flat issue results', () => {
      const results = createFlatResults();
      const optimized = optimizeIssues(results, FIXTURE_DIR, { enabled: true });
      
      assertTrue(optimized.optimization !== undefined, 'Should have optimization info');
      assertTrue(optimized.issues.length < 6, 'Should have fewer issues after collapse');
    });

  } finally {
    // Cleanup
    cleanupFixtures();
  }

  // Summary
  console.log('');
  console.log(c.bold + 'Results: ' + c.reset + 
              c.green + passed + ' passed' + c.reset + ', ' +
              (failed > 0 ? c.red : c.green) + failed + ' failed' + c.reset);
  
  return failed === 0;
}

// Run if executed directly
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests };
