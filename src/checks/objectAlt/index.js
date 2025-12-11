/**
 * Gets the line number for a given index in the HTML string
 */
function getLineNumber(html, index) {
  const upToIndex = html.substring(0, index);
  const lines = upToIndex.split('\n');
  return lines.length;
}

/**
 * Extract the data attribute value from an object tag for context
 */
function getDataValue(obj) {
  const dataMatch = obj.match(/data\s*=\s*["']([^"']*)["']/i);
  return dataMatch ? dataMatch[1] : 'unknown';
}

module.exports = {
  name: 'objectAlt',
  description: 'Object elements have accessible name or fallback content',
  tier: 'basic',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];
    const objectRegex = /<object[^>]*>[\s\S]*?<\/object>/gi;

    let match;
    while ((match = objectRegex.exec(content)) !== null) {
      const obj = match[0];
      const lineNumber = getLineNumber(content, match.index);

      const hasTitle = /\btitle\s*=\s*["'][^"']+["']/i.test(obj);
      const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(obj);
      const hasAriaLabelledBy = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(obj);

      // Check for fallback content (text content between <object> tags)
      const innerContent = obj.replace(/<object[^>]*>|<\/object>/gi, '').trim();
      // Make sure fallback is meaningful (not just whitespace/empty elements)
      const meaningfulFallback = innerContent.replace(/<[^>]*>/g, '').trim().length > 0;

      if (!hasTitle && !hasAriaLabel && !hasAriaLabelledBy && !meaningfulFallback) {
        const dataValue = getDataValue(obj);
        issues.push(
          `Line ${lineNumber}: <object data="${dataValue}"> is missing an accessible name. ` +
          `FIX: Add title="Description of content", aria-label="Description", ` +
          `or provide text fallback content inside the <object> element. ` +
          `Example: <object data="file.pdf" title="Monthly report">Fallback text</object>. ` +
          `See WCAG H53: https://www.w3.org/WAI/WCAG21/Techniques/html/H53`
        );
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
