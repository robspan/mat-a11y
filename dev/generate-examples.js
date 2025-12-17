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

// Run component analysis (same as CLI default)
let results;
try {
  results = analyzeByComponent(targetPath, { tier: 'full' });
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

// Load all formatters
const formatters = loadAllFormatters();

// Generate each format
for (const [name, formatter] of formatters) {
  try {
    const output = formatter.format(optimizedResults);
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
const demoHtml = transformHtmlForDemo(htmlSrc, optimizedResults);
fs.writeFileSync(path.join(guiDemoDir, 'index.html'), demoHtml);
console.log('✓ index.html (transformed for demo)');

// 3. Generate demo app.js
const demoAppJs = generateDemoAppJs(optimizedResults);
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
  // Embed the results directly in the demo JS
  const embeddedResults = JSON.stringify({
    totalIssues: results.totalIssues || 0,
    componentCount: results.componentCount || 0,
    totalComponentsScanned: results.totalComponentsScanned || 0,
    audits: results.audits || [],
    auditScore: results.auditScore || null
  });

  return `/**
 * mat-a11y GUI Demo - Auto-generated from real GUI
 * This file is generated by: node dev/generate-examples.js
 *
 * Static demo version that works without a server.
 * Uses embedded results from a real scan.
 */

(function() {
  'use strict';

  // Embedded scan results (from real analysis)
  const DEMO_RESULTS = ${embeddedResults};

  // ==========================================================================
  // DOM Elements
  // ==========================================================================

  const elements = {
    expertToggle: document.getElementById('expert-mode'),
    darkModeBtn: document.getElementById('dark-mode-btn'),
    scanForm: document.getElementById('scan-form'),
    scanButton: document.getElementById('scan-button'),
    copyCliBtn: document.getElementById('copy-cli'),
    cliPreview: document.getElementById('cli-preview'),
    scanPanel: document.querySelector('.scan-panel'),
    progressPanel: document.getElementById('progress-panel'),
    progressText: document.getElementById('progress-text'),
    progressStages: document.querySelectorAll('.progress-stage'),
    resultsPanel: document.getElementById('results-panel'),
    errorPanel: document.getElementById('error-panel'),
    previewPanel: document.getElementById('preview-panel'),
    newScanBtn: document.getElementById('new-scan-btn'),
    totalIssues: document.getElementById('total-issues'),
    componentsCount: document.getElementById('components-count'),
    statIssuesSimple: document.getElementById('stat-issues-simple'),
    statComponentsSimple: document.getElementById('stat-components-simple'),
    statScoreSimple: document.getElementById('stat-score-simple'),
    statFiles: document.getElementById('stat-files'),
    statTime: document.getElementById('stat-time'),
    statChecks: document.getElementById('stat-checks'),
    statCritical: document.getElementById('stat-critical'),
    statHigh: document.getElementById('stat-high'),
    statMedium: document.getElementById('stat-medium')
  };

  // ==========================================================================
  // Progress Animation
  // ==========================================================================

  const PROGRESS_MESSAGES = [
    { stage: 'find', text: 'Finding component files...' },
    { stage: 'analyze', text: 'Analyzing component structure...' },
    { stage: 'check', text: 'Running accessibility checks...' },
    { stage: 'report', text: 'Generating report...' }
  ];

  let progressInterval = null;

  function startProgressAnimation() {
    let currentStage = 0;
    updateProgressStage(currentStage);

    progressInterval = setInterval(() => {
      currentStage++;
      if (currentStage < PROGRESS_MESSAGES.length) {
        updateProgressStage(currentStage);
      }
    }, 400); // Fast for demo
  }

  function updateProgressStage(stageIndex) {
    const message = PROGRESS_MESSAGES[stageIndex];
    if (elements.progressText) {
      elements.progressText.textContent = message.text;
    }

    elements.progressStages.forEach((el, i) => {
      el.classList.remove('completed');
      el.removeAttribute('aria-current');
      if (i < stageIndex) {
        el.classList.add('completed');
      } else if (i === stageIndex) {
        el.setAttribute('aria-current', 'step');
      }
    });
  }

  function stopProgressAnimation() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    elements.progressStages.forEach(el => {
      el.classList.add('completed');
      el.removeAttribute('aria-current');
    });
  }

  // ==========================================================================
  // UI State Management
  // ==========================================================================

  function showPanel(panelName) {
    elements.scanPanel.hidden = panelName !== 'scan';
    elements.progressPanel.hidden = panelName !== 'progress';
    elements.resultsPanel.hidden = panelName !== 'results';
    if (elements.errorPanel) elements.errorPanel.hidden = panelName !== 'error';
    if (elements.previewPanel) elements.previewPanel.hidden = panelName !== 'preview';

    window.scrollTo(0, 0);

    if (panelName === 'results') {
      elements.resultsPanel.focus();
      announceToScreenReader('Demo scan complete. Results are now available.');
    } else if (panelName === 'progress') {
      announceToScreenReader('Simulating accessibility scan...');
    }
  }

  function announceToScreenReader(message) {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    el.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  // ==========================================================================
  // Dark Mode
  // ==========================================================================

  function initDarkMode() {
    const saved = localStorage.getItem('mat-a11y-dark-mode');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (saved === 'true' || (saved === null && systemDark)) {
      document.body.classList.add('dark-mode');
    }

    if (elements.darkModeBtn) {
      elements.darkModeBtn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('mat-a11y-dark-mode', isDark);
        announceToScreenReader(isDark ? 'Dark mode enabled' : 'Light mode enabled');
      });
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (localStorage.getItem('mat-a11y-dark-mode') === null) {
        document.body.classList.toggle('dark-mode', e.matches);
      }
    });
  }

  // ==========================================================================
  // Expert Mode
  // ==========================================================================

  function initExpertMode() {
    const saved = localStorage.getItem('mat-a11y-expert-mode');
    if (saved === 'true') {
      elements.expertToggle.checked = true;
      document.body.classList.add('expert-mode');
    }

    elements.expertToggle.addEventListener('change', (e) => {
      const isExpert = e.target.checked;
      document.body.classList.toggle('expert-mode', isExpert);
      localStorage.setItem('mat-a11y-expert-mode', isExpert);
      updateCliPreview();
      announceToScreenReader(isExpert ? 'Expert mode enabled' : 'Expert mode disabled');
    });
  }

  // ==========================================================================
  // CLI Preview
  // ==========================================================================

  function updateCliPreview() {
    if (!elements.cliPreview) return;
    const tier = document.querySelector('input[name="tier"]:checked')?.value || 'full';
    let cmd = 'npx mat-a11y';
    if (tier !== 'full') cmd += ' --tier ' + tier;
    elements.cliPreview.textContent = cmd;
  }

  function initCliCopy() {
    if (!elements.copyCliBtn) return;

    elements.copyCliBtn.addEventListener('click', async () => {
      const cmd = elements.cliPreview?.textContent || '';
      try {
        await navigator.clipboard.writeText(cmd);
        elements.copyCliBtn.classList.add('copied');
        const original = elements.copyCliBtn.innerHTML;
        elements.copyCliBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
        announceToScreenReader('Command copied');
        setTimeout(() => {
          elements.copyCliBtn.classList.remove('copied');
          elements.copyCliBtn.innerHTML = original;
        }, 2000);
      } catch (e) {
        console.warn('Copy failed:', e);
      }
    });
  }

  // ==========================================================================
  // Collapsible Sections
  // ==========================================================================

  function initCollapsibles() {
    document.querySelectorAll('.collapsible-header').forEach(header => {
      header.addEventListener('click', () => {
        const expanded = header.getAttribute('aria-expanded') === 'true';
        const contentId = header.getAttribute('aria-controls');
        const content = document.getElementById(contentId);
        header.setAttribute('aria-expanded', !expanded);
        if (content) content.hidden = expanded;
      });
    });
  }

  // ==========================================================================
  // Demo Scan
  // ==========================================================================

  function initScanForm() {
    elements.scanForm.addEventListener('submit', handleDemoScan);
    elements.newScanBtn.addEventListener('click', () => showPanel('scan'));

    document.querySelectorAll('input[name="tier"]').forEach(radio => {
      radio.addEventListener('change', updateCliPreview);
    });
  }

  async function handleDemoScan(e) {
    e.preventDefault();

    showPanel('progress');
    startProgressAnimation();
    elements.scanButton.disabled = true;

    // Simulate scan time
    await new Promise(r => setTimeout(r, 1800));

    stopProgressAnimation();
    displayResults(DEMO_RESULTS);
    showPanel('results');
    elements.scanButton.disabled = false;
  }

  function displayResults(results) {
    const total = results.totalIssues || 0;
    const comps = results.componentCount || 0;
    const files = results.totalComponentsScanned || 0;
    const score = results.auditScore;

    // Summary
    if (elements.totalIssues) elements.totalIssues.textContent = total;
    if (elements.componentsCount) elements.componentsCount.textContent = comps;

    // Simple mode stats
    if (elements.statIssuesSimple) elements.statIssuesSimple.textContent = total;
    if (elements.statComponentsSimple) elements.statComponentsSimple.textContent = comps;
    if (elements.statScoreSimple) {
      elements.statScoreSimple.textContent = score !== null && score !== undefined ? score : '--';
      if (score !== null && score !== undefined) {
        const color = score >= 80 ? 'var(--color-success)' : score >= 50 ? 'var(--color-warning)' : 'var(--color-error)';
        elements.statScoreSimple.style.color = color;
      }
    }

    // Expert stats
    if (elements.statFiles) elements.statFiles.textContent = files;
    if (elements.statTime) elements.statTime.textContent = '1.8s';
    if (elements.statChecks) elements.statChecks.textContent = results.audits?.length || 82;

    // Count by severity
    let critical = 0, high = 0, medium = 0;
    if (results.audits) {
      for (const audit of results.audits) {
        const w = audit.weight || 5;
        const issues = audit.issues || 0;
        if (w >= 10) critical += issues;
        else if (w >= 7) high += issues;
        else medium += issues;
      }
    }

    if (elements.statCritical) elements.statCritical.textContent = critical;
    if (elements.statHigh) elements.statHigh.textContent = high;
    if (elements.statMedium) elements.statMedium.textContent = medium;

    // Update success icon
    const icon = document.querySelector('.success-icon');
    if (icon) {
      if (total === 0) {
        icon.style.background = 'var(--color-success-bg)';
        icon.style.color = 'var(--color-success)';
        icon.innerHTML = '&#10003;';
      } else if (total <= 10) {
        icon.style.background = 'var(--color-warning-bg)';
        icon.style.color = 'var(--color-warning)';
        icon.innerHTML = '!';
      } else {
        icon.style.background = 'var(--color-error-bg)';
        icon.style.color = 'var(--color-error)';
        icon.innerHTML = '!!';
      }
    }
  }

  // ==========================================================================
  // Export Buttons (Demo Mode - just show samples)
  // ==========================================================================

  function initExport() {
    document.querySelectorAll('.export-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const format = btn.dataset.format;
        if (!format) return;

        // Map format to sample file
        const files = {
          'html': '../_report-html.html',
          'pdf': '../_report-html.html',
          'ai': '../_report-ai.backlog.txt',
          'json': '../_report-json.json',
          'csv': '../_report-csv.csv',
          'markdown': '../_report-markdown.md',
          'sarif': '../_report-sarif.sarif.json',
          'junit': '../_report-junit.xml',
          'github-annotations': '../_report-github-annotations.txt',
          'gitlab-codequality': '../_report-gitlab-codequality.json',
          'checkstyle': '../_report-checkstyle.xml',
          'sonarqube': '../_report-sonarqube.json',
          'prometheus': '../_report-prometheus.prom',
          'grafana-json': '../_report-grafana-json.json',
          'datadog': '../_report-datadog.json',
          'slack': '../_report-slack.json',
          'discord': '../_report-discord.json',
          'teams': '../_report-teams.json'
        };

        const file = files[format];
        if (file) {
          window.open(file, '_blank');
        }
      });
    });
  }

  // ==========================================================================
  // Keyboard Navigation
  // ==========================================================================

  function initKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!elements.resultsPanel.hidden) {
          showPanel('scan');
          elements.scanButton.focus();
        }
      }
    });
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  function init() {
    initDarkMode();
    initExpertMode();
    initScanForm();
    initExport();
    initKeyboardNav();
    initCliCopy();
    initCollapsibles();
    updateCliPreview();

    elements.resultsPanel.setAttribute('tabindex', '-1');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
`;
}
