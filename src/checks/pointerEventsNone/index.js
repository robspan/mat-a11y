module.exports = {
  name: 'pointerEventsNone',
  description: 'Detects pointer-events: none on interactive elements which makes them unusable for mouse/touch users',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    const issues = [];

    // Interactive elements that should not have pointer-events: none
    const interactiveElements = [
      '(?:^|[\\s,>+~])button(?![a-z-])',
      '(?:^|[\\s,>+~])a(?![a-z-])',  // 'a' tag only, not words containing 'a'
      '(?:^|[\\s,>+~])input(?![a-z-])',
      '(?:^|[\\s,>+~])select(?![a-z-])',
      '(?:^|[\\s,>+~])textarea(?![a-z-])',
      '\\.btn(?![a-z])',
      '\\.button(?![a-z])',
      '\\.link(?![a-z])',
      '\\[role=["\']?button["\']?\\]',
      '\\[role=["\']?link["\']?\\]',
      '\\[tabindex\\]'
    ];

    // Check each interactive element for pointer-events: none
    interactiveElements.forEach((element) => {
      const pattern = new RegExp(
        `${element}[^{]*\\{[^}]*pointer-events\\s*:\\s*none[^}]*\\}`,
        'gi'
      );

      const matches = content.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          // Extract selector
          const selectorMatch = match.match(/^([^{]+)\{/);
          const selector = selectorMatch ? selectorMatch[1].trim() : element;

          issues.push(
            `"pointer-events: none" found on interactive element "${selector}". ` +
            `This makes the element unclickable/untappable while it may still be focusable via keyboard, ` +
            `creating an inconsistent and confusing experience. If the element should be disabled, ` +
            `use the "disabled" attribute instead, or ensure the element is also removed from tab order.`
          );
        });
      }
    });

    // Also check for pointer-events: none on elements with :hover or :focus (indicates interactivity expected)
    const interactiveStatePattern = /[^{]+:(hover|focus|active)[^{]*\{[^}]*pointer-events\s*:\s*none[^}]*\}/gi;
    const stateMatches = content.match(interactiveStatePattern);

    if (stateMatches) {
      stateMatches.forEach((match) => {
        const selectorMatch = match.match(/^([^{]+)\{/);
        const selector = selectorMatch ? selectorMatch[1].trim() : 'element with interactive state';

        // Avoid duplicate issues
        const alreadyReported = issues.some(issue => issue.includes(selector.split(':')[0].trim()));
        if (!alreadyReported) {
          issues.push(
            `"pointer-events: none" found on "${selector}" which has interactive states defined. ` +
            `This creates a contradiction - the element appears interactive but cannot be clicked.`
          );
        }
      });
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
