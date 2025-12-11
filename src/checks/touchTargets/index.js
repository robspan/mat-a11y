module.exports = {
  name: 'touchTargets',
  description: 'Check interactive elements meet minimum 44x44px target size (WCAG 2.5.5)',
  tier: 'basic',
  type: 'scss',
  weight: 7,

  check(content) {
    const issues = [];

    // Interactive element selectors to check
    const interactiveSelectors = [
      'button',
      '\\.btn',
      '\\.chip',
      '\\.toggle',
      '\\.icon-btn',
      '\\.icon-button',
      '\\.fab',
      'a\\[',            // links with attributes (usually interactive)
      'input\\[type=',
      '\\.clickable',
      '\\.tappable'
    ];

    // Build pattern to find interactive element rule blocks
    const selectorPattern = new RegExp(
      `(${interactiveSelectors.join('|')})[^{]*\\{([^}]*)\\}`,
      'gi'
    );

    // Minimum touch target size per WCAG 2.5.5 is 44x44px
    // WCAG 2.5.8 (AAA) recommends 44x44px, while 2.5.5 (AA) allows 24x24px minimum
    const minSize = 44;
    const minSizeRem = 2.75; // 44px / 16px

    let match;
    while ((match = selectorPattern.exec(content)) !== null) {
      const fullMatch = match[0];
      const selector = match[1].replace(/\\/g, '');
      const ruleBlock = match[2];

      // Check for explicit small sizes that violate touch target guidelines
      const heightMatch = ruleBlock.match(/(?:^|[^-])height\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/i);
      const widthMatch = ruleBlock.match(/(?:^|[^-])width\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/i);
      const minHeightMatch = ruleBlock.match(/min-height\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/i);
      const minWidthMatch = ruleBlock.match(/min-width\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/i);

      // Helper to convert to pixels for comparison
      const toPixels = (value, unit) => {
        const num = parseFloat(value);
        if (unit === 'rem' || unit === 'em') return num * 16;
        return num;
      };

      // Check for explicitly small heights (below 44px)
      if (heightMatch) {
        const heightPx = toPixels(heightMatch[1], heightMatch[2]);
        if (heightPx < minSize && heightPx > 0) {
          // Check if min-height compensates
          if (!minHeightMatch || toPixels(minHeightMatch[1], minHeightMatch[2]) < minSize) {
            issues.push(
              `Touch target too small: "${selector}" has height: ${heightMatch[1]}${heightMatch[2]} (${Math.round(heightPx)}px). ` +
              `WCAG 2.5.5 requires minimum 44x44px touch targets. ` +
              `Fix: Add min-height: 44px or min-height: 2.75rem to ensure adequate touch target size.`
            );
          }
        }
      }

      // Check for explicitly small widths
      if (widthMatch) {
        const widthPx = toPixels(widthMatch[1], widthMatch[2]);
        if (widthPx < minSize && widthPx > 0) {
          // Check if min-width compensates
          if (!minWidthMatch || toPixels(minWidthMatch[1], minWidthMatch[2]) < minSize) {
            issues.push(
              `Touch target too small: "${selector}" has width: ${widthMatch[1]}${widthMatch[2]} (${Math.round(widthPx)}px). ` +
              `WCAG 2.5.5 requires minimum 44x44px touch targets. ` +
              `Fix: Add min-width: 44px or min-width: 2.75rem to ensure adequate touch target size.`
            );
          }
        }
      }

      // Check for small min-height/min-width values
      if (minHeightMatch && !heightMatch) {
        const minHeightPx = toPixels(minHeightMatch[1], minHeightMatch[2]);
        if (minHeightPx < minSize && minHeightPx > 0) {
          issues.push(
            `Touch target may be too small: "${selector}" has min-height: ${minHeightMatch[1]}${minHeightMatch[2]} (${Math.round(minHeightPx)}px). ` +
            `WCAG 2.5.5 recommends minimum 44px. ` +
            `Fix: Increase min-height to at least 44px (2.75rem).`
          );
        }
      }

      if (minWidthMatch && !widthMatch) {
        const minWidthPx = toPixels(minWidthMatch[1], minWidthMatch[2]);
        if (minWidthPx < minSize && minWidthPx > 0) {
          issues.push(
            `Touch target may be too small: "${selector}" has min-width: ${minWidthMatch[1]}${minWidthMatch[2]} (${Math.round(minWidthPx)}px). ` +
            `WCAG 2.5.5 recommends minimum 44px. ` +
            `Fix: Increase min-width to at least 44px (2.75rem).`
          );
        }
      }

      // Check for font-size based icon buttons without adequate sizing
      const fontSizeMatch = ruleBlock.match(/font-size\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/i);
      if (fontSizeMatch && /icon/i.test(selector)) {
        const fontSizePx = toPixels(fontSizeMatch[1], fontSizeMatch[2]);
        // Icon buttons often only rely on font-size, check if there's adequate padding or min-size
        const hasPadding = /padding\s*:/i.test(ruleBlock);
        const hasMinSize = minHeightMatch || minWidthMatch;

        if (fontSizePx < 24 && !hasPadding && !hasMinSize) {
          issues.push(
            `Icon button "${selector}" may have inadequate touch target. Font-size: ${fontSizeMatch[1]}${fontSizeMatch[2]}. ` +
            `Fix: Add padding or min-width/min-height to ensure 44x44px touch area.`
          );
        }
      }
    }

    // Also check for line-height on inline interactive elements that might constrain height
    const lineHeightPattern = /(a|button|\.btn|\.link)[^{]*\{[^}]*line-height\s*:\s*(\d+(?:\.\d+)?)(px)?[^}]*\}/gi;
    let lineHeightMatch;
    while ((lineHeightMatch = lineHeightPattern.exec(content)) !== null) {
      const selector = lineHeightMatch[1];
      const lineHeightValue = parseFloat(lineHeightMatch[2]);
      const unit = lineHeightMatch[3] || '';

      // Only flag if it's a pixel value less than minimum
      if (unit === 'px' && lineHeightValue < minSize && lineHeightValue > 0) {
        issues.push(
          `Interactive element "${selector}" has constrained line-height: ${lineHeightValue}px. ` +
          `This may result in touch targets smaller than 44px. ` +
          `Fix: Ensure adequate padding or min-height to meet WCAG 2.5.5 requirements.`
        );
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
