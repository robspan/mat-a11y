#!/usr/bin/env node

// traufix-a11y CLI
// Static accessibility analyzer for Angular/HTML templates.
// KEINE GEWÄHR - Use at your own risk.

const fs = require('fs');
const path = require('path');
const { analyze, formatConsoleOutput, TIERS, DEFAULT_CONFIG } = require('../src/index.js');

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

// Parse args
function parseArgs(args) {
  const options = {
    files: [],
    tier: 'enhanced',
    format: 'console',
    verbose: false,
    help: false,
    version: false,
    output: null,
    ignore: [],
    check: null,  // Single check mode
    listChecks: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--version' || arg === '-v') options.version = true;
    else if (arg === '--verbose' || arg === '-V') options.verbose = true;
    else if (arg === '--basic' || arg === '-b') options.tier = 'basic';
    else if (arg === '--enhanced' || arg === '-e') options.tier = 'enhanced';
    else if (arg === '--full' || arg === '-F') options.tier = 'full';
    else if (arg === '--tier' || arg === '-t') options.tier = args[++i] || 'enhanced';
    else if (arg === '--format' || arg === '-f') options.format = args[++i] || 'console';
    else if (arg === '--output' || arg === '-o') options.output = args[++i];
    else if (arg === '--ignore' || arg === '-i') options.ignore.push(args[++i]);
    else if (arg === '--check' || arg === '-c') options.check = args[++i];
    else if (arg === '--list-checks' || arg === '-l') options.listChecks = true;
    else if (!arg.startsWith('-')) options.files.push(arg);
  }

  return options;
}

// Help
function showHelp() {
  const basicCount = TIERS.basic.html.length + TIERS.basic.scss.length;
  const enhancedCount = TIERS.enhanced.html.length + TIERS.enhanced.scss.length +
                        TIERS.enhanced.angular.length + TIERS.enhanced.material.length;
  const fullCount = TIERS.full.html.length + TIERS.full.scss.length +
                    TIERS.full.angular.length + TIERS.full.material.length + TIERS.full.cdk.length;

  console.log(`
${c.bold}traufix-a11y${c.reset} - Static Accessibility Analyzer for Angular

${c.cyan}USAGE:${c.reset}
  traufix-a11y [options] <directory|file>

${c.cyan}TIERS:${c.reset}
  ${c.green}-b, --basic${c.reset}      Basic checks only (${basicCount} checks) - Lighthouse core
  ${c.green}-e, --enhanced${c.reset}   Enhanced checks (${enhancedCount} checks) - Recommended for Angular ${c.dim}[default]${c.reset}
  ${c.green}-F, --full${c.reset}       Full checks (${fullCount} checks) - Maximum coverage

${c.cyan}OPTIONS:${c.reset}
  -h, --help            Show this help
  -v, --version         Show version
  -V, --verbose         Verbose output
  -t, --tier <tier>     Set tier: basic, enhanced, full
  -f, --format <type>   Output: console, json, html
  -o, --output <file>   Write to file
  -i, --ignore <path>   Ignore pattern (can repeat)
  -c, --check <name>    Run only a single specific check
  -l, --list-checks     List all available checks

${c.cyan}EXAMPLES:${c.reset}
  ${c.dim}# Check only your app's media folder${c.reset}
  traufix-a11y ./src/app/media

  ${c.dim}# Quick basic check${c.reset}
  traufix-a11y ./src --basic

  ${c.dim}# Full audit for production${c.reset}
  traufix-a11y ./src --full

  ${c.dim}# JSON output for CI${c.reset}
  traufix-a11y ./src -f json -o report.json

  ${c.dim}# Run only a single check${c.reset}
  traufix-a11y ./src --check buttonNames

  ${c.dim}# List all available checks${c.reset}
  traufix-a11y --list-checks

${c.cyan}TIERS EXPLAINED:${c.reset}
  ${c.bold}BASIC (${basicCount} checks)${c.reset}
    Core Lighthouse accessibility audits. Fast CI checks.
    HTML: buttons, images, forms, ARIA, headings, links, tables
    SCSS: contrast, focus, touch targets

  ${c.bold}ENHANCED (${enhancedCount} checks)${c.reset} ${c.green}[recommended]${c.reset}
    Basic + Angular + common Material checks.
    + Angular: click handlers, routerLink, ngFor
    + Material: mat-icon, mat-form-field, mat-button, mat-table

  ${c.bold}FULL (${fullCount} checks)${c.reset}
    Everything. Maximum accessibility coverage.
    + All Material: dialogs, sliders, menus, tabs, steppers
    + CDK: focus trapping, live announcer
    + SCSS: animations, font sizes, line heights

${c.cyan}DEFAULT IGNORES:${c.reset}
  ${DEFAULT_CONFIG.ignore.join(', ')}

${c.yellow}HINWEIS / DISCLAIMER:${c.reset}
  Diese Software wird ohne Gewähr bereitgestellt.
  Keine Garantie für Vollständigkeit oder Richtigkeit.
  This software is provided "as is" without warranty.

${c.dim}https://github.com/traufix/traufix-a11y${c.reset}
`);
}

