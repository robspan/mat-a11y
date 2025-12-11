const { format } = require('../../core/errors');

module.exports = {
  name: 'tableHeaders',
  description: 'Data tables have header cells (th elements)',
  tier: 'basic',
  type: 'html',
  weight: 7,
  wcag: '1.3.1',

  check(content) {
    const issues = [];

    if (/<table[^>]*>/i.test(content)) {
      // Skip layout tables
      if (/role=["'](presentation|none)["']/i.test(content)) {
        return { pass: true, issues: [] };
      }

      const hasTh = /<th[^>]*>/i.test(content);
      const hasMatTable = /mat-table|matColumnDef/i.test(content);

      if (!hasTh && !hasMatTable) {
        issues.push(format('TABLE_MISSING_HEADERS', {
          element: '<table>'
        }));
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
