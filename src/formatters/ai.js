'use strict';

/**
 * AI/LLM-Optimized Formatter
 *
 * Simple TODO checklist for AI assistants to work through.
 * Grouped by component name for quick identification.
 */

/**
 * Extract component name from file path
 * e.g., "app/components/image-preview/image-preview.component.html" → "ImagePreviewComponent"
 */
function extractComponentName(filePath) {
  if (!filePath || filePath === 'unknown') return 'Unknown';

  const normalized = filePath.replace(/\\/g, '/');
  const fileName = normalized.split('/').pop() || '';

  // Handle inline templates like "<app-header> (inline template)"
  if (fileName.includes('(inline template)')) {
    const match = fileName.match(/<([^>]+)>/);
    if (match) {
      return selectorToComponentName(match[1]);
    }
  }

  // Extract base name: "image-preview.component.html" → "image-preview"
  const baseName = fileName
    .replace(/\.(component|directive|pipe)?\.(html|scss|css|ts)$/, '')
    .replace(/\.(html|scss|css|ts)$/, '');

  if (!baseName) return 'Unknown';

  // Convert kebab-case to PascalCase and add Component suffix
  return kebabToPascal(baseName) + (fileName.includes('.component.') ? '' : 'Component');
}

/**
 * Convert selector like "app-header" to "AppHeaderComponent"
 */
function selectorToComponentName(selector) {
  return kebabToPascal(selector.replace(/^app-/, '')) + 'Component';
}

/**
 * Convert kebab-case to PascalCase
 */
