const { format } = require('../../core/errors');

module.exports = {
  name: 'listStructure',
  description: 'List items are inside proper list containers (ul, ol, menu)',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '1.3.1',

  check(content) {
    const issues = [];

    // Check for <li> elements
    if (/<li[^>]*>/i.test(content)) {
      const hasProperList = /<(ul|ol|menu)[^>]*>[\s\S]*<li/i.test(content);
      const hasRoleList = /role=["']list["'][\s\S]*<li|role=["']listitem["']/i.test(content);

      if (!hasProperList && !hasRoleList) {
        issues.push(format('LIST_INVALID_CHILD', { parent: 'ul/ol', element: '<li>' }));
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
