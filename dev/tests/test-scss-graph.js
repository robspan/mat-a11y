'use strict';

/**
 * Tests for SCSS Dependency Graph
 * 
 * Verifies that the scssGraph module correctly:
 * - Finds SCSS files in a directory
 * - Parses @import, @use, @forward statements
 * - Builds dependency relationships
 * - Finds common ancestors for multiple files
 */

const fs = require('fs');
const path = require('path');
const { buildGraph, ScssGraph } = require('../../src/core/scssGraph');

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
const FIXTURE_DIR = path.join(__dirname, 'verify-files', 'scss-fixtures');

// Setup test fixtures
function setupFixtures() {
  // Create fixture directory
  if (!fs.existsSync(FIXTURE_DIR)) {
    fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  }

  // Create a shared file that others will import
  fs.writeFileSync(path.join(FIXTURE_DIR, '_variables.scss'), `
// Shared variables
$primary-color: #007bff;
$transition-speed: 0.3s;
`);

  // Create an animations file
  fs.writeFileSync(path.join(FIXTURE_DIR, '_animations.scss'), `
@use 'variables';

// Missing prefers-reduced-motion - this is the issue
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
`);

  // Create component A that imports animations
  fs.writeFileSync(path.join(FIXTURE_DIR, 'component-a.scss'), `
@import 'animations';

.component-a {
  animation: fadeIn 0.5s;
}
`);

  // Create component B that imports animations
  fs.writeFileSync(path.join(FIXTURE_DIR, 'component-b.scss'), `
@import 'animations';

.component-b {
  animation: fadeIn 0.3s;
}
`);

  // Create component C that imports animations
  fs.writeFileSync(path.join(FIXTURE_DIR, 'component-c.scss'), `
@import 'animations';

.component-c {
  animation: fadeIn 0.4s;
}
`);

  // Create independent file (no shared imports)
  fs.writeFileSync(path.join(FIXTURE_DIR, 'independent.scss'), `
.independent {
  color: red;
}
`);

  // Create file with multiple imports
  fs.writeFileSync(path.join(FIXTURE_DIR, 'multi-import.scss'), `
@import 'variables';
@import 'animations';

.multi {
  color: $primary-color;
  animation: fadeIn 0.2s;
}
`);

  // Create CSS file that uses url() import syntax
  fs.writeFileSync(path.join(FIXTURE_DIR, 'base.css'), `
/* Base styles */
body { margin: 0; }
`);

  fs.writeFileSync(path.join(FIXTURE_DIR, 'app.css'), `
@import url('base.css');

.app {
  font-family: sans-serif;
}
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
  console.log(c.bold + '\nSCSS Graph Tests\n' + c.reset);

  // Setup
  setupFixtures();

  try {
    // Test 1: Graph builds without errors
    test('buildGraph creates ScssGraph instance', () => {
      const graph = buildGraph(FIXTURE_DIR);
      assertTrue(graph instanceof ScssGraph, 'Should return ScssGraph instance');
    });

    // Test 2: Finds all SCSS/CSS files
    test('finds all style files in directory', () => {
      const graph = buildGraph(FIXTURE_DIR);
      const stats = graph.getStats();
      // 7 SCSS files + 2 CSS files = 9 total
      assertEqual(stats.fileCount, 9, 'Should find 9 style files (7 SCSS + 2 CSS)');
    });

    // Test 3: Parses @import statements
    test('parses @import statements correctly', () => {
      const graph = buildGraph(FIXTURE_DIR);
      const compAPath = path.join(FIXTURE_DIR, 'component-a.scss');
      const imports = graph.getImports(compAPath);
      assertTrue(imports.length === 1, 'component-a should have 1 import');
      assertTrue(imports[0].includes('_animations.scss'), 'Should import _animations.scss');
    });

    // Test 4: Parses @use statements
    test('parses @use statements correctly', () => {
      const graph = buildGraph(FIXTURE_DIR);
      const animPath = path.join(FIXTURE_DIR, '_animations.scss');
      const imports = graph.getImports(animPath);
      assertTrue(imports.length === 1, '_animations should have 1 import');
      assertTrue(imports[0].includes('_variables.scss'), 'Should use _variables.scss');
    });

    // Test 5: Builds reverse lookup (importedBy)
    test('builds importedBy relationships', () => {
      const graph = buildGraph(FIXTURE_DIR);
      const animPath = path.join(FIXTURE_DIR, '_animations.scss');
      const importedBy = graph.getImportedBy(animPath);
      assertTrue(importedBy.length >= 3, '_animations should be imported by at least 3 files');
    });

    // Test 6: Finds common ancestor for files sharing same import
    test('findCommonAncestor finds shared import', () => {
      const graph = buildGraph(FIXTURE_DIR);
      
      const files = [
        path.join(FIXTURE_DIR, 'component-a.scss'),
        path.join(FIXTURE_DIR, 'component-b.scss'),
        path.join(FIXTURE_DIR, 'component-c.scss')
      ];
      
      const result = graph.findCommonAncestor(files);
      assertTrue(result.rootCause !== null, 'Should find a root cause');
      assertTrue(result.rootCause.includes('_animations'), 'Root cause should be _animations.scss');
      assertEqual(result.impactedFiles.length, 3, 'Should impact 3 files');
    });

    // Test 7: No common ancestor for independent files
    test('findCommonAncestor returns null for independent files', () => {
      const graph = buildGraph(FIXTURE_DIR);
      
      const files = [
        path.join(FIXTURE_DIR, 'component-a.scss'),
        path.join(FIXTURE_DIR, 'independent.scss')
      ];
      
      const result = graph.findCommonAncestor(files);
      // independent.scss has no imports, so no common ancestor
      assertTrue(result.confidence < 1, 'Should have low confidence for mixed files');
    });

    // Test 8: Single file returns itself
    test('findCommonAncestor returns file itself for single file', () => {
      const graph = buildGraph(FIXTURE_DIR);
      
      const files = [path.join(FIXTURE_DIR, 'component-a.scss')];
      const result = graph.findCommonAncestor(files);
      
      assertTrue(result.rootCause !== null, 'Should return the file itself');
      assertEqual(result.confidence, 1, 'Should have full confidence');
    });

    // Test 9: Empty array returns null
    test('findCommonAncestor handles empty array', () => {
      const graph = buildGraph(FIXTURE_DIR);
      const result = graph.findCommonAncestor([]);
      assertTrue(result.rootCause === null, 'Should return null for empty input');
    });

    // Test 10: Gets all descendants (transitive imports)
    test('getAllDescendants returns transitive imports', () => {
      const graph = buildGraph(FIXTURE_DIR);
      const compAPath = path.join(FIXTURE_DIR, 'component-a.scss');
      const descendants = graph.getAllDescendants(compAPath);
      
      // component-a imports _animations which uses _variables
      assertTrue(descendants.length >= 2, 'Should have at least 2 descendants');
      assertTrue(descendants.some(d => d.includes('_animations')), 'Should include _animations');
      assertTrue(descendants.some(d => d.includes('_variables')), 'Should include _variables');
    });

    // Test 11: Handles multiple imports in same file
    test('handles multiple imports in same statement', () => {
      const graph = buildGraph(FIXTURE_DIR);
      const multiPath = path.join(FIXTURE_DIR, 'multi-import.scss');
      const imports = graph.getImports(multiPath);
      
      assertTrue(imports.length >= 2, 'Should have at least 2 imports');
    });

    // Test 12: Handles CSS @import url() syntax
    test('parses CSS @import url() syntax', () => {
      const graph = buildGraph(FIXTURE_DIR);
      const appCssPath = path.join(FIXTURE_DIR, 'app.css');
      const imports = graph.getImports(appCssPath);
      
      assertTrue(imports.length >= 1, 'app.css should have 1 import');
      assertTrue(imports[0].includes('base.css'), 'Should import base.css');
    });

    // Test 13: CSS files are included in the graph
    test('includes CSS files in the graph', () => {
      const graph = buildGraph(FIXTURE_DIR);
      const stats = graph.getStats();
      // Should find both .scss and .css files (7 scss + 2 css = 9)
      assertTrue(stats.fileCount >= 9, `Should find at least 9 style files (got ${stats.fileCount})`);
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
