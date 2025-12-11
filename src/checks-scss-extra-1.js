/**
 * SCSS/CSS Accessibility Checks - Extra Set 1
 *
 * This module provides additional accessibility checks for SCSS/CSS files,
 * focusing on focus visibility, motion preferences, and interactive element handling.
 */

/**
 * Check 1: checkOutlineNoneWithoutAlt
 *
 * Detects when outline: none or outline: 0 is used without providing
 * an alternative focus indicator (box-shadow, border, or background change).
 *
 * @param {string} scss - The SCSS/CSS content to analyze
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and any issues found
 */
function checkOutlineNoneWithoutAlt(scss) {
  const issues = [];

  // Pattern to find outline: none or outline: 0
  const outlineNonePattern = /outline\s*:\s*(none|0)(\s*!important)?\s*;/gi;

  // Pattern to find :focus pseudo-class with alternative styles
  const focusWithAltPattern = /:focus[^{]*\{[^}]*(box-shadow|border(?!-radius)|background(?!-image|-position|-size|-repeat))[^}]*\}/gi;

  // Pattern to find :focus-visible with alternative styles
  const focusVisibleWithAltPattern = /:focus-visible[^{]*\{[^}]*(box-shadow|border(?!-radius)|background(?!-image|-position|-size|-repeat))[^}]*\}/gi;

  // Find all outline: none occurrences
  const outlineMatches = scss.match(outlineNonePattern);

  if (outlineMatches && outlineMatches.length > 0) {
    // Check if there are alternative focus styles in the file
    const hasFocusAlt = focusWithAltPattern.test(scss);
    const hasFocusVisibleAlt = focusVisibleWithAltPattern.test(scss);

    if (!hasFocusAlt && !hasFocusVisibleAlt) {
      issues.push(
        `Found ${outlineMatches.length} instance(s) of "outline: none" or "outline: 0" without alternative focus styles. ` +
        `Removing the outline without providing an alternative (box-shadow, border, or background change on :focus) ` +
        `makes it impossible for keyboard users to see which element is focused.`
      );
    }
  }

  // Additional check: outline: none directly in :focus rules (worst case)
  const outlineNoneInFocusPattern = /:focus[^{]*\{[^}]*outline\s*:\s*(none|0)[^}]*\}/gi;
  const outlineNoneInFocus = scss.match(outlineNoneInFocusPattern);

  if (outlineNoneInFocus) {
    // Check each match for alternative styles
    outlineNoneInFocus.forEach((match) => {
      const hasAltInSameRule = /box-shadow|border\s*:|background\s*:/i.test(match);
      if (!hasAltInSameRule) {
        issues.push(
          `Found :focus rule with "outline: none/0" but no alternative focus indicator in the same rule. ` +
          `This completely removes focus visibility for keyboard users.`
        );
      }
    });
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 2: checkPrefersReducedMotion
 *
 * Ensures that when animations or transitions are used, there's also
 * a @media (prefers-reduced-motion) query to respect user preferences.
 *
 * @param {string} scss - The SCSS/CSS content to analyze
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and any issues found
 */
function checkPrefersReducedMotion(scss) {
  const issues = [];

  // Patterns to detect animation/transition usage
  const animationPattern = /animation\s*:/gi;
  const animationNamePattern = /animation-name\s*:/gi;
  const transitionPattern = /transition\s*:/gi;
  const keyframesPattern = /@keyframes\s+/gi;

  // Pattern to detect prefers-reduced-motion media query
  const reducedMotionPattern = /@media\s*\([^)]*prefers-reduced-motion[^)]*\)/gi;

  // Check for animation usage
  const hasAnimation = animationPattern.test(scss) ||
                       animationNamePattern.test(scss) ||
                       keyframesPattern.test(scss);

  // Reset regex lastIndex
  animationPattern.lastIndex = 0;
  animationNamePattern.lastIndex = 0;
  keyframesPattern.lastIndex = 0;

  // Check for transition usage (excluding transition: none)
  const transitionMatches = scss.match(transitionPattern);
  const hasTransition = transitionMatches &&
                        transitionMatches.some(match => {
                          // Get the value after the match
                          const idx = scss.indexOf(match);
                          const valueStart = idx + match.length;
                          const valueEnd = scss.indexOf(';', valueStart);
                          const value = scss.substring(valueStart, valueEnd);
                          return !/none/i.test(value);
                        });

  // Check for prefers-reduced-motion
  const hasReducedMotionQuery = reducedMotionPattern.test(scss);

  if ((hasAnimation || hasTransition) && !hasReducedMotionQuery) {
    const motionTypes = [];
    if (hasAnimation) motionTypes.push('animations');
    if (hasTransition) motionTypes.push('transitions');

    issues.push(
      `File uses ${motionTypes.join(' and ')} but does not include a @media (prefers-reduced-motion) query. ` +
      `Users with vestibular disorders or motion sensitivity may experience discomfort. ` +
      `Consider adding: @media (prefers-reduced-motion: reduce) { /* reduce or remove motion */ }`
    );
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 3: checkUserSelectNone
 *
 * Warns when user-select: none is applied to body or large container elements,
 * as this prevents users from selecting and copying text.
 *
 * @param {string} scss - The SCSS/CSS content to analyze
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and any issues found
 */
function checkUserSelectNone(scss) {
  const issues = [];

  // Pattern to find user-select: none on problematic selectors
  // Matches body, html, *, .container, .wrapper, main, article, section, div (as standalone)
  const problematicSelectors = [
    'body',
    'html',
    '\\*',           // Universal selector
    'main',
    'article',
    'section',
    '\\.container',
    '\\.wrapper',
    '\\.content',
    '\\.page',
    '\\.app'
  ];

  // Build pattern to match these selectors with user-select: none
  const selectorPattern = new RegExp(
    `(${problematicSelectors.join('|')})\\s*\\{[^}]*user-select\\s*:\\s*none[^}]*\\}`,
    'gi'
  );

  const matches = scss.match(selectorPattern);

  if (matches) {
    matches.forEach((match) => {
      // Extract the selector from the match
      const selectorMatch = match.match(/^([^{]+)\{/);
      const selector = selectorMatch ? selectorMatch[1].trim() : 'unknown selector';

      issues.push(
        `Warning: "user-select: none" found on "${selector}". ` +
        `Disabling text selection on large containers or the body prevents users from copying text, ` +
        `which is an accessibility barrier for users who rely on copying content for translation, ` +
        `text-to-speech, or note-taking. Consider limiting user-select: none to specific interactive elements only.`
      );
    });
  }

  // Also check for vendor-prefixed versions
  const vendorPrefixedPattern = /(-webkit-|-moz-|-ms-)user-select\s*:\s*none/gi;
  const vendorMatches = scss.match(vendorPrefixedPattern);

  // If we found vendor prefixes but already reported issues, don't double-report
  if (vendorMatches && issues.length === 0) {
    // Check if they're on problematic selectors
    for (const selector of problematicSelectors) {
      const vendorSelectorPattern = new RegExp(
        `${selector}\\s*\\{[^}]*(-webkit-|-moz-|-ms-)user-select\\s*:\\s*none[^}]*\\}`,
        'gi'
      );
      if (vendorSelectorPattern.test(scss)) {
        issues.push(
          `Warning: Vendor-prefixed "user-select: none" found on large container. ` +
          `This may prevent text selection for users who need to copy content.`
        );
        break;
      }
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 4: checkPointerEventsNone
 *
 * Detects pointer-events: none on interactive elements (buttons, links, inputs),
 * which makes them unusable for mouse/touch users while potentially still
 * being in the tab order.
 *
 * @param {string} scss - The SCSS/CSS content to analyze
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and any issues found
 */
function checkPointerEventsNone(scss) {
  const issues = [];

  // Interactive elements that should not have pointer-events: none
  const interactiveElements = [
    'button',
    'a(?!fter|ll|rea)',  // 'a' but not 'after', 'all', 'area' etc.
    'input',
    'select',
    'textarea',
    '\\.btn',
    '\\.button',
    '\\.link',
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

    const matches = scss.match(pattern);
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
  const stateMatches = scss.match(interactiveStatePattern);

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

/**
 * Check 5: checkVisibilityHiddenUsage
 *
 * Identifies usage of visibility: hidden and suggests considering aria-hidden
 * for cases where content should be hidden from screen readers.
 *
 * @param {string} scss - The SCSS/CSS content to analyze
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and any issues found
 */
function checkVisibilityHiddenUsage(scss) {
  const issues = [];

  // Pattern to find visibility: hidden
  const visibilityHiddenPattern = /visibility\s*:\s*hidden/gi;

  const matches = scss.match(visibilityHiddenPattern);

  if (matches && matches.length > 0) {
    // Find the selectors using visibility: hidden
    const selectorPattern = /([^{}]+)\{[^}]*visibility\s*:\s*hidden[^}]*\}/gi;
    const selectorMatches = scss.match(selectorPattern);

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
  const collapseMatches = scss.match(visibilityCollapsePattern);

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

// Export all check functions
module.exports = {
  checkOutlineNoneWithoutAlt,
  checkPrefersReducedMotion,
  checkUserSelectNone,
  checkPointerEventsNone,
  checkVisibilityHiddenUsage
};
