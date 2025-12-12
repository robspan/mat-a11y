const { format } = require('../../core/errors');

module.exports = {
  name: 'skipLink',
  description: 'Pages with navigation should have skip links for keyboard users',
  tier: 'full',  // Changed from material - skip links are typically at app level, not component level
  type: 'html',
  weight: 2,  // Lower weight - usually handled at app level
  wcag: '2.4.1',

  check(content, filePath = '') {
    const issues = [];

    // Skip link check only applies to page-level templates, not components
    // Components have <nav> or <header> but skip links should be in the main app template
    // If filePath is empty (self-test mode), run the check based on content
    if (filePath) {
      const isComponentFile = /\.component\.html$/i.test(filePath) &&
                              !/app\.component|page|layout/i.test(filePath);

      // If this is a component file, skip the check entirely
      // Skip links are an app-level concern, not a component concern
      if (isComponentFile) {
        return { pass: true, issues: [] };
      }
    }

    // Common skip link href patterns (targeting main content)
    const skipLinkPatterns = [
      /#main\b/i,
      /#content\b/i,
      /#main-content\b/i,
      /#maincontent\b/i,
      /#main_content\b/i,
      /#skip\b/i,
      /#skip-nav\b/i,
      /#skip-navigation\b/i,
      /#skip-to-content\b/i,
      /#skip-to-main\b/i,
      /#skip-link\b/i,
      /#skiplink\b/i,
      /#page-content\b/i,
      /#primary\b/i,
      /#article\b/i
    ];

    // Common skip link text patterns (case insensitive)
    const skipLinkTextPatterns = [
      /skip\s*(to\s*)?(main\s*)?(content|navigation)/i,
      /go\s*to\s*(main\s*)?content/i,
      /jump\s*to\s*(main\s*)?content/i,
      /zum\s*(haupt)?inhalt/i,           // German: "to main content"
      /navigation\s*überspringen/i        // German: "skip navigation"
    ];

    // Find all anchor links with their full tag content
    const linkRegex = /<a\s+[^>]*href\s*=\s*["']([^"']*)["'][^>]*>([^<]*)</gi;
    let linkMatch;
    let foundSkipLink = false;
    let skipLinkHref = '';
    let skipLinkTag = '';

    while ((linkMatch = linkRegex.exec(content)) !== null) {
      const href = linkMatch[1];
      const linkText = linkMatch[2].trim();

      // Check if this link matches skip link patterns (by href or text)
      let isSkipLink = false;

      for (const pattern of skipLinkPatterns) {
        if (pattern.test(href)) {
          isSkipLink = true;
          break;
        }
      }

      if (!isSkipLink) {
        for (const pattern of skipLinkTextPatterns) {
          if (pattern.test(linkText)) {
            isSkipLink = true;
            break;
          }
        }
      }

      if (isSkipLink) {
        foundSkipLink = true;
        skipLinkHref = href;
        skipLinkTag = linkMatch[0];
        break;
      }
    }

    // Check if page has substantial navigation that would benefit from skip link
    // Only check for actual page templates with significant navigation
    const hasNavigation = /<nav\b/i.test(content);
    const hasHeader = /<header\b/i.test(content);
    const hasMultipleNavLinks = (content.match(/<a\s+[^>]*href/gi) || []).length >= 10;  // Increased threshold
    const hasRouterOutlet = /<router-outlet/i.test(content);  // App-level indicator

    // Only flag if this looks like a main app template and has no skip link
    if (!foundSkipLink && hasRouterOutlet && (hasNavigation || (hasHeader && hasMultipleNavLinks))) {
      issues.push(format('SKIP_LINK_MISSING', {
        element: '<nav> or <header> without skip link'
      }));
    }

    // Check if skip link target exists (if we found a skip link with internal anchor)
    if (foundSkipLink && skipLinkHref.startsWith('#') && skipLinkHref.length > 1) {
      const targetId = skipLinkHref.substring(1);
      const targetPattern = new RegExp(`id\\s*=\\s*["']${targetId}["']`, 'i');
      if (!targetPattern.test(content)) {
        issues.push(
          `[Warning] Skip link target "${skipLinkHref}" not found in this file (may be in another template)\n` +
          `  How to fix:\n` +
          `    - Add id="${targetId}" to the main content element\n` +
          `    - Typically add to <main id="${targetId}">\n` +
          `  WCAG 2.4.1: Bypass Blocks | See: https://www.w3.org/WAI/WCAG21/Techniques/general/G1\n` +
          `  Found: ${skipLinkTag}`
        );
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
