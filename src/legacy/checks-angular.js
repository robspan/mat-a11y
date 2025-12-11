/**
 * Angular-specific accessibility checks
 *
 * These checks analyze Angular template HTML for common accessibility issues
 * specific to Angular's template syntax and patterns.
 */

/**
 * List of native interactive HTML elements that don't need additional
 * keyboard handlers or roles when using (click)
 */
const INTERACTIVE_ELEMENTS = [
  'a', 'button', 'input', 'select', 'textarea', 'details', 'summary',
  'audio', 'video', 'embed', 'iframe', 'object', 'area', 'map'
];

/**
 * List of non-interactive elements that commonly get (click) handlers
 * but need keyboard support and proper roles
 */
const NON_INTERACTIVE_ELEMENTS = [
  'div', 'span', 'p', 'section', 'article', 'header', 'footer', 'main',
  'aside', 'nav', 'figure', 'figcaption', 'li', 'ul', 'ol', 'dl', 'dt', 'dd',
  'table', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot', 'img', 'label'
];

/**
 * Check 1: checkClickWithoutKeyboard
 *
 * Detects (click) handlers on non-interactive elements without corresponding
 * keyboard event handlers (keydown, keyup, keypress).
 *
 * Non-interactive elements with click handlers must also have keyboard handlers
 * to ensure keyboard-only users can trigger the same actions.
 *
 * @param {string} html - The Angular template HTML string
 * @returns {{ pass: boolean, issues: string[] }} Result with pass status and issues found
 */