function kebabToPascal(str) {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Get short file path (last 2-3 segments)
 */
function getShortPath(filePath) {
  if (!filePath) return '';
  return filePath.replace(/\\/g, '/').split('/').slice(-3).join('/');
}

/**
 * Format results as simple TODO checklist
 */
function format(results, options = {}) {
  const lines = [];

  // Handle component-based results (from analyzeByComponent)
  if (results.components && Array.isArray(results.components)) {
    return formatComponentResults(results, lines);
  }

  // Combine all possible result sources:
  // - sitemap URLs (results.urls)
  // - internal routes from sitemap analysis (results.internal.routes)
  // - route-based analysis (results.routes)
  const urls = results.urls || [];
  const internalRoutes = (results.internal && results.internal.routes) || [];
  const routeBasedRoutes = results.routes || [];
  const allUrls = [...urls, ...internalRoutes, ...routeBasedRoutes];

  // Group all issues by component name
  // Use global deduplication: same issue in same file only counts once
  // (even if 67 URLs use that component)
  const issuesByComponent = new Map();
  const globalSeen = new Set(); // Track file|check|element globally

  for (const url of allUrls) {
    for (const issue of (url.issues || [])) {
      const filePath = issue.file || 'unknown';
      const componentName = extractComponentName(filePath);

      if (!issuesByComponent.has(componentName)) {
        issuesByComponent.set(componentName, {
          files: new Set(),
          issues: [],
          affectedUrls: new Set()
        });
      }

      const comp = issuesByComponent.get(componentName);
      comp.files.add(filePath);
      if (url.path) comp.affectedUrls.add(url.path);

      // Extract the code snippet and create a simple fix hint
      const parsed = parseIssue(issue.message);
      const element = parsed.element || issue.element || '';
      const fix = getQuickFix(issue.check, parsed);

      // Deduplicate globally by file|check|element
      // This prevents counting the same issue multiple times across URLs
      const globalKey = `${filePath}|${issue.check}|${element}`;
      if (!globalSeen.has(globalKey)) {
        globalSeen.add(globalKey);
        comp.issues.push({
          check: issue.check,
          element: element,
          fix: fix,
          file: filePath
        });
      }
    }
  }

  // Sort components by number of issues
  const sortedComponents = [...issuesByComponent.entries()]
    .filter(([_, data]) => data.issues.length > 0)
    .sort((a, b) => b[1].issues.length - a[1].issues.length);

  if (sortedComponents.length === 0) {
    lines.push('✓ No accessibility issues found!');
    return lines.join('\n');
  }

  // Header
  const totalIssues = sortedComponents.reduce((sum, [_, data]) => sum + data.issues.length, 0);
  lines.push(`ACCESSIBILITY TODO: ${totalIssues} issues in ${sortedComponents.length} components`);
  lines.push('');
  lines.push('Fix each issue and mark [x] when done.');
  lines.push('');

  // Output by component
  for (const [componentName, data] of sortedComponents) {
    const fileList = [...data.files].map(f => getShortPath(f));
    const uniqueFiles = [...new Set(fileList)];

    lines.push(`════════════════════════════════════════`);
    lines.push(`COMPONENT: ${componentName}`);

    // Show affected URLs (max 5)
    if (data.affectedUrls.size > 0) {
      const urlList = [...data.affectedUrls].slice(0, 5);
      const moreCount = data.affectedUrls.size - 5;
      lines.push(`AFFECTS: ${urlList.join(', ')}${moreCount > 0 ? ` (+${moreCount} more)` : ''}`);
    }

    // Show files
    if (uniqueFiles.length === 1) {
      lines.push(`FILE: ${uniqueFiles[0]}`);
    } else {
      lines.push(`FILES: ${uniqueFiles.slice(0, 3).join(', ')}${uniqueFiles.length > 3 ? ` (+${uniqueFiles.length - 3})` : ''}`);
    }
    lines.push(`════════════════════════════════════════`);

    // Group by check type for cleaner output
    const issuesByCheck = new Map();
    for (const issue of data.issues) {
      if (!issuesByCheck.has(issue.check)) {
        issuesByCheck.set(issue.check, { fix: issue.fix, elements: [] });
      }
      if (issue.element) {
        issuesByCheck.get(issue.check).elements.push(issue.element);
      }
    }

    for (const [check, info] of issuesByCheck) {
      const count = info.elements.length || 1;
      const countStr = count > 1 ? ` (×${count})` : '';

      // Show first element as example if available
      const exampleElement = info.elements[0];
      const elementStr = exampleElement
        ? `: ${exampleElement.substring(0, 55)}${exampleElement.length > 55 ? '...' : ''}`
        : '';

      lines.push(`[ ] ${check}${elementStr}${countStr}`);
      if (info.fix) {
        lines.push(`    → ${info.fix}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get a quick one-line fix suggestion
 */
function getQuickFix(check, parsed) {
  const fixes = {
    'matIconAccessibility': 'Add aria-hidden="true" OR aria-label="description"',
    'clickWithoutKeyboard': 'Add (keydown.enter) and (keydown.space) OR use <button>',
    'clickWithoutRole': 'Add role="button" tabindex="0" OR use <button>',
    'imageAlt': 'Add alt="description" OR alt="" if decorative',
    'buttonNames': 'Add aria-label OR visible text',
    'linkNames': 'Add aria-label OR visible text',
    'formLabels': 'Add <label> OR aria-label',
    'headingOrder': parsed.fixes[0] || 'Fix heading hierarchy (h1→h2→h3)',
    'iframeTitles': 'Add title="description"',
    'htmlHasLang': 'Add lang="en" to <html>',
    'metaViewport': 'Ensure user-scalable=yes',
    'focusStyles': 'Add :focus-visible styles',
    'hoverWithoutFocus': 'Add :focus styles matching :hover',
    'colorContrast': 'Increase color contrast ratio',
    'matFormFieldLabel': 'Add <mat-label> inside mat-form-field',
    'matCheckboxLabel': 'Add aria-label OR text content',
    'matRadioGroupLabel': 'Add aria-label to mat-radio-group',
    'matSelectPlaceholder': 'Add placeholder OR mat-label',
    'matDialogFocus': 'Add cdkFocusInitial to first focusable element',
    'matMenuTrigger': 'Add aria-label to trigger button',
    'matTabLabel': 'Add aria-label to mat-tab',
    'matExpansionHeader': 'Add aria-label if no text',
    'ariaHiddenBody': 'Remove aria-hidden from <body>',
    'duplicateIdAria': 'Use unique IDs for ARIA references'
  };

  return fixes[check] || (parsed.fixes[0] ? parsed.fixes[0] : null);
}

/**
 * Parse issue message for element and fixes
 */
function parseIssue(issueStr) {
  const result = { fixes: [], element: null };
  if (!issueStr) return result;

  const lines = issueStr.split('\n');
  let inFixes = false;

  for (const line of lines) {
    if (line.includes('How to fix:')) {
      inFixes = true;
      continue;
    }
    if (inFixes && line.trim().startsWith('-')) {
      result.fixes.push(line.trim().substring(1).trim());
      continue;
    }
    const foundMatch = line.match(/Found:\s*(.+?)(?:\s*\(line\s*\d+\))?$/);
    if (foundMatch) {
      result.element = foundMatch[1].trim();
      inFixes = false;
    }
  }
  return result;
}

/**
 * Format component-based analysis results
 */
function formatComponentResults(results, lines) {
  const components = results.components || [];

  // Filter to components with issues
  const withIssues = components.filter(c => c.issues && c.issues.length > 0);

  if (withIssues.length === 0) {
    lines.push('✓ No accessibility issues found!');
    return lines.join('\n');
  }

  // Header
  const totalIssues = results.totalIssues || withIssues.reduce((sum, c) => sum + c.issues.length, 0);
  lines.push(`ACCESSIBILITY TODO: ${totalIssues} issues in ${withIssues.length} components`);
  lines.push('');
  lines.push('Fix each issue and mark [x] when done.');
  lines.push('');

  // Output by component
  for (const comp of withIssues) {
    const fileList = comp.files || [];
    const uniqueFiles = [...new Set(fileList.map(f => getShortPath(f)))];

    lines.push(`════════════════════════════════════════`);
    lines.push(`COMPONENT: ${comp.name}`);

    if (uniqueFiles.length > 0) {
      lines.push(`FILES: ${uniqueFiles.join(', ')}`);
    }
    lines.push(`════════════════════════════════════════`);

    // Group issues by check
    const byCheck = {};
    for (const issue of comp.issues) {
      const check = issue.check || 'unknown';
      if (!byCheck[check]) {
        byCheck[check] = [];
      }

      const parsed = parseIssue(issue.message);
      const element = parsed.element || '';
      const fix = getQuickFix(check, parsed);

      byCheck[check].push({ element, fix, message: issue.message });
    }

    // Output issues grouped by check
    for (const [check, issues] of Object.entries(byCheck)) {
      const fix = issues[0].fix;

      // Group identical elements
      const elementCounts = {};
      for (const issue of issues) {
        const el = issue.element || '(no element)';
        elementCounts[el] = (elementCounts[el] || 0) + 1;
      }

      for (const [element, count] of Object.entries(elementCounts)) {
        const countStr = count > 1 ? ` (×${count})` : '';
        lines.push(`[ ] ${check}: ${element}${countStr}`);
        if (fix) {
          lines.push(`    → ${fix}`);
        }
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = {
  name: 'ai',
  description: 'Simple TODO checklist for AI/LLM to fix issues',
  category: 'docs',
  output: 'text',
  fileExtension: '.todo.txt',
  mimeType: 'text/plain',
  format
};