// Version
function showVersion() {
  const pkg = require('../package.json');
  console.log('traufix-a11y v' + pkg.version);
}

// JSON format
function formatJSON(results) {
  return JSON.stringify(results, null, 2);
}

// HTML format
function formatHTML(results) {
  const s = results.summary;
  const passRate = ((s.passed / s.totalChecks) * 100).toFixed(1);
  const color = s.failed === 0 ? '#22c55e' : '#ef4444';

  let issuesHtml = '';
  if (s.issues.length === 0) {
    issuesHtml = '<div class="success">Keine Probleme gefunden! / No issues found!</div>';
  } else {
    for (const issue of s.issues) {
      issuesHtml += '<div class="issue"><strong>' + issue.file + '</strong> [' + issue.check + ']<br>' + issue.message + '</div>';
    }
  }

  return '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>A11y Report</title>' +
    '<style>body{font-family:system-ui;max-width:900px;margin:2rem auto;padding:1rem}' +
    '.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin:2rem 0}' +
    '.stat{background:#f5f5f5;padding:1rem;border-radius:8px;text-align:center}' +
    '.stat-value{font-size:2rem;font-weight:bold;color:' + color + '}' +
    '.issue{background:#fef2f2;border-left:3px solid #ef4444;padding:0.75rem;margin:0.5rem 0;border-radius:0 4px 4px 0}' +
    '.success{background:#f0fdf4;border-left:3px solid #22c55e;padding:1rem;border-radius:4px}' +
    '.disclaimer{background:#fffbeb;border:1px solid #f59e0b;padding:1rem;margin-top:2rem;border-radius:4px;font-size:0.875rem}' +
    '</style></head><body>' +
    '<h1>Accessibility Report</h1><p>Tier: ' + (results.tier || 'enhanced').toUpperCase() + '</p>' +
    '<div class="summary">' +
    '<div class="stat"><div class="stat-value">' + s.totalFiles + '</div>Files</div>' +
    '<div class="stat"><div class="stat-value">' + s.totalChecks + '</div>Checks</div>' +
    '<div class="stat"><div class="stat-value" style="color:#22c55e">' + s.passed + '</div>Passed</div>' +
    '<div class="stat"><div class="stat-value">' + passRate + '%</div>Rate</div>' +
    '</div><h2>' + (s.failed === 0 ? 'Alles OK!' : s.failed + ' Probleme gefunden') + '</h2>' +
    issuesHtml +
    '<div class="disclaimer"><strong>Haftungsausschluss:</strong> Diese Analyse wird ohne Gewähr bereitgestellt. ' +
    'Keine Garantie für Vollständigkeit, Richtigkeit oder Eignung. Nutzung auf eigene Verantwortung.<br>' +
    '<strong>Disclaimer:</strong> This analysis is provided "as is" without warranty of any kind.</div>' +
    '<footer style="margin-top:2rem;color:#666;font-size:0.875rem">Generated by traufix-a11y | ' + new Date().toISOString() + '</footer>' +
    '</body></html>';
}

