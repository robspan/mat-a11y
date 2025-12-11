/**
 * SCSS/CSS Accessibility Checks - Extra Set 2
 *
 * This module provides additional accessibility checks for SCSS/CSS files,
 * focusing on focus states, content overflow, typography, and readability.
 */

/**
 * Check 1: Focus-Within Support
 *
 * Complex interactive components (containers with multiple nested interactive elements)
 * should consider using :focus-within for better keyboard navigation feedback.
 * This is an informational check - it detects patterns that might benefit from :focus-within.
 *
 * @param {string} scss - The SCSS/CSS content to analyze
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and any issues found
 */
function checkFocusWithinSupport(scss) {
  const issues = [];

  // Pattern to detect complex interactive containers
  // These are selectors that contain nested interactive elements (links, buttons, inputs)
  const complexContainerPatterns = [
    // Nav containers with links
    /(?:nav|\.nav[a-z-]*|\.menu[a-z-]*|\.navigation)\s*\{[^}]*\}[\s\S]*?(?:a|button)\s*\{/gi,
    // Card/list item containers with interactive elements
    /(?:\.card[a-z-]*|\.list-item[a-z-]*|\.item[a-z-]*)\s*\{[^}]*\}[\s\S]*?(?:a|button|input)\s*\{/gi,
    // Dropdown containers
    /(?:\.dropdown[a-z-]*|\.select[a-z-]*)\s*\{/gi,
    // Form groups with multiple inputs
    /(?:\.form-group[a-z-]*|\.input-group[a-z-]*|fieldset)\s*\{/gi,
    // Tab containers
    /(?:\.tab[a-z-]*|\.tabs[a-z-]*)\s*\{/gi,
    // Accordion containers
    /(?:\.accordion[a-z-]*|\.collapse[a-z-]*|\.expandable[a-z-]*)\s*\{/gi,
  ];

  // Check if :focus-within is already being used
  const hasFocusWithin = /:focus-within/i.test(scss);

  // Track detected complex patterns
  const detectedPatterns = [];

  for (const pattern of complexContainerPatterns) {
    const matches = scss.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Extract the selector name for reporting
        const selectorMatch = match.match(/(?:nav|\.[\w-]+|fieldset)/i);
        if (selectorMatch) {
          detectedPatterns.push(selectorMatch[0]);
        }
      });
    }
  }

  // Remove duplicates
  const uniquePatterns = [...new Set(detectedPatterns)];

  if (uniquePatterns.length > 0 && !hasFocusWithin) {
    issues.push(
      `[Info] Complex interactive containers detected (${uniquePatterns.slice(0, 3).join(', ')}${uniquePatterns.length > 3 ? '...' : ''}). ` +
      `Consider using :focus-within to provide visual feedback when any child element receives focus.`
    );
  }

  // This is informational, so we pass even if issues are found
  return {
    pass: true,
    issues
  };
}

/**
 * Check 2: Hover Without Focus
 *
 * If :hover styles exist for an element, matching :focus styles should also exist
 * to ensure keyboard users have equivalent visual feedback.
 *
 * @param {string} scss - The SCSS/CSS content to analyze
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and any issues found
 */
function checkHoverWithoutFocus(scss) {
  const issues = [];

  // Pattern to find :hover pseudo-class with its selector
  // Captures the selector before :hover
  const hoverPattern = /([\w\s.#\[\]='"~^$*|-]+):hover\s*\{/g;

  // Find all hover declarations
  const hoverMatches = [];
  let match;

  while ((match = hoverPattern.exec(scss)) !== null) {
    const selector = match[1].trim();
    // Skip if it's already a combined hover/focus rule
    if (!match[0].includes(':focus')) {
      hoverMatches.push({
        selector,
        fullMatch: match[0],
        index: match.index
      });
    }
  }

  // For each hover, check if a corresponding focus exists
  for (const hover of hoverMatches) {
    const selector = hover.selector;

    // Escape special regex characters in the selector
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Check for various focus patterns:
    // 1. selector:focus
    // 2. selector:focus-visible
    // 3. Combined selector:hover, selector:focus (or vice versa)
    // 4. &:focus in nested SCSS (when selector contains &)
    const focusPatterns = [
      new RegExp(`${escapedSelector}\\s*:focus(?:-visible)?\\s*\\{`, 'i'),
      new RegExp(`${escapedSelector}\\s*:hover\\s*,\\s*${escapedSelector}\\s*:focus`, 'i'),
      new RegExp(`${escapedSelector}\\s*:focus\\s*,\\s*${escapedSelector}\\s*:hover`, 'i'),
      new RegExp(`:hover\\s*,\\s*:focus`, 'i'), // Combined pseudo-classes
      new RegExp(`:focus\\s*,\\s*:hover`, 'i'),
    ];

    // Also check for &:focus if we're in SCSS context
    const ampersandFocusPattern = /&:focus(?:-visible)?\s*\{/i;

    // Check if any context around the hover has a corresponding focus
    const contextStart = Math.max(0, hover.index - 500);
    const contextEnd = Math.min(scss.length, hover.index + 500);
    const context = scss.substring(contextStart, contextEnd);

    const hasFocus = focusPatterns.some(pattern => pattern.test(scss)) ||
                     ampersandFocusPattern.test(context);

    if (!hasFocus) {
      issues.push(
        `[Warning] "${selector}:hover" has styles but no corresponding :focus or :focus-visible styles found. ` +
        `Keyboard users should have equivalent visual feedback. Consider adding "${selector}:focus" or combining them.`
      );
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 3: Content Overflow
 *
 * Using overflow: hidden on text containers without text-overflow: ellipsis
 * may hide content inaccessibly, making it impossible for users to access the hidden text.
 *
 * @param {string} scss - The SCSS/CSS content to analyze
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and any issues found
 */
function checkContentOverflow(scss) {
  const issues = [];

  // Pattern to find rule blocks with overflow: hidden
  // We need to capture the full block to check for text-overflow
  const ruleBlockPattern = /([\w\s.#\[\]='"~^$*|&>:+-]+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;

  let match;

  while ((match = ruleBlockPattern.exec(scss)) !== null) {
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

/**
 * Check 4: Small Font Size
 *
 * Font sizes below 12px (or 0.75rem assuming 16px base) can be difficult to read
 * for many users, especially those with visual impairments.
 *
 * @param {string} scss - The SCSS/CSS content to analyze
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and any issues found
 */
function checkSmallFontSize(scss) {
  const issues = [];

  // Pattern to find font-size declarations
  const fontSizePattern = /([\w\s.#\[\]='"~^$*|&>:+-]+)\s*\{[^}]*font-size\s*:\s*([^;}\n]+)/gi;

  let match;

  while ((match = fontSizePattern.exec(scss)) !== null) {
    const selector = match[1].trim();
    const fontSize = match[2].trim();

    let isTooSmall = false;
    let parsedValue = '';

    // Check pixel values
    const pxMatch = fontSize.match(/^(\d+(?:\.\d+)?)\s*px/i);
    if (pxMatch) {
      const pxValue = parseFloat(pxMatch[1]);
      if (pxValue < 12) {
        isTooSmall = true;
        parsedValue = `${pxValue}px`;
      }
    }

    // Check rem values (assuming 16px base)
    const remMatch = fontSize.match(/^(\d+(?:\.\d+)?)\s*rem/i);
    if (remMatch) {
      const remValue = parseFloat(remMatch[1]);
      if (remValue < 0.75) { // 0.75rem = 12px at 16px base
        isTooSmall = true;
        parsedValue = `${remValue}rem (≈${remValue * 16}px)`;
      }
    }

    // Check em values (context-dependent, but warn for very small values)
    const emMatch = fontSize.match(/^(\d+(?:\.\d+)?)\s*em/i);
    if (emMatch) {
      const emValue = parseFloat(emMatch[1]);
      if (emValue < 0.75) {
        isTooSmall = true;
        parsedValue = `${emValue}em`;
      }
    }

    // Check pt values (12px ≈ 9pt)
    const ptMatch = fontSize.match(/^(\d+(?:\.\d+)?)\s*pt/i);
    if (ptMatch) {
      const ptValue = parseFloat(ptMatch[1]);
      if (ptValue < 9) {
        isTooSmall = true;
        parsedValue = `${ptValue}pt`;
      }
    }

    if (isTooSmall) {
      issues.push(
        `[Warning] "${selector}" has a small font-size of ${parsedValue}. ` +
        `Font sizes below 12px may be difficult to read. Consider using at least 12px (0.75rem) for readability.`
      );
    }
  }

  return {
    pass: true, // Warnings don't fail the check
    issues
  };
}

/**
 * Check 5: Line Height Tight
 *
 * Line-height below 1.2 on body text makes content harder to read,
 * especially for users with cognitive disabilities or reading difficulties.
 * WCAG recommends at least 1.5 for body text.
 *
 * @param {string} scss - The SCSS/CSS content to analyze
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and any issues found
 */
function checkLineHeightTight(scss) {
  const issues = [];

  // Pattern to find line-height declarations with their selectors
  const lineHeightPattern = /([\w\s.#\[\]='"~^$*|&>:+-]+)\s*\{[^}]*line-height\s*:\s*([^;}\n]+)/gi;

  // Selectors that typically contain body text
  const bodyTextSelectors = [
    /^body$/i,
    /^p$/i,
    /^\.text/i,
    /^\.content/i,
    /^\.body/i,
    /^\.paragraph/i,
    /^\.description/i,
    /^article/i,
    /^\.article/i,
    /^main/i,
    /^section/i,
  ];

  let match;

  while ((match = lineHeightPattern.exec(scss)) !== null) {
    const selector = match[1].trim();
    const lineHeight = match[2].trim();

    let isTooTight = false;
    let parsedValue = '';

    // Check unitless values (preferred)
    const unitlessMatch = lineHeight.match(/^(\d+(?:\.\d+)?)$/);
    if (unitlessMatch) {
      const value = parseFloat(unitlessMatch[1]);
      if (value < 1.2) {
        isTooTight = true;
        parsedValue = value.toString();
      }
    }

    // Check percentage values
    const percentMatch = lineHeight.match(/^(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch) {
      const value = parseFloat(percentMatch[1]);
      if (value < 120) { // 120% = 1.2
        isTooTight = true;
        parsedValue = `${value}%`;
      }
    }

    // Check for 'normal' keyword - this is fine
    if (/^normal$/i.test(lineHeight)) {
      continue;
    }

    if (isTooTight) {
      // Determine if this is likely body text
      const isBodyText = bodyTextSelectors.some(pattern => pattern.test(selector));

      if (isBodyText) {
        issues.push(
          `[Warning] "${selector}" has line-height: ${parsedValue} which is below the recommended minimum of 1.2. ` +
          `Tight line spacing makes text harder to read. WCAG recommends at least 1.5 for body text.`
        );
      } else {
        issues.push(
          `[Info] "${selector}" has line-height: ${parsedValue}. ` +
          `If this contains readable text, consider increasing to at least 1.2 for better readability.`
        );
      }
    }
  }

  return {
    pass: true, // Warnings don't fail the check
    issues
  };
}

/**
 * Check 6: Text Justify
 *
 * text-align: justify creates uneven spacing between words which can cause
 * readability issues, particularly for users with dyslexia or cognitive disabilities.
 * The irregular white space creates "rivers" of white space that disrupt reading flow.
 *
 * @param {string} scss - The SCSS/CSS content to analyze
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and any issues found
 */
function checkTextJustify(scss) {
  const issues = [];

  // Pattern to find text-align: justify declarations
  const justifyPattern = /([\w\s.#\[\]='"~^$*|&>:+-]+)\s*\{[^}]*text-align\s*:\s*justify/gi;

  let match;

  while ((match = justifyPattern.exec(scss)) !== null) {
    const selector = match[1].trim();

    issues.push(
      `[Warning] "${selector}" uses "text-align: justify" which creates uneven word spacing. ` +
      `This can cause readability issues for users with dyslexia due to "rivers" of white space. ` +
      `Consider using "text-align: left" (or "start") for better readability.`
    );
  }

  return {
    pass: true, // Warnings don't fail the check
    issues
  };
}

// Export all check functions
module.exports = {
  checkFocusWithinSupport,
  checkHoverWithoutFocus,
  checkContentOverflow,
  checkSmallFontSize,
  checkLineHeightTight,
  checkTextJustify
};
