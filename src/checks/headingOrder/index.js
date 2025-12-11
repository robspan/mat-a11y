module.exports = {
  name: 'headingOrder',
  description: 'Heading levels do not skip (no h1 to h3 without h2)',
  tier: 'basic',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];
    const headingRegex = /<h([1-6])[^>]*>/gi;
    const levels = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      levels.push(parseInt(match[1]));
    }

    for (let i = 1; i < levels.length; i++) {
      const prev = levels[i - 1];
      const curr = levels[i];
      if (curr > prev + 1) {
        issues.push(`Heading level skipped: h${prev} -> h${curr}`);
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
