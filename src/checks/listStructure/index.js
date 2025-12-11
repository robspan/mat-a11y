module.exports = {
  name: 'listStructure',
  description: 'List items are inside proper list containers (ul, ol, menu)',
  tier: 'basic',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];

    // Check for <li> elements
    if (/<li[^>]*>/i.test(content)) {
      const hasProperList = /<(ul|ol|menu)[^>]*>[\s\S]*<li/i.test(content);
      const hasRoleList = /role=["']list["'][\s\S]*<li|role=["']listitem["']/i.test(content);

      if (!hasProperList && !hasRoleList) {
        issues.push('<li> element not inside <ul>, <ol>, or <menu>');
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
