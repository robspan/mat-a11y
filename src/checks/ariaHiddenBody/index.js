module.exports = {
  name: 'ariaHiddenBody',
  description: 'Body element does not have aria-hidden="true"',
  tier: 'basic',
  type: 'html',
  weight: 10,

  check(content) {
    const issues = [];

    if (/<body[^>]*aria-hidden=["']true["']/i.test(content)) {
      issues.push('aria-hidden="true" on <body> hides all content from assistive technology');
    }

    return { pass: issues.length === 0, issues };
  }
};
