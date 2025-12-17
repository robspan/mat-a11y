const { format } = require('../core/errors');

module.exports = {
  name: 'matRadioGroupLabel',
  description: 'Check that mat-radio-group has proper group labeling via aria-label or aria-labelledby',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/mat-radio/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    /**
     * Helper to check if an element has a valid accessible label
     * Handles both static attributes and Angular property bindings
     * Supports nested quotes (e.g., [aria-label]="'text' | translate")
     */
    function hasAccessibleLabel(attributes) {
      // Pattern for quoted values that allows nested quotes of opposite type
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

    // Match <mat-radio-group> elements
    const matRadioGroupRegex = /<mat-radio-group([^>]*)>/gi;

    let match;
    while ((match = matRadioGroupRegex.exec(content)) !== null) {
      elementsFound++;
      const fullMatch = match[0];
      const attributes = match[1] || '';

      if (!hasAccessibleLabel(attributes)) {
        const snippet = fullMatch.length > 80 ? fullMatch.substring(0, 80) + '...' : fullMatch;
        issues.push(format('MAT_RADIO_GROUP_MISSING_LABEL', { element: snippet }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
