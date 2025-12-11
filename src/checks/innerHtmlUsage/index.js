/**
 * Gets the line number for a given index in the HTML string
 */
function getLineNumber(html, index) {
  const upToIndex = html.substring(0, index);
  const lines = upToIndex.split('\n');
  return lines.length;
}

/**
 * Checks if an innerHTML expression appears to use sanitization
 */
function isSanitizedExpression(expression) {
  const sanitizationIndicators = [
    /sanitize/i,
    /\bsafe\b/i,
    /\bbypassSecurityTrust/i,
    /DomSanitizer/i,
    /safeHtml/i,
    /trustHtml/i,
    /purify/i,
    /\| safe\b/i,
    /\| safeHtml\b/i,
    /\| bypassSecurity/i,
  ];

  return sanitizationIndicators.some(pattern => pattern.test(expression));
}

/**
 * Checks if this is a user-facing content scenario (higher risk)
 */
function isUserFacingContent(expression) {
  const userContentIndicators = [
    /user/i,
    /comment/i,
    /input/i,
    /message/i,
    /post/i,
    /content/i,
    /html/i,
    /body/i,
    /text/i,
    /description/i,
  ];

  return userContentIndicators.some(pattern => pattern.test(expression));
}

module.exports = {
  name: 'innerHtmlUsage',
  description: 'Dynamic HTML via [innerHTML] may lack accessibility features and pose security risks if not sanitized',
  tier: 'full',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];

    // Match [innerHTML] bindings
    const innerHtmlPattern = /\[innerHTML\]\s*=\s*["']([^"']+)["']/gi;

    let match;
    while ((match = innerHtmlPattern.exec(content)) !== null) {
      const boundExpression = match[1];
      const lineNumber = getLineNumber(content, match.index);
      const isSanitized = isSanitizedExpression(boundExpression);
      const isUserContent = isUserFacingContent(boundExpression);

      if (isSanitized) {
        // Sanitized content - lower severity warning
        issues.push(
          `Line ${lineNumber}: [innerHTML] binding with apparent sanitization (${boundExpression}). ` +
          `[Info] While sanitized, ensure the injected HTML includes: ` +
          `(1) alt text for images, (2) proper heading structure, (3) ARIA labels for interactive elements. ` +
          `Consider using Angular templates instead for better accessibility control.`
        );
      } else if (isUserContent) {
        // User content without apparent sanitization - high severity
        issues.push(
          `Line ${lineNumber}: [innerHTML] binding with user content (${boundExpression}). ` +
          `[Warning] User-generated HTML may lack accessibility features and poses XSS risk. ` +
          `FIX: (1) Use DomSanitizer to sanitize content, (2) Validate HTML structure, ` +
          `(3) Ensure images have alt text, (4) Consider using Angular templates instead.`
        );
      } else {
        // General innerHTML usage
        issues.push(
          `Line ${lineNumber}: [innerHTML] binding found (${boundExpression}). ` +
          `Dynamic HTML content may lack accessibility features. ` +
          `FIX: (1) Ensure injected content has proper headings, alt text, and ARIA attributes, ` +
          `(2) Use Angular's DomSanitizer if content comes from untrusted sources, ` +
          `(3) Consider using structural directives (*ngFor, *ngIf) for dynamic content.`
        );
      }
    }

    // Also check for [outerHTML] which has similar concerns
    const outerHtmlPattern = /\[outerHTML\]\s*=\s*["']([^"']+)["']/gi;

    while ((match = outerHtmlPattern.exec(content)) !== null) {
      const boundExpression = match[1];
      const lineNumber = getLineNumber(content, match.index);

      issues.push(
        `Line ${lineNumber}: [outerHTML] binding found (${boundExpression}). ` +
        `[Warning] outerHTML replaces the entire element and may break accessibility. ` +
        `FIX: Use [innerHTML] instead to preserve the container element, or use Angular templates ` +
        `for dynamic content generation.`
      );
    }

    return { pass: issues.length === 0, issues };
  }
};
