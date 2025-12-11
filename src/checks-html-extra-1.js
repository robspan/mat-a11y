/**
 * Additional HTML Accessibility Checks - Part 1
 *
 * This module contains 7 accessibility checks for HTML documents:
 * 1. checkHtmlHasLang - Validates lang attribute on <html> element
 * 2. checkMetaViewport - Ensures viewport allows user zooming
 * 3. checkSkipLink - Checks for skip navigation links
 * 4. checkInputImageAlt - Validates alt on input type="image"
 * 5. checkAutoplayMedia - Checks autoplay media has controls/muted
 * 6. checkMarqueeElement - Detects deprecated <marquee> element
 * 7. checkBlinkElement - Detects deprecated <blink> element
 */

/**
 * Check 1: HTML element must have a valid lang attribute
 *
 * The lang attribute helps screen readers determine the correct pronunciation
 * and helps translation tools work correctly.
 *
 * @param {string} html - The HTML string to check
 * @returns {{ pass: boolean, issues: string[] }}
 */
function checkHtmlHasLang(html) {
  const issues = [];

  // Match the <html> opening tag
  const htmlTagRegex = /<html\b([^>]*)>/i;
  const htmlMatch = html.match(htmlTagRegex);

  if (!htmlMatch) {
    // No <html> tag found - might be a fragment, skip check
    return { pass: true, issues: [] };
  }

  const htmlAttributes = htmlMatch[1];

  // Check for lang attribute with a value
  const langRegex = /\blang\s*=\s*["']([^"']*)["']/i;
  const langMatch = htmlAttributes.match(langRegex);

  if (!langMatch) {
    issues.push('<html> element is missing the lang attribute. Add lang="en" or appropriate language code.');
    return { pass: false, issues };
  }

  const langValue = langMatch[1].trim();

  if (!langValue) {
    issues.push('<html> element has an empty lang attribute. Provide a valid language code (e.g., "en", "de", "fr").');
    return { pass: false, issues };
  }

  // Validate lang value format (basic check for BCP 47 format)
  // Examples: en, en-US, de, fr-CA, zh-Hans
  const validLangRegex = /^[a-z]{2,3}(-[A-Za-z]{2,4})?(-[A-Za-z]{2})?$/;
  if (!validLangRegex.test(langValue)) {
    issues.push(`<html> element has an invalid lang value "${langValue}". Use a valid BCP 47 language tag (e.g., "en", "en-US", "de").`);
    return { pass: false, issues };
  }

  return { pass: true, issues: [] };
}

/**
 * Check 2: Meta viewport must allow user zooming
 *
 * Users with low vision need to be able to zoom the page.
 * user-scalable=no and maximum-scale=1 prevent zooming.
 *
 * @param {string} html - The HTML string to check
 * @returns {{ pass: boolean, issues: string[] }}
 */
