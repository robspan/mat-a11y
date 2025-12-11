module.exports = {
  name: 'visibilityHiddenUsage',
  description: 'Identifies usage of visibility: hidden and suggests considering aria-hidden for screen reader handling',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    const issues = [];

    // Pattern to find visibility: hidden
    const visibilityHiddenPattern = /visibility\s*:\s*hidden/gi;

    const matches = content.match(visibilityHiddenPattern);

    if (matches && matches.length > 0) {
      // Find the selectors using visibility: hidden
      const selectorPattern = /([^{}]+)\{[^}]*visibility\s*:\s*hidden[^}]*\}/gi;
      const selectorMatches = content.match(selectorPattern);

      if (selectorMatches) {
        // Provide context-aware suggestions
        selectorMatches.forEach((match) => {
          const selectorMatch = match.match(/^([^{]+)\{/);
          const selector = selectorMatch ? selectorMatch[1].trim() : 'unknown';

          // Check if it's used for animation/transition (common valid use case)
          const isForAnimation = /transition|animation/i.test(match);

          // Check if it's a utility/helper class
          const isUtilityClass = /\.(hidden|invisible|visually-hidden|sr-only|screen-reader)/i.test(selector);

          if (isUtilityClass) {
            // This is likely intentional, provide informational message
            issues.push(
              `Info: "visibility: hidden" found in utility class "${selector}". ` +
              `Note that visibility: hidden hides content visually but the element still takes up space. ` +
              `For screen reader hiding, also add aria-hidden="true" in HTML. ` +
              `For completely hiding (no space), use display: none instead.`
            );
          } else if (isForAnimation) {
            // Animation use case is generally okay, but mention it
            issues.push(
              `Info: "visibility: hidden" found on "${selector}" with animation/transition. ` +
              `This is a common pattern for animations. Ensure hidden states are also properly ` +
              `communicated to screen readers with aria-hidden or aria-live regions as appropriate.`
            );
          } else {
            issues.push(
              `"visibility: hidden" found on "${selector}". Consider the following:\n` +
              `  - visibility: hidden hides visually but element takes space and may be announced by some screen readers\n` +
              `  - For complete hiding: use display: none (hides from everyone, no space)\n` +
              `  - For visual-only hiding (keep for screen readers): use .sr-only/visually-hidden pattern\n` +
              `  - For screen reader hiding: add aria-hidden="true" in HTML alongside CSS hiding`
            );
          }
        });
      }
    }

    // Also check for visibility: collapse (similar concerns)
    const visibilityCollapsePattern = /visibility\s*:\s*collapse/gi;
    const collapseMatches = content.match(visibilityCollapsePattern);

    if (collapseMatches && collapseMatches.length > 0) {
      issues.push(
        `Found ${collapseMatches.length} instance(s) of "visibility: collapse". ` +
        `This behaves like "hidden" for most elements (except table rows/columns). ` +
        `Ensure screen reader users are properly informed of collapsed content state.`
      );
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
