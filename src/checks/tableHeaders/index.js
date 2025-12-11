module.exports = {
  name: 'tableHeaders',
  description: 'Data tables have header cells (th elements)',
  tier: 'basic',
  type: 'html',
  weight: 7,

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
        issues.push('Data table missing <th> headers');
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