function checkMetaViewport(html) {
  const issues = [];

  // Match meta viewport tag
  const viewportRegex = /<meta\s+[^>]*name\s*=\s*["']viewport["'][^>]*>/gi;
  const viewportMatches = html.match(viewportRegex);

  if (!viewportMatches) {
    // No viewport meta tag - not necessarily an error for this check
    return { pass: true, issues: [] };
  }

  for (const viewportTag of viewportMatches) {
    // Extract content attribute value
    const contentRegex = /content\s*=\s*["']([^"']*)["']/i;
    const contentMatch = viewportTag.match(contentRegex);

    if (!contentMatch) {
      continue;
    }

    const content = contentMatch[1].toLowerCase();

    // Check for user-scalable=no
    const userScalableNoRegex = /user-scalable\s*=\s*(no|0|false)/i;
    if (userScalableNoRegex.test(content)) {
      issues.push('Meta viewport has user-scalable=no which prevents users from zooming. Remove this restriction for accessibility.');
    }

    // Check for maximum-scale=1 (or less)
    const maxScaleRegex = /maximum-scale\s*=\s*([0-9.]+)/i;
    const maxScaleMatch = content.match(maxScaleRegex);
    if (maxScaleMatch) {
      const maxScale = parseFloat(maxScaleMatch[1]);
      if (maxScale <= 1) {
        issues.push(`Meta viewport has maximum-scale=${maxScale} which prevents users from zooming. Use maximum-scale=5 or higher, or remove the restriction.`);
      }
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 3: Check for skip navigation link
 *
 * Skip links allow keyboard users to bypass repetitive navigation
 * and jump directly to main content.
 *
 * @param {string} html - The HTML string to check
 * @returns {{ pass: boolean, issues: string[] }}
 */
function checkSkipLink(html) {
  const issues = [];

  // Common skip link href patterns
  const skipLinkPatterns = [
    /#main\b/i,
    /#content\b/i,
    /#main-content\b/i,
    /#maincontent\b/i,
    /#skip\b/i,
    /#skip-nav\b/i,
    /#skip-navigation\b/i,
    /#skip-to-content\b/i,
    /#skip-to-main\b/i
  ];

  // Find all anchor links
  const linkRegex = /<a\s+[^>]*href\s*=\s*["']([^"']*)["'][^>]*>/gi;
  let linkMatch;
  let foundSkipLink = false;
  let linkIndex = 0;

  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const href = linkMatch[1];
    linkIndex++;

    // Check if this link matches skip link patterns
    for (const pattern of skipLinkPatterns) {
      if (pattern.test(href)) {
        // Found a skip link - check if it's early in the document (within first 5 links)
        if (linkIndex <= 5) {
          foundSkipLink = true;
        } else {
          // Skip link exists but is not early enough
          issues.push(`Skip link found (${href}) but it should be one of the first focusable elements on the page.`);
          foundSkipLink = true;
        }
        break;
      }
    }

    if (foundSkipLink) break;
  }

  // Only flag if no skip link found and there's substantial content (has nav or header)
  const hasNavigation = /<nav\b/i.test(html) || /<header\b/i.test(html);

  if (!foundSkipLink && hasNavigation) {
    issues.push('No skip navigation link found. Add a skip link (e.g., <a href="#main">Skip to main content</a>) as one of the first focusable elements.');
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 4: Input type="image" must have alt attribute
 *
 * Image inputs act as submit buttons with an image.
 * They need alt text to describe their purpose.
 *
 * @param {string} html - The HTML string to check
 * @returns {{ pass: boolean, issues: string[] }}
 */
function checkInputImageAlt(html) {
  const issues = [];

  // Match input elements with type="image"
  const inputImageRegex = /<input\s+[^>]*type\s*=\s*["']image["'][^>]*>/gi;
  let inputMatch;

  while ((inputMatch = inputImageRegex.exec(html)) !== null) {
    const inputTag = inputMatch[0];

    // Check for alt attribute
    const altRegex = /\balt\s*=\s*["']([^"']*)["']/i;
    const altMatch = inputTag.match(altRegex);

    if (!altMatch) {
      // Try to get src for better error message
      const srcRegex = /\bsrc\s*=\s*["']([^"']*)["']/i;
      const srcMatch = inputTag.match(srcRegex);
      const srcInfo = srcMatch ? ` (src="${srcMatch[1]}")` : '';

      issues.push(`<input type="image">${srcInfo} is missing alt attribute. Add descriptive alt text for the button action.`);
    } else if (!altMatch[1].trim()) {
      issues.push('<input type="image"> has an empty alt attribute. Provide descriptive alt text for the button action.');
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 5: Autoplay media should have controls and be muted
 *
 * Autoplaying audio can be disorienting for screen reader users.
 * Media should have controls so users can pause/stop and should be muted by default.
 *
 * @param {string} html - The HTML string to check
 * @returns {{ pass: boolean, issues: string[] }}
 */
function checkAutoplayMedia(html) {
  const issues = [];

  // Match video and audio elements with autoplay
  const mediaRegex = /<(video|audio)\s+[^>]*autoplay[^>]*>/gi;
  let mediaMatch;

  while ((mediaMatch = mediaRegex.exec(html)) !== null) {
    const mediaTag = mediaMatch[0];
    const mediaType = mediaMatch[1].toLowerCase();

    const hasControls = /\bcontrols\b/i.test(mediaTag);
    const hasMuted = /\bmuted\b/i.test(mediaTag);

    // Try to get src for better error message
    const srcRegex = /\bsrc\s*=\s*["']([^"']*)["']/i;
    const srcMatch = mediaTag.match(srcRegex);
    const srcInfo = srcMatch ? ` (src="${srcMatch[1]}")` : '';

    if (!hasControls && !hasMuted) {
      issues.push(`<${mediaType} autoplay>${srcInfo} should have both "controls" and "muted" attributes. Users need to be able to pause media and autoplaying audio is disorienting.`);
    } else if (!hasControls) {
      issues.push(`<${mediaType} autoplay>${srcInfo} should have "controls" attribute so users can pause/stop the media.`);
    } else if (!hasMuted) {
      issues.push(`<${mediaType} autoplay>${srcInfo} should have "muted" attribute. Autoplaying audio can be disorienting for screen reader users.`);
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 6: Marquee element is deprecated and inaccessible
 *
 * The <marquee> element creates scrolling text which is:
 * - Deprecated in HTML5
 * - Difficult to read for users with cognitive disabilities
 * - Cannot be paused by screen readers
 *
 * @param {string} html - The HTML string to check
 * @returns {{ pass: boolean, issues: string[] }}
 */
function checkMarqueeElement(html) {
  const issues = [];

  // Match marquee elements (opening tag)
  const marqueeRegex = /<marquee\b[^>]*>/gi;
  const marqueeMatches = html.match(marqueeRegex);

  if (marqueeMatches && marqueeMatches.length > 0) {
    issues.push(`Found ${marqueeMatches.length} <marquee> element(s). The <marquee> element is deprecated and inaccessible. Moving text is difficult to read and cannot be paused by assistive technologies. Use CSS animations with prefers-reduced-motion support instead, or static text.`);
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 7: Blink element is deprecated and inaccessible
 *
 * The <blink> element creates blinking text which is:
 * - Deprecated and not supported in modern browsers
 * - Potentially triggers seizures (if blinking 3+ times per second)
 * - Difficult to read for users with cognitive disabilities
 *
 * @param {string} html - The HTML string to check
 * @returns {{ pass: boolean, issues: string[] }}
 */
function checkBlinkElement(html) {
  const issues = [];

  // Match blink elements (opening tag)
  const blinkRegex = /<blink\b[^>]*>/gi;
  const blinkMatches = html.match(blinkRegex);

  if (blinkMatches && blinkMatches.length > 0) {
    issues.push(`Found ${blinkMatches.length} <blink> element(s). The <blink> element is deprecated, inaccessible, and can trigger seizures. Blinking content fails WCAG 2.3.1 (Three Flashes or Below Threshold). Remove all <blink> elements.`);
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

// Export all check functions
module.exports = {
  checkHtmlHasLang,
  checkMetaViewport,
  checkSkipLink,
  checkInputImageAlt,
  checkAutoplayMedia,
  checkMarqueeElement,
  checkBlinkElement
};
