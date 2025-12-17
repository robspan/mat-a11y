const { format } = require('../core/errors');

module.exports = {
  name: 'emptyTableHeader',
  description: 'Table header elements must have accessible text content',
  tier: 'full',
  type: 'html',
  weight: 7,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/<th/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Pattern to match <th> elements and capture their content
    // Handles attributes and nested content
    const thPattern = /<th(\s[^>]*)?>([^<]*(?:<(?!\/th>)[^<]*)*)<\/th>/gi;
    let match;

    while ((match = thPattern.exec(content)) !== null) {
      elementsFound++;
      const attributes = match[1] || '';
      const thContent = match[2] || '';

      // Check if th has aria-label attribute (acceptable alternative)
      const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attributes);

      // Check if th has aria-labelledby attribute
      const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes);

      // Check if content is empty or only whitespace
      const trimmedContent = thContent.replace(/<[^>]*>/g, '').trim();
      const hasVisibleContent = trimmedContent.length > 0;

      // Check for visually hidden text (common pattern)
      const hasScreenReaderText = /<span[^>]*class\s*=\s*["'][^"']*(?:sr-only|visually-hidden|screen-reader|cdk-visually-hidden)[^"']*["'][^>]*>[^<]+<\/span>/i.test(thContent);

      // Check if child elements have aria-label (e.g., mat-checkbox with aria-label)
      const hasChildAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(thContent);

      // Check for abbr attribute on th
      const hasAbbr = /\babbr\s*=\s*["'][^"']+["']/i.test(attributes);

      // Check for Angular bindings that provide content dynamically
      // [innerText], [textContent], [innerHTML] with binding
      const hasAngularContentBinding = /\[(?:innerText|textContent|innerHTML)\]\s*=\s*(?:"[^"]+"|'[^']+')/i.test(attributes);

      // Check for Angular interpolation that provides text content
      const hasInterpolation = /\{\{[^}]+\}\}/.test(thContent);

      if (!hasVisibleContent && !hasAriaLabel && !hasAriaLabelledby && !hasScreenReaderText && !hasChildAriaLabel && !hasAbbr && !hasAngularContentBinding && !hasInterpolation) {
        issues.push(format('TABLE_EMPTY_HEADER', { element: '<th>' }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
