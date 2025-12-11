/**
 * Accessibility Checks
 *
 * Full Lighthouse accessibility audit coverage.
 * Each check returns { pass: boolean, issues: string[] }
 */

const { parseColor, getLuminance, getContrastRatio } = require('./colors');

// Valid ARIA roles per WAI-ARIA 1.2 spec
const VALID_ARIA_ROLES = [
  'alert', 'alertdialog', 'application', 'article', 'banner', 'blockquote',
  'button', 'caption', 'cell', 'checkbox', 'code', 'columnheader', 'combobox',
  'complementary', 'contentinfo', 'definition', 'deletion', 'dialog',
  'directory', 'document', 'emphasis', 'feed', 'figure', 'form', 'generic',
  'grid', 'gridcell', 'group', 'heading', 'img', 'insertion', 'link', 'list',
  'listbox', 'listitem', 'log', 'main', 'marquee', 'math', 'menu', 'menubar',
  'menuitem', 'menuitemcheckbox', 'menuitemradio', 'meter', 'navigation',
  'none', 'note', 'option', 'paragraph', 'presentation', 'progressbar',
  'radio', 'radiogroup', 'region', 'row', 'rowgroup', 'rowheader', 'scrollbar',
  'search', 'searchbox', 'separator', 'slider', 'spinbutton', 'status',
  'strong', 'subscript', 'superscript', 'switch', 'tab', 'table', 'tablist',
  'tabpanel', 'term', 'textbox', 'time', 'timer', 'toolbar', 'tooltip', 'tree',
  'treegrid', 'treeitem'
];

// ARIA attributes that accept only true/false
const ARIA_BOOLEAN_ATTRS = [
  'atomic', 'busy', 'disabled', 'expanded', 'hidden', 'modal', 'multiline',
  'multiselectable', 'readonly', 'required', 'selected'
];

// ARIA attributes that accept true/false/mixed
const ARIA_TRISTATE_ATTRS = ['checked', 'pressed'];

/**
 * Check buttons have accessible names
 */
