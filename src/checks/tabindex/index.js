module.exports = {
  name: 'tabindex',
  description: 'Tabindex values do not exceed 0 (disrupts natural tab order)',
  tier: 'basic',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];
    const tabindexRegex = /tabindex=["'](\d+)["']/gi;
    let match;

    while ((match = tabindexRegex.exec(content)) !== null) {
      const value = parseInt(match[1]);
      if (value > 0) {
        issues.push(`tabindex="${value}" disrupts natural tab order (use 0 or -1)`);
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
