module.exports = {
  name: 'contentOverflow',
  description: 'Detects overflow: hidden on text containers without text-overflow: ellipsis which may hide content inaccessibly',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    const issues = [];

    // Pattern to find rule blocks with overflow: hidden
    // We need to capture the full block to check for text-overflow
    const ruleBlockPattern = /([\w\s.#\[\]='"~^$*|&>:+-]+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;

    let match;

    while ((match = ruleBlockPattern.exec(content)) !== null) {
      const selector = match[1].trim();
      const declarations = match[2];

      // Check if this block has overflow: hidden
      const hasOverflowHidden = /overflow\s*:\s*hidden/i.test(declarations);

      if (hasOverflowHidden) {
        // Check if it also has text-overflow: ellipsis
        const hasTextOverflow = /text-overflow\s*:\s*ellipsis/i.test(declarations);

        // Check if it has white-space: nowrap (common pattern with ellipsis)
        const hasWhiteSpaceNowrap = /white-space\s*:\s*nowrap/i.test(declarations);

        // Check if this seems like a text container
        // (not an image container, not a scroll container for x/y specific)
        const isLikelyTextContainer = !/(img|image|icon|scroll|overflow-[xy])/i.test(selector) &&
                                      !/overflow-[xy]\s*:/i.test(declarations);

        // If it has nowrap but no ellipsis, text will be cut off
        if (hasWhiteSpaceNowrap && !hasTextOverflow && isLikelyTextContainer) {
          issues.push(
            `[Warning] "${selector}" has "overflow: hidden" with "white-space: nowrap" but no "text-overflow: ellipsis". ` +
            `Text may be cut off without any indication. Consider adding "text-overflow: ellipsis" or removing overflow: hidden.`
          );
        } else if (!hasTextOverflow && isLikelyTextContainer && !hasWhiteSpaceNowrap) {
          // General warning for overflow hidden on potential text containers
          issues.push(
            `[Info] "${selector}" has "overflow: hidden" which may hide text content inaccessibly. ` +
            `Ensure this is intentional and users can still access all content.`
          );
        }
      }
    }

    return {
      pass: issues.filter(i => i.startsWith('[Warning]')).length === 0,
      issues
    };
  }
};