// List all available checks
function listChecks() {
  console.log('\n' + c.bold + 'AVAILABLE CHECKS' + c.reset + '\n');

  console.log(c.cyan + 'HTML Checks (basic):' + c.reset);
  TIERS.basic.html.forEach(check => console.log('  ' + check));

  console.log('\n' + c.cyan + 'SCSS Checks (basic):' + c.reset);
  TIERS.basic.scss.forEach(check => console.log('  ' + check));

  console.log('\n' + c.cyan + 'Additional HTML Checks (enhanced):' + c.reset);
  const enhancedHtmlExtra = TIERS.enhanced.html.filter(c => !TIERS.basic.html.includes(c));
  enhancedHtmlExtra.forEach(check => console.log('  ' + check));

  console.log('\n' + c.cyan + 'Additional SCSS Checks (enhanced):' + c.reset);
  const enhancedScssExtra = TIERS.enhanced.scss.filter(c => !TIERS.basic.scss.includes(c));
  enhancedScssExtra.forEach(check => console.log('  ' + check));

  console.log('\n' + c.cyan + 'Angular Checks (enhanced):' + c.reset);
  TIERS.enhanced.angular.forEach(check => console.log('  ' + check));

  console.log('\n' + c.cyan + 'Material Checks (enhanced):' + c.reset);
  TIERS.enhanced.material.forEach(check => console.log('  ' + check));

  console.log('\n' + c.cyan + 'Additional HTML Checks (full):' + c.reset);
  const fullHtmlExtra = TIERS.full.html.filter(c => !TIERS.enhanced.html.includes(c));
  fullHtmlExtra.forEach(check => console.log('  ' + check));

  console.log('\n' + c.cyan + 'Additional SCSS Checks (full):' + c.reset);
  const fullScssExtra = TIERS.full.scss.filter(c => !TIERS.enhanced.scss.includes(c));
  fullScssExtra.forEach(check => console.log('  ' + check));

  console.log('\n' + c.cyan + 'Additional Angular Checks (full):' + c.reset);
  const fullAngularExtra = TIERS.full.angular.filter(c => !TIERS.enhanced.angular.includes(c));
  fullAngularExtra.forEach(check => console.log('  ' + check));

  console.log('\n' + c.cyan + 'Additional Material Checks (full):' + c.reset);
  const fullMaterialExtra = TIERS.full.material.filter(c => !TIERS.enhanced.material.includes(c));
  fullMaterialExtra.forEach(check => console.log('  ' + check));

  console.log('\n' + c.cyan + 'CDK Checks (full):' + c.reset);
  TIERS.full.cdk.forEach(check => console.log('  ' + check));

  const totalBasic = TIERS.basic.html.length + TIERS.basic.scss.length;
  const totalEnhanced = TIERS.enhanced.html.length + TIERS.enhanced.scss.length +
                        TIERS.enhanced.angular.length + TIERS.enhanced.material.length;
  const totalFull = TIERS.full.html.length + TIERS.full.scss.length +
                    TIERS.full.angular.length + TIERS.full.material.length + TIERS.full.cdk.length;

  console.log('\n' + c.dim + 'Total: basic=' + totalBasic + ', enhanced=' + totalEnhanced + ', full=' + totalFull + c.reset + '\n');
}

// Main
function main() {
  const args = process.argv.slice(2);
  const opts = parseArgs(args);

  if (opts.help) { showHelp(); process.exit(0); }
  if (opts.version) { showVersion(); process.exit(0); }
  if (opts.listChecks) { listChecks(); process.exit(0); }

  if (opts.files.length === 0) {
    console.error(c.red + 'Error: No path specified' + c.reset);
    console.log('Usage: traufix-a11y <directory>');
    console.log('       traufix-a11y --help');
    process.exit(2);
  }

  // Merge ignore patterns
  const ignore = [...DEFAULT_CONFIG.ignore, ...opts.ignore];

  if (opts.verbose) {
    console.log(c.cyan + 'Tier: ' + opts.tier.toUpperCase() + c.reset);
    console.log(c.cyan + 'Ignoring: ' + ignore.join(', ') + c.reset + '\n');
  }

  // Run analysis
  const results = analyze(opts.files[0], {
    tier: opts.tier,
    ignore: ignore,
    verbose: opts.verbose,
    check: opts.check  // Single check mode
  });

  // Single check mode - show result clearly
  if (opts.check) {
    console.log('\n' + c.bold + 'Single Check Mode: ' + opts.check + c.reset + '\n');
  }

  // Format output
  let output;
  if (opts.format === 'json') output = formatJSON(results);
  else if (opts.format === 'html') output = formatHTML(results);
  else output = formatConsoleOutput(results);

  // Write or print
  if (opts.output) {
    fs.writeFileSync(opts.output, output);
    console.log(c.green + 'Report: ' + opts.output + c.reset);
  } else {
    console.log(output);
  }

  process.exit(results.summary.failed > 0 ? 1 : 0);
}

main();
