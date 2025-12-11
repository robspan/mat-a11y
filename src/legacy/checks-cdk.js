/**
 * Angular CDK Accessibility Checks
 *
 * These functions check for proper usage of Angular CDK accessibility features
 * in HTML templates. They help ensure that interactive components follow
 * accessibility best practices for focus management and screen reader support.
 */

/**
 * Check 1: CDK Focus Trap for Dialogs
 *
 * Modal dialogs should trap focus to prevent users (especially keyboard users)
 * from accidentally tabbing outside the dialog while it's open.
 *
 * This check looks for:
 * - Elements with role="dialog"
 * - mat-dialog-container elements
 * - cdk-dialog-container elements
 *
 * And verifies they have either:
 * - cdkTrapFocus directive
 * - cdkTrapFocusAutoCapture directive
 *
 * @param {string} html - The HTML template string to check
 * @returns {{ pass: boolean, issues: string[] }} - Check result with any issues found
 */
function checkCdkTrapFocusDialog(html) {
  const issues = [];

  // Pattern to find elements with role="dialog"
  // Matches: <div role="dialog" ...> or <any-element role="dialog" ...>
  const roleDialogPattern = /<(\w+[-\w]*)[^>]*\brole\s*=\s*["']dialog["'][^>]*>/gi;

  // Pattern to find mat-dialog-container elements
  const matDialogPattern = /<mat-dialog-container[^>]*>/gi;

  // Pattern to find cdk-dialog-container elements
  const cdkDialogPattern = /<cdk-dialog-container[^>]*>/gi;

  // Pattern to check for focus trap directives
  const hasFocusTrap = (elementString) => {
    return /\bcdkTrapFocus\b/i.test(elementString) ||
           /\bcdkTrapFocusAutoCapture\b/i.test(elementString);
  };

  // Helper to extract a snippet for reporting
  const getSnippet = (match) => {
    const snippet = match.length > 80 ? match.substring(0, 80) + '...' : match;
    return snippet.replace(/\s+/g, ' ').trim();
  };

  // Check role="dialog" elements
  let match;
  while ((match = roleDialogPattern.exec(html)) !== null) {
    const elementString = match[0];
    if (!hasFocusTrap(elementString)) {
      issues.push(
        `Dialog element missing focus trap: "${getSnippet(elementString)}". ` +
        `Add cdkTrapFocus or cdkTrapFocusAutoCapture to trap keyboard focus within the dialog.`
      );
    }
  }

  // Check mat-dialog-container elements
  while ((match = matDialogPattern.exec(html)) !== null) {
    const elementString = match[0];
    if (!hasFocusTrap(elementString)) {
      issues.push(
        `mat-dialog-container missing focus trap: "${getSnippet(elementString)}". ` +
        `Consider adding cdkTrapFocus for proper modal focus management.`
      );
    }
  }

  // Check cdk-dialog-container elements
  while ((match = cdkDialogPattern.exec(html)) !== null) {
    const elementString = match[0];
    if (!hasFocusTrap(elementString)) {
      issues.push(
        `cdk-dialog-container missing focus trap: "${getSnippet(elementString)}". ` +
        `Consider adding cdkTrapFocus for proper modal focus management.`
      );
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 2: CDK Aria Describer for Complex Widgets
 *
 * Complex interactive widgets like listboxes, trees, and grids often benefit
 * from additional descriptions to help screen reader users understand how
 * to interact with them.
 *
 * This is an INFORMATIONAL check - it flags widgets that MIGHT benefit from
 * aria-describedby, but it's not always required.
 *
 * Checks for:
 * - role="listbox" - Custom dropdown/selection components
 * - role="tree" - Hierarchical tree views
 * - role="grid" - Data grid/spreadsheet-like components
 * - role="treegrid" - Combination of tree and grid
 *
 * @param {string} html - The HTML template string to check
 * @returns {{ pass: boolean, issues: string[] }} - Check result with informational issues
 */
function checkCdkAriaDescriber(html) {
  const issues = [];

  // Complex widget roles that often benefit from descriptions
  const complexWidgetRoles = ['listbox', 'tree', 'grid', 'treegrid'];

  // Build pattern to match any of the complex widget roles
  const rolesPattern = complexWidgetRoles.join('|');
  const complexWidgetPattern = new RegExp(
    `<(\\w+[-\\w]*)([^>]*)\\brole\\s*=\\s*["'](${rolesPattern})["']([^>]*)>`,
    'gi'
  );

  // Pattern to check for aria-describedby
  const hasAriaDescribedBy = (elementString) => {
    return /\baria-describedby\b/i.test(elementString) ||
           /\[attr\.aria-describedby\]/i.test(elementString);
  };

  // Helper to extract element snippet for reporting
  const getSnippet = (match) => {
    const snippet = match.length > 80 ? match.substring(0, 80) + '...' : match;
    return snippet.replace(/\s+/g, ' ').trim();
  };

  let match;
  while ((match = complexWidgetPattern.exec(html)) !== null) {
    const elementString = match[0];
    const role = match[3]; // The captured role value

    if (!hasAriaDescribedBy(elementString)) {
      issues.push(
        `[Informational] Complex widget with role="${role}" found: "${getSnippet(elementString)}". ` +
        `Consider adding aria-describedby to provide usage instructions for screen reader users.`
      );
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 3: CDK Live Announcer for Dynamic Content
 *
 * Dynamic content changes (like status messages, error notifications, loading states)
 * should be announced to screen reader users. Without proper ARIA live regions,
 * users may not be aware that content has changed.
 *
 * This check looks for common Angular patterns that indicate dynamic content:
 * - *ngIf with status/error/success/warning messages
 * - *ngIf with loading indicators
 * - *ngIf with notification/alert patterns
 *
 * And checks if they're in an aria-live region or have role="alert" or role="status".
 *
 * @param {string} html - The HTML template string to check
 * @returns {{ pass: boolean, issues: string[] }} - Check result with any issues found
 */
function checkCdkLiveAnnouncer(html) {
  const issues = [];

  // Keywords that suggest dynamic status/notification content
  const statusKeywords = [
    'error', 'success', 'warning', 'info', 'alert', 'notification',
    'message', 'status', 'loading', 'saving', 'submitting', 'processing',
    'fehler', 'erfolg', 'warnung', 'meldung', 'laden' // German equivalents
  ];

  // Build pattern to find *ngIf with status-related content
  // This looks for elements with *ngIf that contain status keywords in:
  // - Class names
  // - The condition itself
  // - Adjacent text content patterns
  const keywordsPattern = statusKeywords.join('|');

  // Pattern 1: *ngIf on elements with status-related class names
  const ngIfWithStatusClassPattern = new RegExp(
    `<(\\w+[-\\w]*)([^>]*\\*ngIf\\s*=\\s*["'][^"']*["'][^>]*class\\s*=\\s*["'][^"']*(${keywordsPattern})[^"']*["'][^>]*)>`,
    'gi'
  );

  // Pattern 2: *ngIf condition contains status keywords
  const ngIfStatusConditionPattern = new RegExp(
    `<(\\w+[-\\w]*)([^>]*\\*ngIf\\s*=\\s*["'][^"']*(${keywordsPattern})[^"']*["'][^>]*)>`,
    'gi'
  );

  // Pattern to check for live region attributes
  const hasLiveRegion = (elementString, surroundingContext = '') => {
    const combined = elementString + ' ' + surroundingContext;
    return /\baria-live\s*=\s*["'](polite|assertive|off)["']/i.test(combined) ||
           /\brole\s*=\s*["'](alert|status|log|marquee|timer)["']/i.test(combined) ||
           /\[attr\.aria-live\]/i.test(combined) ||
           /\[attr\.role\]\s*=\s*["'](alert|status)["']/i.test(combined) ||
           /cdkAriaLive/i.test(combined);
  };

  // Helper to get surrounding context (parent elements that might have aria-live)
  const getSurroundingContext = (html, matchIndex, windowSize = 500) => {
    const start = Math.max(0, matchIndex - windowSize);
    const end = Math.min(html.length, matchIndex);
    return html.substring(start, end);
  };

  // Helper to extract element snippet for reporting
  const getSnippet = (match) => {
    const snippet = match.length > 100 ? match.substring(0, 100) + '...' : match;
    return snippet.replace(/\s+/g, ' ').trim();
  };

  // Track already reported elements to avoid duplicates
  const reportedSnippets = new Set();

  // Check pattern 1: *ngIf with status-related classes
  let match;
  while ((match = ngIfWithStatusClassPattern.exec(html)) !== null) {
    const elementString = match[0];
    const snippet = getSnippet(elementString);

    // Skip if already reported
    if (reportedSnippets.has(snippet)) continue;

    const surroundingContext = getSurroundingContext(html, match.index);

    if (!hasLiveRegion(elementString, surroundingContext)) {
      reportedSnippets.add(snippet);
      issues.push(
        `Dynamic content with *ngIf may need live announcement: "${snippet}". ` +
        `Consider adding aria-live="polite", role="alert", or using CDK LiveAnnouncer ` +
        `to notify screen reader users of content changes.`
      );
    }
  }

  // Check pattern 2: *ngIf condition contains status keywords
  while ((match = ngIfStatusConditionPattern.exec(html)) !== null) {
    const elementString = match[0];
    const snippet = getSnippet(elementString);

    // Skip if already reported
    if (reportedSnippets.has(snippet)) continue;

    const surroundingContext = getSurroundingContext(html, match.index);

    if (!hasLiveRegion(elementString, surroundingContext)) {
      reportedSnippets.add(snippet);
      issues.push(
        `Dynamic content with *ngIf may need live announcement: "${snippet}". ` +
        `Consider adding aria-live="polite", role="alert", or using CDK LiveAnnouncer ` +
        `to notify screen reader users of content changes.`
      );
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

// Export all check functions
module.exports = {
  checkCdkTrapFocusDialog,
  checkCdkAriaDescriber,
  checkCdkLiveAnnouncer
};
