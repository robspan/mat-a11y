'use strict';

/**
 * CSS Cascade Resolver
 *
 * Parses CSS rules and computes effective styles per selector per mode (light/dark).
 * Handles the CSS cascade including:
 * - Base rules
 * - @media (prefers-color-scheme: dark) rules
 * - .dark-mode class-based rules
 * - Specificity-based override resolution
 */

// Context types for rules
const CONTEXT = {
  BASE: 'base',
  DARK_MEDIA: 'dark-media',
  DARK_CLASS: 'dark-class',
  LIGHT_MEDIA: 'light-media'
};

// Patterns to detect dark mode class selectors
const DARK_CLASS_PATTERNS = [
  /\.dark-mode\s+/,
  /body\.dark-mode\s+/,
  /:root\.dark-mode\s+/,
  /html\.dark-mode\s+/,
  /\[data-theme=["']dark["']\]\s+/,
  /\[data-mode=["']dark["']\]\s+/,
  /\.theme-dark\s+/,
  /\.theme--dark\s+/,
  /\.is-dark\s+/
];

// Pattern to match dark mode class at END of selector (self-targeting)
const DARK_CLASS_SELF_PATTERNS = [
  /\.dark-mode$/,
  /\[data-theme=["']dark["']\]$/
];

/**
 * Calculate CSS specificity for a selector
 * Returns a comparable number (higher = more specific)
 * @param {string} selector
 * @returns {number}
 */
function calculateSpecificity(selector) {
  if (!selector) return 0;

  let ids = 0;
  let classes = 0;
  let elements = 0;

  // Count IDs (#id)
  const idMatches = selector.match(/#[\w-]+/g);
  ids = idMatches ? idMatches.length : 0;

  // Count classes, attributes, pseudo-classes (.class, [attr], :pseudo)
  const classMatches = selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+(?:\([^)]*\))?/g);
  classes = classMatches ? classMatches.length : 0;

  // Count elements and pseudo-elements (div, ::before)
  const elemMatches = selector.match(/(?:^|[\s>+~])[\w-]+|::[\w-]+/g);
  elements = elemMatches ? elemMatches.length : 0;

  // Specificity as single number: (ids * 100) + (classes * 10) + elements
  return (ids * 10000) + (classes * 100) + elements;
}

/**
 * Determine the context of a rule based on its selector and location
 * @param {string} selector - The CSS selector
 * @param {boolean} inDarkMedia - Whether the rule is inside @media (prefers-color-scheme: dark)
 * @param {boolean} inLightMedia - Whether the rule is inside @media (prefers-color-scheme: light)
 * @returns {string} - Context type
 */
function determineContext(selector, inDarkMedia, inLightMedia) {
  if (inDarkMedia) return CONTEXT.DARK_MEDIA;
  if (inLightMedia) return CONTEXT.LIGHT_MEDIA;

  // Check if selector contains dark mode class pattern
  for (const pattern of DARK_CLASS_PATTERNS) {
    if (pattern.test(selector)) return CONTEXT.DARK_CLASS;
  }

  // Check for self-targeting dark mode
  for (const pattern of DARK_CLASS_SELF_PATTERNS) {
    if (pattern.test(selector)) return CONTEXT.DARK_CLASS;
  }

  return CONTEXT.BASE;
}

/**
 * Normalize a selector by removing dark mode prefixes
 * This allows matching ".dark-mode .btn" with ".btn"
 * @param {string} selector
 * @returns {string}
 */
function normalizeSelector(selector) {
  let normalized = selector.trim();

  // Remove dark mode prefixes
  normalized = normalized
    .replace(/^\.dark-mode\s+/, '')
    .replace(/^body\.dark-mode\s+/, '')
    .replace(/^:root\.dark-mode\s+/, '')
    .replace(/^html\.dark-mode\s+/, '')
    .replace(/^\[data-theme=["']dark["']\]\s+/, '')
    .replace(/^\[data-mode=["']dark["']\]\s+/, '')
    .replace(/^\.theme-dark\s+/, '')
    .replace(/^\.theme--dark\s+/, '')
    .replace(/^\.is-dark\s+/, '');

  // Remove :not(.light-mode) etc.
  normalized = normalized.replace(/:not\(\.[^)]*\)/g, '');

  return normalized.trim();
}

/**
 * Extract color-related declarations from a CSS declaration block
 * @param {string} declarations - CSS declarations string
 * @returns {object} - { color, background }
 */
function extractColorDeclarations(declarations) {
  const result = { color: null, background: null };

  // Match color property (not background-color, border-color, etc.)
  const colorMatch = declarations.match(/(?:^|;|\s)color\s*:\s*([^;!}]+)/i);
  if (colorMatch) {
    result.color = colorMatch[1].trim();
  }

  // Match background or background-color
  const bgMatch = declarations.match(/background(?:-color)?\s*:\s*([^;!}]+)/i);
  if (bgMatch) {
    let bg = bgMatch[1].trim();
    // Skip gradients and images
    if (!/gradient|url\(/i.test(bg)) {
      result.background = bg;
    }
  }

  return result;
}

/**
 * Parse CSS content into a structured rule map
 * @param {string} content - CSS content
 * @returns {Map} - Map of normalizedSelector → [rules]
 */
function parseRules(content) {
  const ruleMap = new Map();

  if (!content || typeof content !== 'string') {
    return ruleMap;
  }

  // Remove comments
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');

  // First, extract rules from @media (prefers-color-scheme) blocks
  const darkMediaPattern = /@media\s*\([^)]*prefers-color-scheme\s*:\s*dark[^)]*\)\s*\{([\s\S]*?)\}\s*\}/gi;
  const lightMediaPattern = /@media\s*\([^)]*prefers-color-scheme\s*:\s*light[^)]*\)\s*\{([\s\S]*?)\}\s*\}/gi;

  // Track what we've extracted from media queries
  const mediaRanges = [];

  // Extract dark media rules
  let match;
  while ((match = darkMediaPattern.exec(content)) !== null) {
    const mediaContent = match[1];
    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;
    mediaRanges.push({ start: startIndex, end: endIndex });

    extractRulesFromBlock(mediaContent, ruleMap, true, false);
  }

  // Extract light media rules
  while ((match = lightMediaPattern.exec(content)) !== null) {
    const mediaContent = match[1];
    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;
    mediaRanges.push({ start: startIndex, end: endIndex });

    extractRulesFromBlock(mediaContent, ruleMap, false, true);
  }

  // Remove media query blocks from content for base rule extraction
  let baseContent = content;
  // Sort ranges in reverse order to remove from end first
  mediaRanges.sort((a, b) => b.start - a.start);
  for (const range of mediaRanges) {
    baseContent = baseContent.substring(0, range.start) + baseContent.substring(range.end);
  }

  // Extract base rules (not in media queries)
  extractRulesFromBlock(baseContent, ruleMap, false, false);

  return ruleMap;
}

/**
 * Extract rules from a CSS block and add to rule map
 * @param {string} content - CSS content block
 * @param {Map} ruleMap - Map to add rules to
 * @param {boolean} inDarkMedia - Whether inside dark media query
 * @param {boolean} inLightMedia - Whether inside light media query
 */
function extractRulesFromBlock(content, ruleMap, inDarkMedia, inLightMedia) {
  // Match CSS rules: selector { declarations }
  // This pattern handles nested braces in declarations (like calc())
  const rulePattern = /([^{}]+)\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;

  let match;
  while ((match = rulePattern.exec(content)) !== null) {
    const selectorGroup = match[1].trim();
    const declarations = match[2];

    // Skip @-rules that got through
    if (selectorGroup.startsWith('@')) continue;

    // Handle selector groups (comma-separated)
    const selectors = selectorGroup.split(',').map(s => s.trim()).filter(Boolean);

    for (const selector of selectors) {
      // Skip empty or invalid selectors
      if (!selector || selector.includes('@')) continue;

      const colorDecls = extractColorDeclarations(declarations);

      // Only track rules with color-related properties
      if (!colorDecls.color && !colorDecls.background) continue;

      const context = determineContext(selector, inDarkMedia, inLightMedia);
      const normalized = normalizeSelector(selector);
      const specificity = calculateSpecificity(selector);

      const rule = {
        selector: selector,
        normalized: normalized,
        declarations: colorDecls,
        context: context,
        specificity: specificity
      };

      if (!ruleMap.has(normalized)) {
        ruleMap.set(normalized, []);
      }
      ruleMap.get(normalized).push(rule);
    }
  }
}

/**
 * Compute effective style for a selector in a specific mode
 * @param {Array} rules - Array of rules for this selector
 * @param {string} mode - 'light' or 'dark'
 * @returns {object} - { color, background, hasOverride }
 */
function computeEffectiveStyle(rules, mode) {
  // Filter rules applicable to this mode
  let applicableRules;

  if (mode === 'light') {
    applicableRules = rules.filter(r =>
      r.context === CONTEXT.BASE || r.context === CONTEXT.LIGHT_MEDIA
    );
  } else {
    applicableRules = rules.filter(r =>
      r.context === CONTEXT.BASE ||
      r.context === CONTEXT.DARK_MEDIA ||
      r.context === CONTEXT.DARK_CLASS
    );
  }

  if (applicableRules.length === 0) {
    return null;
  }

  // Sort by specificity (ascending, so later ones override)
  applicableRules.sort((a, b) => a.specificity - b.specificity);

  // Merge declarations (later overrides earlier)
  const effective = { color: null, background: null };
  let hasOverride = false;

  for (const rule of applicableRules) {
    if (rule.declarations.color !== null) {
      effective.color = rule.declarations.color;
      if (mode === 'dark' && (rule.context === CONTEXT.DARK_MEDIA || rule.context === CONTEXT.DARK_CLASS)) {
        hasOverride = true;
      }
    }
    if (rule.declarations.background !== null) {
      effective.background = rule.declarations.background;
      if (mode === 'dark' && (rule.context === CONTEXT.DARK_MEDIA || rule.context === CONTEXT.DARK_CLASS)) {
        hasOverride = true;
      }
    }
  }

  return { ...effective, hasOverride };
}

/**
 * Get all selectors with their effective styles in both modes
 * @param {string} content - CSS content
 * @returns {Array} - Array of { selector, light: { color, bg }, dark: { color, bg } }
 */
function getEffectiveStyles(content) {
  const ruleMap = parseRules(content);
  const results = [];

  for (const [selector, rules] of ruleMap) {
    const lightStyle = computeEffectiveStyle(rules, 'light');
    const darkStyle = computeEffectiveStyle(rules, 'dark');

    // Only include if at least one mode has both color and background
    const lightComplete = lightStyle && lightStyle.color && lightStyle.background;
    const darkComplete = darkStyle && darkStyle.color && darkStyle.background;

    if (lightComplete || darkComplete) {
      results.push({
        selector: selector,
        light: lightComplete ? {
          color: lightStyle.color,
          background: lightStyle.background
        } : null,
        dark: darkComplete ? {
          color: darkStyle.color,
          background: darkStyle.background,
          hasOverride: darkStyle.hasOverride
        } : null
      });
    }
  }

  return results;
}

module.exports = {
  parseRules,
  computeEffectiveStyle,
  getEffectiveStyles,
  calculateSpecificity,
  normalizeSelector,
  extractColorDeclarations,
  CONTEXT
};
