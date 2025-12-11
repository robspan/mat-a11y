module.exports = {
  name: 'linkNames',
  description: 'Links have accessible names',
  tier: 'basic',
  type: 'html',
  weight: 10,

  check(content) {
    const issues = [];
    const linkRegex = /<a[^>]*>[\s\S]*?<\/a>/gi;
    const links = content.match(linkRegex) || [];

    for (const link of links) {
      const hasAriaLabel = /aria-label=/i.test(link);
      const hasAriaLabelledBy = /aria-labelledby=/i.test(link);
      const hasTitle = /\btitle=/i.test(link);

      const textContent = link
        .replace(/<mat-icon[^>]*>[\s\S]*?<\/mat-icon>/gi, '')
        .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\{\{[^}]+\}\}/g, 'TEXT')
        .trim();

      if (!textContent && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
        issues.push('Link without accessible name');
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
