const { format } = require('../core/errors');

module.exports = {
  name: 'objectAlt',
  description: 'Object elements have accessible name or fallback content',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '1.1.1',

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/<object/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;
    const objectRegex = /<object[^>]*>[\s\S]*?<\/object>/gi;

    let match;
    while ((match = objectRegex.exec(content)) !== null) {
      elementsFound++;
      const obj = match[0];

      // Pattern for quoted values that allows nested quotes of opposite type
      const quotedValue = '(?:"[^"]+"|\'[^\']+\')';
      // Detect static and Angular bound title
      const hasTitle = new RegExp(`(?:\\btitle|\\[title\\])\\s*=\\s*${quotedValue}`, 'i').test(obj);
      // Detect static and Angular bound aria-label
      const hasAriaLabel = new RegExp(`(?:aria-label|\\[aria-label\\]|\\[attr\\.aria-label\\])\\s*=\\s*${quotedValue}`, 'i').test(obj);
      // Detect static and Angular bound aria-labelledby
      const hasAriaLabelledBy = new RegExp(`(?:aria-labelledby|\\[aria-labelledby\\]|\\[attr\\.aria-labelledby\\])\\s*=\\s*${quotedValue}`, 'i').test(obj);

      // Check for fallback content (text content between <object> tags)
      const innerContent = obj.replace(/<object[^>]*>|<\/object>/gi, '').trim();
      // Make sure fallback is meaningful (not just whitespace/empty elements)
      const meaningfulFallback = innerContent.replace(/<[^>]*>/g, '').trim().length > 0;

      if (!hasTitle && !hasAriaLabel && !hasAriaLabelledBy && !meaningfulFallback) {
        // Extract just the opening object tag for the "Found" output
        const openingTag = obj.match(/<object[^>]*>/i)?.[0] || '<object>';
        issues.push(format('OBJECT_MISSING_ALT', { element: openingTag }));
      }
    }

    return { pass: issues.length === 0, issues, elementsFound };
  }
};
