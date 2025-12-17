const { parseColor, getLuminance, getContrastRatio, getContrastRating } = require('../colors');
const { format } = require('../core/errors');
const { resolveValue, containsVariable, isLiteralColor } = require('../core/variableResolver');
const { parseVariables } = require('../core/scssParser');
const { getEffectiveStyles } = require('../core/cssCascade');

// Pre-compiled regex patterns
const EARLY_EXIT_COLOR = /\bcolor\s*:/i;
const EARLY_EXIT_BG = /background/i;
const LIGHT_GRAY = /(?:^|[^-])color\s*:\s*#([cde])\1\1(?![0-9a-f])/gi;
const TRANSPARENT_TEXT = /(?:^|[^-])color\s*:\s*rgba\s*\([^)]*,\s*0\.[0-3]\d*\s*\)/gi;

module.exports = {
  name: 'colorContrast',
  description: 'Detects obvious low-contrast color patterns that fail WCAG requirements',
  tier: 'basic',
  type: 'scss',
  weight: 7,

  /**
   * Check color contrast in SCSS content
   * Uses CSS cascade resolution for accurate light/dark mode checking
   * @param {string} content - SCSS file content
   * @param {object} context - Variable context from variableResolver (optional)
   * @returns {object} - { pass, issues, elementsFound }
   */
  check(content, context = null) {
    // Early exit: no color declarations, no issues
    if (!EARLY_EXIT_COLOR.test(content) || !EARLY_EXIT_BG.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;
    let variablesResolved = 0;
    let variablesSkipped = 0;

    // Parse CSS variables from the content (both light and dark mode)
    const parsed = parseVariables(content, true);

    // Create light mode variable context
    const lightVarContext = context || {
      scssVars: new Map(),
      cssVars: new Map(),
      maps: new Map()
    };

    // Merge parsed CSS variables into light context
    for (const [key, value] of parsed.cssVars) {
      if (!lightVarContext.cssVars.has(key)) {
        lightVarContext.cssVars.set(key, value);
      }
    }

    // Create dark mode context by copying light and overriding with dark values
    const darkVarContext = {
      scssVars: lightVarContext.scssVars,
      cssVars: new Map(lightVarContext.cssVars),
      maps: lightVarContext.maps
    };

    if (parsed.darkCssVars) {
      for (const [key, value] of parsed.darkCssVars) {
        darkVarContext.cssVars.set(key, value);
      }
    }

    const hasDarkMode = parsed.darkCssVars && parsed.darkCssVars.size > 0;

    // Get effective styles using cascade resolution
    const effectiveStyles = getEffectiveStyles(content);
    elementsFound = effectiveStyles.length;

    // Track reported issues to avoid duplicates
    const reportedIssues = new Set();

    // Helper to resolve colors and check contrast
    const checkContrast = (selector, colorVal, bgVal, varCtx, modeName) => {
      let textColor = colorVal;
      let bgColor = bgVal;

      // Resolve variables
      if (containsVariable(textColor)) {
        const resolved = resolveValue(textColor, varCtx);
        if (resolved && isLiteralColor(resolved)) {
          textColor = resolved;
          variablesResolved++;
        } else {
          variablesSkipped++;
          return null;
        }
      }

      if (containsVariable(bgColor)) {
        const resolved = resolveValue(bgColor, varCtx);
        if (resolved && isLiteralColor(resolved)) {
          bgColor = resolved;
          variablesResolved++;
        } else {
          variablesSkipped++;
          return null;
        }
      }

      // Resolve color functions
      if (!isLiteralColor(textColor)) {
        const resolved = resolveValue(textColor, varCtx);
        if (resolved && isLiteralColor(resolved)) {
          textColor = resolved;
          variablesResolved++;
        } else {
          variablesSkipped++;
          return null;
        }
      }

      if (!isLiteralColor(bgColor)) {
        const resolved = resolveValue(bgColor, varCtx);
        if (resolved && isLiteralColor(resolved)) {
          bgColor = resolved;
          variablesResolved++;
        } else {
          variablesSkipped++;
          return null;
        }
      }

      const textRgb = parseColor(textColor);
      const bgRgb = parseColor(bgColor);

      if (!textRgb || !bgRgb) return null;

      const ratio = getContrastRatio(textColor, bgColor);
      if (ratio === null) return null;

      return {
        textColor,
        bgColor,
        ratio,
        mode: modeName
      };
    };

    // Check each selector's effective styles
    for (const style of effectiveStyles) {
      const { selector, light, dark } = style;
      const cleanSelector = selector.replace(/\s+/g, ' ').substring(0, 50);

      let lightResult = null;
      let darkResult = null;

      // Check light mode
      if (light) {
        lightResult = checkContrast(selector, light.color, light.background, lightVarContext, 'light');
      }

      // Check dark mode (only if dark mode vars exist AND no selector-specific override fixed it)
      if (hasDarkMode && dark) {
        darkResult = checkContrast(selector, dark.color, dark.background, darkVarContext, 'dark');
      }

      // Report issues, avoiding duplicates
      const reportIssue = (result, modePrefix) => {
        if (!result || result.ratio >= 4.5) return;

        const issueKey = `${cleanSelector}:${result.textColor}:${result.bgColor}:${modePrefix}`;
        if (reportedIssues.has(issueKey)) return;
        reportedIssues.add(issueKey);

        const element = `${modePrefix}"${cleanSelector}": ${result.textColor} on ${result.bgColor}`;

        if (result.ratio < 3.0) {
          issues.push(format('COLOR_CONTRAST_LOW', {
            ratio: result.ratio.toFixed(2),
            required: '4.5',
            element
          }));
        } else {
          issues.push(format('COLOR_CONTRAST_LARGE_TEXT', {
            ratio: result.ratio.toFixed(2),
            element
          }));
        }
      };

      // If both modes have the same resolved colors, report once without mode prefix
      if (lightResult && darkResult &&
          lightResult.textColor === darkResult.textColor &&
          lightResult.bgColor === darkResult.bgColor) {
        reportIssue(lightResult, '');
      } else {
        // Report separately
        reportIssue(lightResult, '');
        if (darkResult) {
          // Only report dark mode issue if it wasn't fixed by a selector override
          // (dark.hasOverride means there's a .dark-mode selector that set these values)
          if (!dark.hasOverride || darkResult.ratio < 4.5) {
            reportIssue(darkResult, '[dark mode] ');
          }
        }
      }
    }

    // Detect obviously problematic patterns even without pairing
    const seenMessages = new Set();

    // Very light gray text (#ccc, #ddd, #eee) - almost invisible on white
    LIGHT_GRAY.lastIndex = 0;
    let patternMatch;
    while ((patternMatch = LIGHT_GRAY.exec(content)) !== null) {
      const color = patternMatch[0].match(/#[cde]{3}/i)[0];
      const message = format('COLOR_CONTRAST_LOW', { ratio: '1.6', required: '4.5', element: `Very light text color "${color}"` });
      if (!seenMessages.has(message)) {
        seenMessages.add(message);
        issues.push(message);
      }
    }

    // Highly transparent text (opacity below 0.4) - definitely unreadable
    TRANSPARENT_TEXT.lastIndex = 0;
    while ((patternMatch = TRANSPARENT_TEXT.exec(content)) !== null) {
      const colorValue = patternMatch[0].match(/rgba\s*\([^)]+\)/i)[0];
      const message = format('COLOR_TRANSPARENT_TEXT', { element: `"${colorValue}"` });
      if (!seenMessages.has(message)) {
        seenMessages.add(message);
        issues.push(message);
      }
    }

    // Filter: only fail on errors, not info messages
    const errorCount = issues.filter(i => i.startsWith('[Error]')).length;

    return {
      pass: errorCount === 0,
      issues,
      elementsFound,
      variablesResolved,
      variablesSkipped
    };
  }
};
