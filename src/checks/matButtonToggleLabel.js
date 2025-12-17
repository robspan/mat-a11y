const { format } = require('../core/errors');

module.exports = {
  name: 'matButtonToggleLabel',
  description: 'Check that mat-button-toggle-group has aria-label for group context',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/mat-button-toggle/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    /**
     * Helper to check if an element has a valid accessible label
     * Handles both static attributes and Angular property bindings
     * Supports nested quotes (e.g., [attr.aria-label]="'text' | translate")
     */
    function hasAccessibleLabel(attributes) {
      // Pattern for quoted values that allows nested quotes of opposite type
      // "..." allows ' inside, '...' allows " inside
      const quotedValue = '(?:"[^"]+"|\'[^\']+\')';

      // Static aria-label with non-empty value
      const hasStaticAriaLabel = new RegExp(`aria-label\\s*=\\s*${quotedValue}`, 'i').test(attributes);
      // Angular bound aria-label: [aria-label]="..." or [attr.aria-label]="..."
      const hasBoundAriaLabel = new RegExp(`\\[aria-label\\]\\s*=\\s*${quotedValue}`, 'i').test(attributes) ||
                                new RegExp(`\\[attr\\.aria-label\\]\\s*=\\s*${quotedValue}`, 'i').test(attributes);
      // Static aria-labelledby
      const hasStaticAriaLabelledby = new RegExp(`aria-labelledby\\s*=\\s*${quotedValue}`, 'i').test(attributes);
      // Angular bound aria-labelledby
      const hasBoundAriaLabelledby = new RegExp(`\\[aria-labelledby\\]\\s*=\\s*${quotedValue}`, 'i').test(attributes) ||
                                     new RegExp(`\\[attr\\.aria-labelledby\\]\\s*=\\s*${quotedValue}`, 'i').test(attributes);

      return hasStaticAriaLabel || hasBoundAriaLabel || hasStaticAriaLabelledby || hasBoundAriaLabelledby;
    }

    // Match <mat-button-toggle-group> elements
    const matButtonToggleGroupRegex = /<mat-button-toggle-group([^>]*)>/gi;

    let match;
    while ((match = matButtonToggleGroupRegex.exec(content)) !== null) {
      elementsFound++;
      const fullMatch = match[0];
      const attributes = match[1] || '';

      if (!hasAccessibleLabel(attributes)) {
        issues.push(format('MAT_BUTTON_TOGGLE_MISSING_LABEL', { element: fullMatch }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
