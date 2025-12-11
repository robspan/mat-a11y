/**
 * Gets the line number for a given index in the content string
 */
function getLineNumber(content, index) {
  const upToIndex = content.substring(0, index);
  const lines = upToIndex.split('\n');
  return lines.length;
}

module.exports = {
  name: 'inputImageAlt',
  description: 'Input type="image" elements must have alt text describing their purpose',
  tier: 'enhanced',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];

    // Match input elements with type="image" (including Angular binding [type]="'image'")
    const inputImageRegex = /<input\s+[^>]*(?:type\s*=\s*["']image["']|\[type\]\s*=\s*["']'image'["'])[^>]*>/gi;
    let inputMatch;

    while ((inputMatch = inputImageRegex.exec(content)) !== null) {
      const inputTag = inputMatch[0];
      const lineNumber = getLineNumber(content, inputMatch.index);

      // Check for alt attribute (including Angular binding [alt])
      // For [alt]="expression", we consider it valid if the binding exists
      const altRegex = /\balt\s*=\s*["']([^"']*)["']/i;
      const altBindingRegex = /\[alt\]\s*=\s*["'][^"']+["']/i;
      const altMatch = inputTag.match(altRegex);
      const hasAltBinding = altBindingRegex.test(inputTag);

      // Check for aria-label as an alternative
      const ariaLabelRegex = /\baria-label\s*=\s*["']([^"']*)["']/i;
      const ariaLabelMatch = inputTag.match(ariaLabelRegex);

      // Try to get src for better error message
      const srcRegex = /\bsrc\s*=\s*["']([^"']*)["']/i;
      const srcMatch = inputTag.match(srcRegex);
      const srcInfo = srcMatch ? ` (src="${srcMatch[1]}")` : '';

      if (!altMatch && !hasAltBinding && !ariaLabelMatch) {
        issues.push(
          `Line ${lineNumber}: <input type="image">${srcInfo} is missing accessible name. ` +
          `FIX: Add alt attribute describing the button action (e.g., alt="Submit form" or alt="Search"). ` +
          `The alt text should describe what happens when clicked, not the image itself.`
        );
      } else if (altMatch && !altMatch[1].trim() && !hasAltBinding) {
        issues.push(
          `Line ${lineNumber}: <input type="image">${srcInfo} has an empty alt attribute. ` +
          `FIX: Provide descriptive alt text for the button action. ` +
          `Example: alt="Submit", alt="Search", alt="Go to next page". ` +
          `Avoid generic text like "button" or "image".`
        );
      } else if (ariaLabelMatch && !ariaLabelMatch[1].trim()) {
        issues.push(
          `Line ${lineNumber}: <input type="image">${srcInfo} has an empty aria-label. ` +
          `FIX: Provide descriptive text for the button action in the aria-label attribute.`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