function checkButtonNames(html) {
  const issues = [];
  const buttonRegex = /<button[^>]*>[\s\S]*?<\/button>/gi;
  const buttons = html.match(buttonRegex) || [];

  for (const button of buttons) {
    const hasAriaLabel = /aria-label=/i.test(button) || /\[attr\.aria-label\]=/i.test(button);
    const hasAriaLabelledBy = /aria-labelledby=/i.test(button);
    const hasTitle = /\btitle=/i.test(button);

    // Extract text content (remove icons, SVGs, and tags)
    const textContent = button
      .replace(/<mat-icon[^>]*>[\s\S]*?<\/mat-icon>/gi, '')
      .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
      .replace(/<i[^>]*class="[^"]*icon[^"]*"[^>]*>[\s\S]*?<\/i>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\{\{[^}]+\}\}/g, 'TEXT') // Angular bindings count as text
      .trim();

    if (!textContent && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
      const snippet = button.substring(0, 80).replace(/\s+/g, ' ');
      issues.push(`Button without accessible name: ${snippet}...`);
    }
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check images have alt attributes
 */
function checkImageAlt(html) {
  const issues = [];
  const imgRegex = /<img[^>]*>/gi;
  const images = html.match(imgRegex) || [];

  for (const img of images) {
    const hasAlt = /\balt=/i.test(img) || /\[alt\]=/i.test(img) || /\[attr\.alt\]=/i.test(img);

    if (!hasAlt) {
      const src = img.match(/src=["']([^"']+)["']/i);
      issues.push(`Image missing alt attribute: ${src ? src[1] : 'unknown source'}`);
    }
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check form elements have labels
 */
function checkFormLabels(html) {
  const issues = [];
  const inputRegex = /<(input|select|textarea)[^>]*>/gi;
  const inputs = html.match(inputRegex) || [];

  for (const input of inputs) {
    // Skip inputs that don't need labels
    if (/<input/i.test(input)) {
      if (/type=["'](hidden|submit|button|reset|image)["']/i.test(input)) continue;
    }

    const hasAriaLabel = /aria-label=/i.test(input) || /\[attr\.aria-label\]=/i.test(input);
    const hasAriaLabelledBy = /aria-labelledby=/i.test(input);
    const hasTitle = /\btitle=/i.test(input);

    // Check for id and corresponding label
    const idMatch = input.match(/\bid=["']([^"']+)["']/i);
    let hasLabelFor = false;
    if (idMatch) {
      const labelRegex = new RegExp(`<label[^>]*for=["']${idMatch[1]}["']`, 'i');
      hasLabelFor = labelRegex.test(html);
    }

    // Check for wrapping label
    const hasWrappingLabel = /<label[^>]*>[\s\S]*?<(input|select|textarea)/i.test(html);

    // Check for mat-form-field (Angular Material)
    const hasMatFormField = /mat-form-field/i.test(html);

    if (!hasAriaLabel && !hasAriaLabelledBy && !hasLabelFor && !hasWrappingLabel && !hasMatFormField && !hasTitle) {
      const snippet = input.substring(0, 60).replace(/\s+/g, ' ');
      issues.push(`Form element without label: ${snippet}...`);
    }
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check ARIA roles are valid
 */
function checkAriaRoles(html) {
  const issues = [];
  const roleRegex = /role=["']([^"']+)["']/gi;
  let match;

  while ((match = roleRegex.exec(html)) !== null) {
    const role = match[1].toLowerCase();
    if (!VALID_ARIA_ROLES.includes(role)) {
      issues.push(`Invalid ARIA role: "${role}"`);
    }
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check ARIA attributes have valid values
 */
function checkAriaAttributes(html) {
  const issues = [];
  const ariaRegex = /aria-([a-z]+)=["']([^"']*)["']/gi;
  let match;

  while ((match = ariaRegex.exec(html)) !== null) {
    const attr = match[1].toLowerCase();
    const value = match[2].toLowerCase();

    // Skip dynamic bindings
    if (value.startsWith('{{') || value.includes('()') || value.startsWith('${')) continue;

    // Boolean attributes
    if (ARIA_BOOLEAN_ATTRS.includes(attr)) {
      if (!['true', 'false'].includes(value)) {
        issues.push(`aria-${attr}="${value}" - must be "true" or "false"`);
      }
    }

    // Tristate attributes
    if (ARIA_TRISTATE_ATTRS.includes(attr)) {
      if (!['true', 'false', 'mixed'].includes(value)) {
        issues.push(`aria-${attr}="${value}" - must be "true", "false", or "mixed"`);
      }
    }

    // aria-live
    if (attr === 'live' && !['off', 'polite', 'assertive'].includes(value)) {
      issues.push(`aria-live="${value}" - must be "off", "polite", or "assertive"`);
    }

    // aria-current
    if (attr === 'current' && !['page', 'step', 'location', 'date', 'time', 'true', 'false'].includes(value)) {
      issues.push(`aria-current="${value}" - invalid value`);
    }

    // aria-haspopup
    if (attr === 'haspopup' && !['true', 'false', 'menu', 'listbox', 'tree', 'grid', 'dialog'].includes(value)) {
      issues.push(`aria-haspopup="${value}" - invalid value`);
    }

    // aria-autocomplete
    if (attr === 'autocomplete' && !['none', 'inline', 'list', 'both'].includes(value)) {
      issues.push(`aria-autocomplete="${value}" - invalid value`);
    }

    // aria-sort
    if (attr === 'sort' && !['none', 'ascending', 'descending', 'other'].includes(value)) {
      issues.push(`aria-sort="${value}" - invalid value`);
    }

    // aria-invalid
    if (attr === 'invalid' && !['true', 'false', 'grammar', 'spelling'].includes(value)) {
      issues.push(`aria-invalid="${value}" - invalid value`);
    }
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check for duplicate IDs
 */
function checkUniqueIds(html) {
  const issues = [];
  const idRegex = /\bid=["']([^"'{}]+)["']/gi;
  const ids = [];
  let match;

  while ((match = idRegex.exec(html)) !== null) {
    ids.push(match[1]);
  }

  const counts = {};
  for (const id of ids) {
    counts[id] = (counts[id] || 0) + 1;
  }

  for (const [id, count] of Object.entries(counts)) {
    if (count > 1) {
      issues.push(`Duplicate ID "${id}" appears ${count} times`);
    }
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check heading order (no skipped levels)
 */
function checkHeadingOrder(html) {
  const issues = [];
  const headingRegex = /<h([1-6])[^>]*>/gi;
  const levels = [];
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    levels.push(parseInt(match[1]));
  }

  for (let i = 1; i < levels.length; i++) {
    const prev = levels[i - 1];
    const curr = levels[i];
    if (curr > prev + 1) {
      issues.push(`Heading level skipped: h${prev} -> h${curr}`);
    }
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check links have accessible names
 */
function checkLinkNames(html) {
  const issues = [];
  const linkRegex = /<a[^>]*>[\s\S]*?<\/a>/gi;
  const links = html.match(linkRegex) || [];

  for (const link of links) {
    const hasAriaLabel = /aria-label=/i.test(link);
    const hasAriaLabelledBy = /aria-labelledby=/i.test(link);
    const hasTitle = /\btitle=/i.test(link);

    const textContent = link
      .replace(/<mat-icon[^>]*>[\s\S]*?<\/mat-icon>/gi, '')
      .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\{\{[^}]+\}\}/g, 'TEXT')
      .trim();

    if (!textContent && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
      issues.push('Link without accessible name');
    }
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check list structure (<li> inside <ul>/<ol>/<menu>)
 */
function checkListStructure(html) {
  const issues = [];

  // Check for <li> elements
  if (/<li[^>]*>/i.test(html)) {
    const hasProperList = /<(ul|ol|menu)[^>]*>[\s\S]*<li/i.test(html);
    const hasRoleList = /role=["']list["'][\s\S]*<li|role=["']listitem["']/i.test(html);

    if (!hasProperList && !hasRoleList) {
      issues.push('<li> element not inside <ul>, <ol>, or <menu>');
    }
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check <dl> structure
 */
function checkDlStructure(html) {
  const issues = [];
  const dlMatch = html.match(/<dl[^>]*>([\s\S]*?)<\/dl>/gi);

  if (dlMatch) {
    for (const dl of dlMatch) {
      // Check for invalid children
      const inner = dl.replace(/<\/?dl[^>]*>/gi, '');
      const stripped = inner
        .replace(/<\/?dt[^>]*>/gi, '')
        .replace(/<\/?dd[^>]*>/gi, '')
        .replace(/<\/?div[^>]*>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\s+/g, '')
        .trim();

      if (stripped && !stripped.startsWith('<')) {
        issues.push('<dl> contains invalid children (only <dt>, <dd>, <div> allowed)');
      }
    }
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check tables have headers
 */
function checkTableHeaders(html) {
  const issues = [];

  if (/<table[^>]*>/i.test(html)) {
    // Skip layout tables
    if (/role=["'](presentation|none)["']/i.test(html)) {
      return { pass: true, issues: [] };
    }

    const hasTh = /<th[^>]*>/i.test(html);
    const hasMatTable = /mat-table|matColumnDef/i.test(html);

    if (!hasTh && !hasMatTable) {
      issues.push('Data table missing <th> headers');
    }
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check iframes have titles
 */
function checkIframeTitles(html) {
  const issues = [];
  const iframeRegex = /<iframe[^>]*>/gi;
  const iframes = html.match(iframeRegex) || [];

  for (const iframe of iframes) {
    const hasTitle = /\btitle=/i.test(iframe) || /\[title\]=/i.test(iframe);
    const hasAriaLabel = /aria-label=/i.test(iframe);
    const hasAriaLabelledBy = /aria-labelledby=/i.test(iframe);

    if (!hasTitle && !hasAriaLabel && !hasAriaLabelledBy) {
      issues.push('<iframe> missing title attribute');
    }
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check videos have captions
 */
function checkVideoCaptions(html) {
  const issues = [];
  const videoRegex = /<video[^>]*>[\s\S]*?<\/video>/gi;
  const videos = html.match(videoRegex) || [];

  for (const video of videos) {
    const hasTrack = /<track[^>]*kind=["']captions["']/i.test(video);
    if (!hasTrack) {
      issues.push('<video> missing <track kind="captions">');
    }
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check <object> elements have alt text
 */
function checkObjectAlt(html) {
  const issues = [];
  const objectRegex = /<object[^>]*>[\s\S]*?<\/object>/gi;
  const objects = html.match(objectRegex) || [];

  for (const obj of objects) {
    const hasTitle = /\btitle=/i.test(obj);
    const hasAriaLabel = /aria-label=/i.test(obj);
    // Check for fallback content
    const innerContent = obj.replace(/<object[^>]*>|<\/object>/gi, '').trim();
    const hasFallback = innerContent.length > 0;

    if (!hasTitle && !hasAriaLabel && !hasFallback) {
      issues.push('<object> missing accessible name or fallback content');
    }
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check accesskey values are unique
 */
function checkAccesskeyUnique(html) {
  const issues = [];
  const accesskeyRegex = /accesskey=["']([^"']+)["']/gi;
  const keys = [];
  let match;

  while ((match = accesskeyRegex.exec(html)) !== null) {
    keys.push(match[1].toLowerCase());
  }

  const counts = {};
  for (const key of keys) {
    counts[key] = (counts[key] || 0) + 1;
  }

  for (const [key, count] of Object.entries(counts)) {
    if (count > 1) {
      issues.push(`Duplicate accesskey "${key}"`);
    }
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check tabindex values (should not be > 0)
 */
function checkTabindex(html) {
  const issues = [];
  const tabindexRegex = /tabindex=["'](\d+)["']/gi;
  let match;

  while ((match = tabindexRegex.exec(html)) !== null) {
    const value = parseInt(match[1]);
    if (value > 0) {
      issues.push(`tabindex="${value}" disrupts natural tab order (use 0 or -1)`);
    }
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check for aria-hidden on body (critical error)
 */
function checkAriaHiddenBody(html) {
  const issues = [];

  if (/<body[^>]*aria-hidden=["']true["']/i.test(html)) {
    issues.push('aria-hidden="true" on <body> hides all content from assistive technology');
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check color contrast in SCSS
 */
function checkColorContrast(scss) {
  const issues = [];

  // Extract text colors
  const colorRegex = /(?:^|\s|;)color:\s*([^;}\n]+)/gi;
  const bgRegex = /background(?:-color)?:\s*([^;}\n]+)/gi;

  const textColors = [];
  const bgColors = [];

  let match;
  while ((match = colorRegex.exec(scss)) !== null) {
    const color = match[1].trim();
    if (!color.startsWith('$') && !color.startsWith('var(')) {
      textColors.push(color);
    }
  }

  while ((match = bgRegex.exec(scss)) !== null) {
    const color = match[1].trim();
    if (!color.startsWith('$') && !color.startsWith('var(') && !color.includes('gradient')) {
      bgColors.push(color);
    }
  }

  // Check problematic patterns
  for (const textColor of textColors) {
    const rgb = parseColor(textColor);
    if (!rgb) continue;

    const luminance = getLuminance(rgb);
    if (luminance === null) continue;

    // Light text on assumed white background
    if (luminance > 0.5) {
      const ratioOnWhite = getContrastRatio(textColor, '#ffffff');
      if (ratioOnWhite && ratioOnWhite < 1.5) {
        // Check if dark background exists
        const hasDarkBg = bgColors.some(bg => {
          const bgLum = getLuminance(parseColor(bg));
          return bgLum !== null && bgLum < 0.3;
        });

        if (!hasDarkBg) {
          issues.push(`Light text "${textColor}" may need dark background for contrast`);
        }
      }
    }
  }

  // Check for known low-contrast patterns
  const lowContrastPatterns = [
    { pattern: /color:\s*#[cdef]{3}(?![0-9a-f])/i, msg: 'Very light gray text (#ccc-#fff range)' },
    { pattern: /color:\s*rgba\([^)]*,\s*0\.[0-3]\)/i, msg: 'Highly transparent text' },
  ];

  for (const { pattern, msg } of lowContrastPatterns) {
    if (pattern.test(scss)) {
      issues.push(msg);
    }
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check focus styles exist
 */
function checkFocusStyles(scss) {
  const issues = [];

  // Check if there are interactive elements
  const hasInteractive = /button|input|select|textarea|\.clickable|\[tabindex\]|\[role=/i.test(scss);

  if (hasInteractive) {
    const hasFocus = /:focus-visible|:focus[^-]/i.test(scss);
    if (!hasFocus) {
      issues.push('Interactive elements may lack visible focus indicators');
    }
  }

  return { pass: issues.length === 0, issues };
}

/**
 * Check touch target sizes
 */
function checkTouchTargets(scss) {
  const issues = [];

  const hasButtons = /button|\.btn|\.chip|\.toggle/i.test(scss);

  if (hasButtons) {
    const hasMinSize = /min-(height|width):\s*(44px|2\.75rem|48px|3rem)/i.test(scss);
    const hasPadding = /padding:\s*\d+px/i.test(scss);

    if (!hasMinSize && !hasPadding) {
      issues.push('Interactive elements may be smaller than 44x44px minimum touch target');
    }
  }

  return { pass: issues.length === 0, issues };
}

module.exports = {
  // HTML checks
  checkButtonNames,
  checkImageAlt,
  checkFormLabels,
  checkAriaRoles,
  checkAriaAttributes,
  checkUniqueIds,
  checkHeadingOrder,
  checkLinkNames,
  checkListStructure,
  checkDlStructure,
  checkTableHeaders,
  checkIframeTitles,
  checkVideoCaptions,
  checkObjectAlt,
  checkAccesskeyUnique,
  checkTabindex,
  checkAriaHiddenBody,

  // SCSS checks
  checkColorContrast,
  checkFocusStyles,
  checkTouchTargets,

  // Constants
  VALID_ARIA_ROLES,
  ARIA_BOOLEAN_ATTRS,
  ARIA_TRISTATE_ATTRS
};