function checkClickWithoutKeyboard(html) {
  const issues = [];

  // Regex to match opening tags of non-interactive elements with attributes
  // Captures: element name, all attributes
  const tagPattern = new RegExp(
    `<(${NON_INTERACTIVE_ELEMENTS.join('|')})\\b([^>]*)>`,
    'gi'
  );

  let match;
  while ((match = tagPattern.exec(html)) !== null) {
    const elementName = match[1].toLowerCase();
    const attributes = match[2];
    const fullMatch = match[0];

    // Check if this element has a (click) handler
    const hasClick = /\(click\)\s*=/.test(attributes);

    if (hasClick) {
      // Check for keyboard event handlers
      const hasKeydown = /\(keydown(?:\.[\w.]+)?\)\s*=/.test(attributes);
      const hasKeyup = /\(keyup(?:\.[\w.]+)?\)\s*=/.test(attributes);
      const hasKeypress = /\(keypress(?:\.[\w.]+)?\)\s*=/.test(attributes);

      const hasKeyboardHandler = hasKeydown || hasKeyup || hasKeypress;

      if (!hasKeyboardHandler) {
        // Get line number for better error reporting
        const lineNumber = getLineNumber(html, match.index);
        issues.push(
          `Line ${lineNumber}: <${elementName}> has (click) handler without keyboard handler. ` +
          `Add (keydown.enter) or (keydown.space) for keyboard accessibility.`
        );
      }
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 2: checkClickWithoutRole
 *
 * Detects (click) handlers on non-interactive elements without proper
 * role="button" and tabindex attributes. Elements that act as buttons
 * must be announced as such to screen readers and be focusable.
 *
 * @param {string} html - The Angular template HTML string
 * @returns {{ pass: boolean, issues: string[] }} Result with pass status and issues found
 */
function checkClickWithoutRole(html) {
  const issues = [];

  // Regex to match opening tags of non-interactive elements
  const tagPattern = new RegExp(
    `<(${NON_INTERACTIVE_ELEMENTS.join('|')})\\b([^>]*)>`,
    'gi'
  );

  let match;
  while ((match = tagPattern.exec(html)) !== null) {
    const elementName = match[1].toLowerCase();
    const attributes = match[2];

    // Check if this element has a (click) handler
    const hasClick = /\(click\)\s*=/.test(attributes);

    if (hasClick) {
      // Check for role attribute (static or bound)
      const hasRole = /\brole\s*=/.test(attributes) || /\[attr\.role\]\s*=/.test(attributes);

      // Check for tabindex attribute (static or bound)
      // Accept tabindex="0" or [attr.tabindex] or [tabindex]
      const hasTabindex = /\btabindex\s*=/.test(attributes) ||
                          /\[attr\.tabindex\]\s*=/.test(attributes) ||
                          /\[tabindex\]\s*=/.test(attributes);

      const missingAttributes = [];
      if (!hasRole) missingAttributes.push('role="button"');
      if (!hasTabindex) missingAttributes.push('tabindex="0"');

      if (missingAttributes.length > 0) {
        const lineNumber = getLineNumber(html, match.index);
        issues.push(
          `Line ${lineNumber}: <${elementName}> has (click) handler but is missing ${missingAttributes.join(' and ')}. ` +
          `Non-interactive elements with click handlers need proper ARIA roles and focus capability.`
        );
      }
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 3: checkRouterLinkNames
 *
 * Ensures that elements with routerLink have accessible text content
 * or an aria-label. Links must have discernible text for screen reader users.
 *
 * @param {string} html - The Angular template HTML string
 * @returns {{ pass: boolean, issues: string[] }} Result with pass status and issues found
 */
function checkRouterLinkNames(html) {
  const issues = [];

  // Match elements with routerLink attribute (static or bound)
  // Captures: element name, attributes, inner content (for self-closing detection)
  const routerLinkPattern = /<(\w+)\b([^>]*(?:routerLink|\[routerLink\])[^>]*)>([\s\S]*?)<\/\1>|<(\w+)\b([^>]*(?:routerLink|\[routerLink\])[^>]*)\/>/gi;

  let match;
  while ((match = routerLinkPattern.exec(html)) !== null) {
    const elementName = match[1] || match[4];
    const attributes = match[2] || match[5];
    const innerContent = match[3] || '';
    const fullMatch = match[0];

    // Check for accessible name sources
    const hasAriaLabel = /aria-label\s*=/.test(attributes) || /\[attr\.aria-label\]\s*=/.test(attributes);
    const hasAriaLabelledby = /aria-labelledby\s*=/.test(attributes) || /\[attr\.aria-labelledby\]\s*=/.test(attributes);
    const hasTitle = /\btitle\s*=/.test(attributes) || /\[attr\.title\]\s*=/.test(attributes);

    // Check for text content (excluding whitespace-only and Angular comments)
    const strippedContent = innerContent
      .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
      .replace(/<[^>]+>/g, '')          // Remove HTML tags
      .replace(/\{\{[^}]+\}\}/g, 'text') // Treat interpolations as text
      .trim();

    const hasTextContent = strippedContent.length > 0;

    // Check for image with alt text inside
    const hasImageWithAlt = /<img[^>]+alt\s*=\s*["'][^"']+["'][^>]*>/i.test(innerContent);

    // Check for visually hidden text patterns
    const hasVisuallyHiddenText = /class\s*=\s*["'][^"']*(?:sr-only|visually-hidden|cdk-visually-hidden)[^"']*["']/i.test(innerContent);

    const hasAccessibleName = hasAriaLabel || hasAriaLabelledby || hasTitle ||
                              hasTextContent || hasImageWithAlt || hasVisuallyHiddenText;

    if (!hasAccessibleName) {
      const lineNumber = getLineNumber(html, match.index);
      issues.push(
        `Line ${lineNumber}: <${elementName}> with routerLink has no accessible name. ` +
        `Add text content, aria-label, or aria-labelledby to describe the link destination.`
      );
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 4: checkNgForTrackBy
 *
 * Warns when *ngFor is used without trackBy function, or when @for is used
 * without track expression. While primarily a performance concern, proper
 * tracking helps maintain focus and state for accessibility.
 *
 * This is a warning-level check, not a strict error.
 *
 * @param {string} html - The Angular template HTML string
 * @returns {{ pass: boolean, issues: string[] }} Result with pass status and issues found
 */
function checkNgForTrackBy(html) {
  const issues = [];

  // Check for *ngFor without trackBy
  // Match *ngFor="let item of items" but not *ngFor="let item of items; trackBy: ..."
  const ngForPattern = /\*ngFor\s*=\s*["']([^"']+)["']/gi;

  let match;
  while ((match = ngForPattern.exec(html)) !== null) {
    const ngForExpression = match[1];

    // Check if trackBy is present in the expression
    const hasTrackBy = /trackBy\s*:/i.test(ngForExpression);

    if (!hasTrackBy) {
      const lineNumber = getLineNumber(html, match.index);
      issues.push(
        `Line ${lineNumber}: *ngFor without trackBy function. ` +
        `Consider adding trackBy to improve performance and maintain element identity for accessibility.`
      );
    }
  }

  // Check for @for without track (Angular 17+ control flow)
  // Match @for (item of items) but ensure track is present
  const atForPattern = /@for\s*\(([^)]+)\)\s*\{/gi;

  while ((match = atForPattern.exec(html)) !== null) {
    const forExpression = match[1];

    // Check if track is present in the expression
    // @for (item of items; track item.id)
    const hasTrack = /;\s*track\s+/i.test(forExpression);

    if (!hasTrack) {
      const lineNumber = getLineNumber(html, match.index);
      issues.push(
        `Line ${lineNumber}: @for without track expression. ` +
        `Add 'track' to maintain element identity (e.g., @for (item of items; track item.id)).`
      );
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 5: checkInnerHtmlUsage
 *
 * Warns about [innerHTML] usage as dynamic HTML content may lack proper
 * accessibility attributes. Dynamically inserted content should be
 * reviewed for heading structure, alt text, ARIA labels, etc.
 *
 * This is a warning-level check to prompt manual review.
 *
 * @param {string} html - The Angular template HTML string
 * @returns {{ pass: boolean, issues: string[] }} Result with pass status and issues found
 */
function checkInnerHtmlUsage(html) {
  const issues = [];

  // Match [innerHTML] bindings
  const innerHtmlPattern = /\[innerHTML\]\s*=\s*["']([^"']+)["']/gi;

  let match;
  while ((match = innerHtmlPattern.exec(html)) !== null) {
    const boundExpression = match[1];
    const lineNumber = getLineNumber(html, match.index);

    issues.push(
      `Line ${lineNumber}: [innerHTML] binding found (${boundExpression}). ` +
      `Dynamic HTML content may lack accessibility features. ` +
      `Ensure injected content has proper headings, alt text, and ARIA attributes.`
    );
  }

  // Also check for [outerHTML] which has similar concerns
  const outerHtmlPattern = /\[outerHTML\]\s*=\s*["']([^"']+)["']/gi;

  while ((match = outerHtmlPattern.exec(html)) !== null) {
    const boundExpression = match[1];
    const lineNumber = getLineNumber(html, match.index);

    issues.push(
      `Line ${lineNumber}: [outerHTML] binding found (${boundExpression}). ` +
      `Dynamic HTML content may lack accessibility features. ` +
      `Ensure injected content has proper headings, alt text, and ARIA attributes.`
    );
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 6: checkAsyncPipeAria
 *
 * Detects {{ value | async }} patterns that update content dynamically
 * and warns if they're not within an aria-live region. Screen reader
 * users need to be notified of content changes.
 *
 * @param {string} html - The Angular template HTML string
 * @returns {{ pass: boolean, issues: string[] }} Result with pass status and issues found
 */
function checkAsyncPipeAria(html) {
  const issues = [];

  // Match async pipe usage in interpolations
  // Handles: {{ value | async }}, {{ value$ | async }}, {{ obj.value | async }}
  const asyncPipePattern = /\{\{\s*([^}|]+)\s*\|\s*async\s*\}\}/gi;

  let match;
  while ((match = asyncPipePattern.exec(html)) !== null) {
    const asyncExpression = match[1].trim();
    const matchIndex = match.index;
    const lineNumber = getLineNumber(html, matchIndex);

    // Look for aria-live in the surrounding context
    // We need to check if this async content is within an aria-live region
    const isInAriaLiveRegion = checkIfInAriaLiveRegion(html, matchIndex);

    // Also check for role="status", role="alert", role="log" which have implicit aria-live
    const isInLiveRole = checkIfInLiveRole(html, matchIndex);

    // Check for Angular CDK live announcer usage (common pattern)
    const hasCdkAriaLive = checkIfHasCdkAriaLive(html, matchIndex);

    if (!isInAriaLiveRegion && !isInLiveRole && !hasCdkAriaLive) {
      issues.push(
        `Line ${lineNumber}: {{ ${asyncExpression} | async }} content may change dynamically. ` +
        `Consider wrapping in an aria-live region to announce updates to screen reader users.`
      );
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the line number for a given index in the HTML string
 *
 * @param {string} html - The full HTML string
 * @param {number} index - The character index
 * @returns {number} The 1-based line number
 */
function getLineNumber(html, index) {
  const upToIndex = html.substring(0, index);
  const lines = upToIndex.split('\n');
  return lines.length;
}

/**
 * Checks if a given position in HTML is within an aria-live region
 *
 * @param {string} html - The full HTML string
 * @param {number} index - The character index to check
 * @returns {boolean} True if within an aria-live region
 */
function checkIfInAriaLiveRegion(html, index) {
  // Look backwards from the index for an opening tag with aria-live
  // and make sure we haven't passed its closing tag
  const beforeContent = html.substring(0, index);

  // Find the most recent aria-live attribute
  const ariaLiveMatches = [...beforeContent.matchAll(/aria-live\s*=\s*["'](?:polite|assertive|off)["']/gi)];

  if (ariaLiveMatches.length === 0) {
    return false;
  }

  // Get the last match (most recent)
  const lastMatch = ariaLiveMatches[ariaLiveMatches.length - 1];

  // Find what element this aria-live belongs to
  const beforeAriaLive = html.substring(0, lastMatch.index);
  const openingTagMatch = beforeAriaLive.match(/<(\w+)[^>]*$/);

  if (!openingTagMatch) {
    return false;
  }

  const tagName = openingTagMatch[1];

  // Check if the closing tag for this element is after our index
  const afterAriaLive = html.substring(lastMatch.index);
  const closingTagPattern = new RegExp(`</${tagName}\\s*>`, 'i');
  const closingMatch = afterAriaLive.match(closingTagPattern);

  if (!closingMatch) {
    // Self-closing or no closing tag found, assume we're inside
    return true;
  }

  const closingTagAbsoluteIndex = lastMatch.index + closingMatch.index;

  return index < closingTagAbsoluteIndex;
}

/**
 * Checks if a given position is within an element with a live role
 * (status, alert, log, marquee, timer - these have implicit aria-live)
 *
 * @param {string} html - The full HTML string
 * @param {number} index - The character index to check
 * @returns {boolean} True if within a live role element
 */
function checkIfInLiveRole(html, index) {
  const beforeContent = html.substring(0, index);

  // Find elements with live roles
  const liveRoleMatches = [...beforeContent.matchAll(/role\s*=\s*["'](status|alert|log|marquee|timer)["']/gi)];

  if (liveRoleMatches.length === 0) {
    return false;
  }

  // Similar logic to aria-live check
  const lastMatch = liveRoleMatches[liveRoleMatches.length - 1];
  const beforeRole = html.substring(0, lastMatch.index);
  const openingTagMatch = beforeRole.match(/<(\w+)[^>]*$/);

  if (!openingTagMatch) {
    return false;
  }

  const tagName = openingTagMatch[1];
  const afterRole = html.substring(lastMatch.index);
  const closingTagPattern = new RegExp(`</${tagName}\\s*>`, 'i');
  const closingMatch = afterRole.match(closingTagPattern);

  if (!closingMatch) {
    return true;
  }

  const closingTagAbsoluteIndex = lastMatch.index + closingMatch.index;

  return index < closingTagAbsoluteIndex;
}

/**
 * Checks if a given position has cdkAriaLive directive nearby
 * (Angular CDK's live announcer directive)
 *
 * @param {string} html - The full HTML string
 * @param {number} index - The character index to check
 * @returns {boolean} True if cdkAriaLive is present in the parent context
 */
function checkIfHasCdkAriaLive(html, index) {
  const beforeContent = html.substring(0, index);

  // Check for cdkAriaLive directive
  const cdkLiveMatches = [...beforeContent.matchAll(/cdkAriaLive|cdk-aria-live|\[cdkAriaLive\]/gi)];

  if (cdkLiveMatches.length === 0) {
    return false;
  }

  // Similar containment check
  const lastMatch = cdkLiveMatches[cdkLiveMatches.length - 1];
  const beforeDirective = html.substring(0, lastMatch.index);
  const openingTagMatch = beforeDirective.match(/<(\w+)[^>]*$/);

  if (!openingTagMatch) {
    return false;
  }

  const tagName = openingTagMatch[1];
  const afterDirective = html.substring(lastMatch.index);
  const closingTagPattern = new RegExp(`</${tagName}\\s*>`, 'i');
  const closingMatch = afterDirective.match(closingTagPattern);

  if (!closingMatch) {
    return true;
  }

  const closingTagAbsoluteIndex = lastMatch.index + closingMatch.index;

  return index < closingTagAbsoluteIndex;
}

// ============================================================================
// Module Exports
// ============================================================================

module.exports = {
  checkClickWithoutKeyboard,
  checkClickWithoutRole,
  checkRouterLinkNames,
  checkNgForTrackBy,
  checkInnerHtmlUsage,
  checkAsyncPipeAria
};
