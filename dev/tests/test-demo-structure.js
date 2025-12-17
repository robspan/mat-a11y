/**
 * Demo Structure Tests
 *
 * Validates that the demo GUI:
 * 1. Exists and has all required files
 * 2. Has valid JavaScript syntax
 * 3. Has demo results injected (not null)
 * 4. Matches the real GUI structure
 * 5. Has demo-specific HTML modifications
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const guiDir = path.join(__dirname, '..', '..', 'gui', 'public');
const demoDir = path.join(__dirname, '..', '..', 'example-outputs', 'gui');

const results = { passed: 0, failed: 0, errors: [] };

function assert(condition, message) {
  if (condition) {
    results.passed++;
  } else {
    results.failed++;
    results.errors.push(message);
  }
}

// =============================================================================
// Test: Required files exist
// =============================================================================

const requiredFiles = ['app.js', 'index.html', 'styles.css'];

for (const file of requiredFiles) {
  const demoPath = path.join(demoDir, file);
  assert(fs.existsSync(demoPath), `Demo ${file} should exist`);
}

// =============================================================================
// Test: Demo app.js has valid JavaScript syntax
// =============================================================================

const demoAppPath = path.join(demoDir, 'app.js');
if (fs.existsSync(demoAppPath)) {
  const result = spawnSync(process.execPath, ['-c', demoAppPath], { encoding: 'utf8' });
  assert(result.status === 0, `Demo app.js should have valid syntax: ${result.stderr || ''}`);
}

// =============================================================================
// Test: Demo app.js has DEMO_RESULTS injected (not null)
// =============================================================================

if (fs.existsSync(demoAppPath)) {
  const demoAppJs = fs.readFileSync(demoAppPath, 'utf8');

  // Check that DEMO_RESULTS is not null
  const hasInjectedResults = /const DEMO_RESULTS = \{/.test(demoAppJs);
  assert(hasInjectedResults, 'Demo app.js should have DEMO_RESULTS injected (not null)');

  // Check that demo results have expected structure
  const hasTotalIssues = /"totalIssues":\d+/.test(demoAppJs);
  assert(hasTotalIssues, 'Demo DEMO_RESULTS should have totalIssues');

  const hasComponentCount = /"componentCount":\d+/.test(demoAppJs);
  assert(hasComponentCount, 'Demo DEMO_RESULTS should have componentCount');

  const hasAuditScore = /"auditScore":/.test(demoAppJs);
  assert(hasAuditScore, 'Demo DEMO_RESULTS should have auditScore');
}

// =============================================================================
// Test: Demo app.js has IS_DEMO detection
// =============================================================================

if (fs.existsSync(demoAppPath)) {
  const demoAppJs = fs.readFileSync(demoAppPath, 'utf8');

  const hasIsDemoConst = /const IS_DEMO = /.test(demoAppJs);
  assert(hasIsDemoConst, 'Demo app.js should have IS_DEMO detection');

  const hasGitHubCheck = /github\.io/.test(demoAppJs);
  assert(hasGitHubCheck, 'Demo app.js should check for github.io in IS_DEMO');
}

// =============================================================================
// Test: Demo matches real GUI structure (line count within delta)
// =============================================================================

const realAppPath = path.join(guiDir, 'app.js');
if (fs.existsSync(realAppPath) && fs.existsSync(demoAppPath)) {
  const realLines = fs.readFileSync(realAppPath, 'utf8').split('\n').length;
  const demoLines = fs.readFileSync(demoAppPath, 'utf8').split('\n').length;

  // Demo should have approximately same line count as real (within 10 lines for JSON injection variance)
  const lineDelta = Math.abs(realLines - demoLines);
  assert(lineDelta <= 10, `Demo app.js line count (${demoLines}) should match real app.js (${realLines}) within 10 lines, got delta of ${lineDelta}`);
}

// =============================================================================
// Test: styles.css is identical to real GUI
// =============================================================================

const realStylesPath = path.join(guiDir, 'styles.css');
const demoStylesPath = path.join(demoDir, 'styles.css');
if (fs.existsSync(realStylesPath) && fs.existsSync(demoStylesPath)) {
  const realStyles = fs.readFileSync(realStylesPath, 'utf8');
  const demoStyles = fs.readFileSync(demoStylesPath, 'utf8');
  assert(realStyles === demoStyles, 'Demo styles.css should be identical to real GUI styles.css');
}

// =============================================================================
// Test: Demo HTML has demo-specific modifications
// =============================================================================

const demoHtmlPath = path.join(demoDir, 'index.html');
if (fs.existsSync(demoHtmlPath)) {
  const demoHtml = fs.readFileSync(demoHtmlPath, 'utf8');

  // Check for demo banner
  const hasDemoBanner = /class="demo-banner"/.test(demoHtml);
  assert(hasDemoBanner, 'Demo index.html should have demo banner');

  // Check for demo badge
  const hasDemoBadge = /class="demo-badge"/.test(demoHtml);
  assert(hasDemoBadge, 'Demo index.html should have demo badge');

  // Check title is updated
  const hasDemoTitle = /\(Demo\)<\/title>/.test(demoHtml);
  assert(hasDemoTitle, 'Demo index.html should have "(Demo)" in title');

  // Check button text is updated
  const hasDemoScanButton = /Run Demo Scan/.test(demoHtml);
  assert(hasDemoScanButton, 'Demo index.html should have "Run Demo Scan" button text');

  // Check npx link
  const hasNpxLink = /npx mat-a11y/.test(demoHtml);
  assert(hasNpxLink, 'Demo index.html should have link to npx mat-a11y');
}

// =============================================================================
// Test: Demo app.js has mode-aware API functions
// =============================================================================

if (fs.existsSync(demoAppPath)) {
  const demoAppJs = fs.readFileSync(demoAppPath, 'utf8');

  // Check for mode-aware scan function
  const hasDemoScanBranch = /if \(IS_DEMO && DEMO_RESULTS\)/.test(demoAppJs);
  assert(hasDemoScanBranch, 'Demo app.js should have mode-aware runScan function');

  // Check for mode-aware export function
  const hasDemoExportBranch = /if \(IS_DEMO\)[\s\S]*?DEMO_FORMAT_FILES/.test(demoAppJs);
  assert(hasDemoExportBranch, 'Demo app.js should have mode-aware exportResults function');
}

// =============================================================================
// Test: DEMO_FORMAT_FILES has all 18 formats
// =============================================================================

if (fs.existsSync(demoAppPath)) {
  const demoAppJs = fs.readFileSync(demoAppPath, 'utf8');

  const expectedFormats = [
    'html', 'pdf', 'ai', 'json', 'csv', 'markdown', 'sarif', 'junit',
    'github-annotations', 'gitlab-codequality', 'checkstyle', 'sonarqube',
    'prometheus', 'grafana-json', 'datadog', 'slack', 'discord', 'teams'
  ];

  for (const format of expectedFormats) {
    const hasFormat = new RegExp(`['"]${format}['"]:\\s*\\{`).test(demoAppJs);
    assert(hasFormat, `Demo app.js DEMO_FORMAT_FILES should include format: ${format}`);
  }
}

// =============================================================================
// Output Results
// =============================================================================

if (results.failed > 0) {
  console.error(`\n✗ Demo Structure: ${results.failed} failed, ${results.passed} passed`);
  for (const err of results.errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
} else {
  console.log(`✓ Demo Structure (${results.passed} assertions)`);
}
