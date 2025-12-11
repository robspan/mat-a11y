module.exports = {
  name: 'iframeTitles',
  description: 'Iframes have title or aria-label',
  tier: 'basic',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];
    const iframeRegex = /<iframe[^>]*>/gi;
    const iframes = content.match(iframeRegex) || [];

    for (const iframe of iframes) {
      const hasTitle = /\btitle=/i.test(iframe) || /\[title\]=/i.test(iframe);
      const hasAriaLabel = /aria-label=/i.test(iframe);
      const hasAriaLabelledBy = /aria-labelledby=/i.test(iframe);

      if (!hasTitle && !hasAriaLabel && !hasAriaLabelledBy) {
        issues.push('<iframe> missing title attribute');
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
