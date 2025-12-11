module.exports = {
  name: 'scopeAttrMisuse',
  description: 'The scope attribute is only valid on <th> elements',
  tier: 'full',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];
    const seenElements = new Set();

    // Pattern to find any opening tag with scope attribute
    // Handles: <tag scope="value">, <tag attr scope="value">, <tag\n  scope="value">
    const tagWithScopePattern = /<(\w+)(?:\s[^>]*)?\s+scope\s*=\s*["']([^"']*)["'][^>]*>/gi;
    let match;

    while ((match = tagWithScopePattern.exec(content)) !== null) {
      const fullMatch = match[0];
      const tagName = match[1].toLowerCase();
      const scopeValue = match[2];

      // scope is only valid on <th> elements
      if (tagName !== 'th') {
        // Create unique key to avoid duplicates
        const key = `${tagName}:${match.index}`;
        if (!seenElements.has(key)) {
          seenElements.add(key);

          // Determine the context for better error message
          const validValues = ['row', 'col', 'rowgroup', 'colgroup'];
          const valueInfo = validValues.includes(scopeValue)
            ? ` with value "${scopeValue}"`
            : scopeValue
              ? ` with invalid value "${scopeValue}"`
              : '';

          issues.push(
            `Invalid "scope" attribute on <${tagName}> element${valueInfo}. ` +
            `The scope attribute is only valid on <th> (table header) elements. ` +
            `FIX: Remove the scope attribute from <${tagName}>, or if this should be a header cell, change <${tagName}> to <th>.`
          );
        }
      }
    }

    // Also check for scope as first attribute (edge case)
    const scopeFirstPattern = /<(\w+)\s+scope\s*=\s*["']([^"']*)["']/gi;

    while ((match = scopeFirstPattern.exec(content)) !== null) {
      const tagName = match[1].toLowerCase();
      const scopeValue = match[2];

      if (tagName !== 'th') {
        const key = `${tagName}:${match.index}`;
        if (!seenElements.has(key)) {
          seenElements.add(key);

          issues.push(
            `Invalid "scope" attribute on <${tagName}> element. ` +
            `The scope attribute is only valid on <th> (table header) elements. ` +
            `FIX: Remove the scope attribute from <${tagName}>, or if this should be a header cell, change <${tagName}> to <th>.`
          );
        }
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
