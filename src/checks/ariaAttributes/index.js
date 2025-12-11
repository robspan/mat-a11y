// ARIA attributes that accept only true/false
const ARIA_BOOLEAN_ATTRS = [
  'atomic', 'busy', 'disabled', 'expanded', 'hidden', 'modal', 'multiline',
  'multiselectable', 'readonly', 'required', 'selected'
];

// ARIA attributes that accept true/false/mixed
const ARIA_TRISTATE_ATTRS = ['checked', 'pressed'];

module.exports = {
  name: 'ariaAttributes',
  description: 'ARIA attributes have valid values',
  tier: 'basic',
  type: 'html',
  weight: 10,

  check(content) {
    const issues = [];
    const ariaRegex = /aria-([a-z]+)=["']([^"']*)["']/gi;
    let match;

    while ((match = ariaRegex.exec(content)) !== null) {
      const attr = match[1].toLowerCase();
      const value = match[2].toLowerCase();

      // Skip dynamic bindings
      if (value.startsWith('{{') || value.includes('()') || value.startsWith('${')) continue;

      // Boolean attributes
      if (ARIA_BOOLEAN_ATTRS.includes(attr)) {
        if (!['true', 'false'].includes(value)) {
          issues.push(`aria-${attr}="${value}" - must be "true" or "false"`);
        }
      }

      // Tristate attributes
      if (ARIA_TRISTATE_ATTRS.includes(attr)) {
        if (!['true', 'false', 'mixed'].includes(value)) {
          issues.push(`aria-${attr}="${value}" - must be "true", "false", or "mixed"`);
        }
      }

      // aria-live
      if (attr === 'live' && !['off', 'polite', 'assertive'].includes(value)) {
        issues.push(`aria-live="${value}" - must be "off", "polite", or "assertive"`);
      }

      // aria-current
      if (attr === 'current' && !['page', 'step', 'location', 'date', 'time', 'true', 'false'].includes(value)) {
        issues.push(`aria-current="${value}" - invalid value`);
      }

      // aria-haspopup
      if (attr === 'haspopup' && !['true', 'false', 'menu', 'listbox', 'tree', 'grid', 'dialog'].includes(value)) {
        issues.push(`aria-haspopup="${value}" - invalid value`);
      }

      // aria-autocomplete
      if (attr === 'autocomplete' && !['none', 'inline', 'list', 'both'].includes(value)) {
        issues.push(`aria-autocomplete="${value}" - invalid value`);
      }

      // aria-sort
      if (attr === 'sort' && !['none', 'ascending', 'descending', 'other'].includes(value)) {
        issues.push(`aria-sort="${value}" - invalid value`);
      }

      // aria-invalid
      if (attr === 'invalid' && !['true', 'false', 'grammar', 'spelling'].includes(value)) {
        issues.push(`aria-invalid="${value}" - invalid value`);
      }
    }

    return { pass: issues.length === 0, issues };
  },

  ARIA_BOOLEAN_ATTRS,
  ARIA_TRISTATE_ATTRS
};
