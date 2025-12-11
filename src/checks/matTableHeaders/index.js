module.exports = {
  name: 'matTableHeaders',
  description: 'Check that mat-table has mat-header-row for screen reader accessibility',
  tier: 'enhanced',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];

    // Pattern to match mat-table elements
    const matTableElementRegex = /<mat-table([^>]*)>([\s\S]*?)<\/mat-table>/gi;

    // Pattern to match elements with mat-table attribute/directive
    const matTableAttrRegex = /<table[^>]*\bmat-table\b[^>]*>([\s\S]*?)<\/table>/gi;

    let match;

    // Check <mat-table> elements
    while ((match = matTableElementRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const tableContent = match[2] || '';

      // Check for mat-header-row in content
      // Can be <mat-header-row> element or [mat-header-row] attribute
      const hasHeaderRow = /<mat-header-row/i.test(tableContent) || /\bmat-header-row\b/i.test(tableContent);

      if (!hasHeaderRow) {
        const snippet = fullMatch.length > 100 ? fullMatch.substring(0, 100) + '...' : fullMatch;
        issues.push(
          `<mat-table> missing <mat-header-row>. Tables must have header rows for ` +
          `screen readers to understand the table structure. Found: ${snippet}`
        );
      }
    }

    // Check <table mat-table> elements
    while ((match = matTableAttrRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const tableContent = match[1] || '';

      // Check for mat-header-row or tr with mat-header-row attribute
      const hasHeaderRow = /<mat-header-row/i.test(tableContent) ||
                           /\bmat-header-row\b/i.test(tableContent) ||
                           /<tr[^>]*mat-header-row/i.test(tableContent);

      if (!hasHeaderRow) {
        const snippet = fullMatch.length > 100 ? fullMatch.substring(0, 100) + '...' : fullMatch;
        issues.push(
          `<table mat-table> missing header row. Add <tr mat-header-row> or ` +
          `<mat-header-row> for screen readers to understand the table structure. Found: ${snippet}`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
