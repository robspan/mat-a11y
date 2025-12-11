module.exports = {
  name: 'blinkElement',
  description: 'The deprecated <blink> element can trigger seizures and should not be used',
  tier: 'enhanced',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];
    const lines = content.split('\n');

    // Match blink elements (opening tag, including self-closing)
    const blinkRegex = /<blink\b[^>]*\/?>/gi;

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const matches = line.match(blinkRegex);

      if (matches) {
        matches.forEach(match => {
          issues.push(
            `Line ${lineNumber}: Found <blink> element. ` +
            `The <blink> element is deprecated, inaccessible, and can trigger seizures in users with photosensitive epilepsy. ` +
            `This violates WCAG 2.3.1 (Three Flashes or Below Threshold). ` +
            `FIX: Remove the <blink> element entirely. If you need to emphasize text, use <strong>, <em>, or CSS styles instead.`
          );
        });
      }
    });

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
