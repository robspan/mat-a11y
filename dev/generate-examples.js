#!/usr/bin/env node
/**
 * Generate all formatter outputs for example-outputs folder
 * Uses component-based analysis (same as CLI default)
 *
 * Also generates the GUI demo from the real GUI files (single source of truth).
 *
 * Usage: node dev/generate-examples.js <path-to-angular-project>
 */
const fs = require('fs');
const path = require('path');
const { analyzeByComponent } = require('../src/core/componentAnalyzer.js');
const { loadAllFormatters } = require('../src/formatters/index.js');
const { optimizeIssues, getOptimizationSummary } = require('../src/core/issueOptimizer.js');
const { DEFAULT_CONFIG } = require('../src/index.js');
const { enhanceResults } = require('../gui/server.js');

const targetPath = process.argv[2] || '.';
const outputDir = path.join(__dirname, '..', 'example-outputs');
const guiSrcDir = path.join(__dirname, '..', 'gui', 'public');
const guiDemoDir = path.join(outputDir, 'gui');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Component-based analysis of:', targetPath);
console.log('Output to:', outputDir);
console.log('');

// Remove old _report-* files to avoid stale duplicates
const existing = fs.readdirSync(outputDir).filter(n => n.startsWith('_report-'));
for (const f of existing) {
  try { fs.unlinkSync(path.join(outputDir, f)); } catch (e) { /* ignore */ }
}

// Run component analysis (same as CLI default - use same ignore patterns)
let results;
try {
  results = analyzeByComponent(targetPath, { tier: 'full', ignore: DEFAULT_CONFIG.ignore });
} catch (e) {
  console.error('Analysis failed:', e && e.message ? e.message : e);
  process.exit(1);
}

if (results.error) {
  console.error(results.error);
  process.exit(2);
}

console.log(`Analyzed ${results.totalComponentsScanned} components (${results.componentCount} with issues)\n`);

// Optimize issues by collapsing to root cause
const optimizedResults = optimizeIssues(results, targetPath, { enabled: true });
const summary = getOptimizationSummary(optimizedResults);
if (summary) console.log(summary + '\n');

// Enhance results with issueSummary (for severity breakdown)
const enhancedResults = enhanceResults(optimizedResults);

// Load all formatters
const formatters = loadAllFormatters();

// Generate each format
for (const [name, formatter] of formatters) {
  try {
    const output = formatter.format(enhancedResults);
    const ext = formatter.fileExtension || '.txt';
    const filename = `_report-${name}${ext}`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, output);
    console.log(`✓ ${name} → ${filename}`);
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
  }
}

// =============================================================================
// Generate GUI Demo (from real GUI files - single source of truth)
// =============================================================================

console.log('\n--- Generating GUI Demo ---');

if (!fs.existsSync(guiDemoDir)) {
  fs.mkdirSync(guiDemoDir, { recursive: true });
}

// 1. Copy styles.css directly (identical)
const stylesSrc = path.join(guiSrcDir, 'styles.css');
const stylesDest = path.join(guiDemoDir, 'styles.css');
fs.copyFileSync(stylesSrc, stylesDest);
console.log('✓ styles.css (copied)');

// 2. Transform index.html for demo mode
const htmlSrc = fs.readFileSync(path.join(guiSrcDir, 'index.html'), 'utf8');
const demoHtml = transformHtmlForDemo(htmlSrc, enhancedResults);
fs.writeFileSync(path.join(guiDemoDir, 'index.html'), demoHtml);
console.log('✓ index.html (transformed for demo)');

// 3. Generate demo app.js
const demoAppJs = generateDemoAppJs(enhancedResults);
fs.writeFileSync(path.join(guiDemoDir, 'app.js'), demoAppJs);
console.log('✓ app.js (generated for demo)');

console.log('\nDone!');

// =============================================================================
// Demo Generation Helpers
// =============================================================================

function transformHtmlForDemo(html, results) {
  // Add demo banner after <body>
  const demoBanner = `
  <div class="demo-banner" role="alert">
    <p>
      <span class="demo-badge">DEMO</span>
      This is a static preview. To scan your own project: <a href="https://www.npmjs.com/package/mat-a11y">npx mat-a11y</a>
    </p>
  </div>
  <style>
    .demo-banner { background: linear-gradient(135deg, #1a56db 0%, #7c3aed 100%); color: white; padding: 0.75rem 1.5rem; text-align: center; }
    .demo-banner p { margin: 0; font-size: 0.9rem; }
    .demo-banner a { color: white; font-weight: 600; text-decoration: underline; }
    .demo-banner a:hover { text-decoration: none; }
    .demo-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; margin-right: 0.5rem; }
  </style>`;

  let result = html;

  // Insert demo banner after <body>
  result = result.replace('<body>', '<body>' + demoBanner);

  // Update title
  result = result.replace(
    '<title>mat-a11y - Accessibility Dashboard</title>',
    '<title>mat-a11y - Accessibility Dashboard (Demo)</title>'
  );

  // Update meta description
  result = result.replace(
    'content="mat-a11y Accessibility Dashboard - Check your Angular application for accessibility issues"',
    'content="mat-a11y Accessibility Dashboard Demo - Preview the GUI interface"'
  );

  // Change button text
  result = result.replace('Start Accessibility Check', 'Run Demo Scan');
  result = result.replace('New Scan', 'Run Again');

  // Make path input show demo info
  result = result.replace(
    'placeholder="Current directory"',
    'value="demo-project" readonly'
  );
  result = result.replace(
    '<span class="path-current" id="current-path-display"></span>',
    '<span class="path-current" id="current-path-display">Demo: Real results from a production Angular app</span>'
  );

  // Update path hint
  result = result.replace(
    'Enter the path to your Angular project, or leave empty to scan the current directory',
    'This demo shows real scan results from a production Angular application'
  );

  return result;
}

function generateDemoAppJs(results) {
  // NEW APPROACH: Copy real app.js and inject demo results
  // This keeps the demo in sync with the real GUI automatically

  // Build the demo results object (use totalIssues from optimized results)
  const demoResults = {
    totalIssues: results.totalIssues || 0,
    componentCount: results.componentCount || 0,
    totalComponentsScanned: results.totalComponentsScanned || 0,
    components: results.components || [],
    audits: results.audits || [],
    auditScore: results.auditScore || null,
    issueSummary: results.issueSummary || []
  };

  // Read the real app.js
  const realAppJs = fs.readFileSync(path.join(guiSrcDir, 'app.js'), 'utf8');

  // Inject demo results at the placeholder
  // The placeholder in app.js is:
  //   // BUILD_INJECT_DEMO_RESULTS_START
  //   const DEMO_RESULTS = null;
  //   // BUILD_INJECT_DEMO_RESULTS_END
  const demoAppJs = realAppJs.replace(
    /\/\/ BUILD_INJECT_DEMO_RESULTS_START\s*\n\s*const DEMO_RESULTS = null;\s*\n\s*\/\/ BUILD_INJECT_DEMO_RESULTS_END/,
    `// BUILD_INJECT_DEMO_RESULTS_START
  const DEMO_RESULTS = ${JSON.stringify(demoResults)};
  // BUILD_INJECT_DEMO_RESULTS_END`
  );

  return demoAppJs;
}

