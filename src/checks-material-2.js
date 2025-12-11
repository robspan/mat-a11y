/**
 * Angular Material Accessibility Checks - Part 2
 *
 * This module contains accessibility validation functions for additional
 * Angular Material components including sliders, menus, tooltips, expansion panels,
 * tabs, steppers, and snackbars.
 */

/**
 * Check that mat-slider has proper labeling via aria-label or aria-labelledby.
 * In Angular Material 15+, mat-slider contains an input element that needs the label.
 *
 * @param {string} html - The HTML content to check
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and any issues found
 */
function checkMatSliderLabel(html) {
  const issues = [];

  // Match mat-slider elements (both self-closing and with content)
  // Angular Material slider can be <mat-slider> with <input matSliderThumb> inside
  const matSliderRegex = /<mat-slider[^>]*>([\s\S]*?)<\/mat-slider>|<mat-slider[^>]*\/>/gi;

  let match;
  while ((match = matSliderRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const sliderContent = match[1] || '';

    // Check if the mat-slider itself has aria-label or aria-labelledby
    const sliderHasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(fullMatch);
    const sliderHasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(fullMatch);

    // Check for input with matSliderThumb inside (Angular Material 15+ pattern)
    const hasSliderInput = /<input[^>]*matSliderThumb[^>]*>/i.test(sliderContent);

    if (hasSliderInput) {
      // Extract the input element and check if IT has the label
      const inputMatch = sliderContent.match(/<input[^>]*matSliderThumb[^>]*>/i);
      if (inputMatch) {
        const inputElement = inputMatch[0];
        const inputHasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(inputElement);
        const inputHasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(inputElement);

        if (!inputHasAriaLabel && !inputHasAriaLabelledby) {
          issues.push(
            `mat-slider input (matSliderThumb) is missing aria-label or aria-labelledby. ` +
            `Add aria-label to the <input matSliderThumb> element.`
          );
        }
      }
    } else {
      // Legacy mat-slider (pre-v15) or slider without explicit input
      // Check the mat-slider element itself
      if (!sliderHasAriaLabel && !sliderHasAriaLabelledby) {
        issues.push(
          `mat-slider is missing aria-label or aria-labelledby. ` +
          `Screen reader users need a label to understand the slider's purpose.`
        );
      }
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check that elements with [matMenuTriggerFor] have an accessible name.
 * The trigger element needs text content, aria-label, or title attribute.
 *
 * @param {string} html - The HTML content to check
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and any issues found
 */
function checkMatMenuTrigger(html) {
  const issues = [];

  // Match elements with matMenuTriggerFor or [matMenuTriggerFor]
  // This regex captures the entire element including its content
  const menuTriggerRegex = /<(\w+)[^>]*\[?matMenuTriggerFor\]?\s*=\s*["'][^"']*["'][^>]*>([\s\S]*?)<\/\1>|<(\w+)[^>]*\[?matMenuTriggerFor\]?\s*=\s*["'][^"']*["'][^>]*\/>/gi;

  let match;
  while ((match = menuTriggerRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const tagName = match[1] || match[3];
    const content = match[2] || '';

    // Check for aria-label
    const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(fullMatch);

    // Check for aria-labelledby
    const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(fullMatch);

    // Check for title attribute
    const hasTitle = /\stitle\s*=\s*["'][^"']+["']/i.test(fullMatch);

    // Check for meaningful text content (strip HTML tags and whitespace)
    const textContent = content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\{\{[^}]*\}\}/g, 'placeholder') // Treat interpolations as content
      .trim();
    const hasTextContent = textContent.length > 0;

    // Check if it's a button with mat-icon-button (common pattern that still needs label)
    const isIconButton = /mat-icon-button/i.test(fullMatch);

    // For icon buttons, text content inside mat-icon doesn't count as accessible name
    if (isIconButton) {
      if (!hasAriaLabel && !hasAriaLabelledby && !hasTitle) {
        issues.push(
          `Menu trigger (icon button) is missing an accessible name. ` +
          `Add aria-label, aria-labelledby, or title attribute to describe the menu.`
        );
      }
    } else if (!hasAriaLabel && !hasAriaLabelledby && !hasTitle && !hasTextContent) {
      issues.push(
        `Menu trigger <${tagName}> is missing an accessible name. ` +
        `Add text content, aria-label, aria-labelledby, or title attribute.`
      );
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check that matTooltip is not placed on non-focusable elements.
 * Keyboard users cannot access tooltips on elements like div or span without tabindex.
 *
 * @param {string} html - The HTML content to check
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and any issues found
 */
function checkMatTooltipKeyboard(html) {
  const issues = [];

  // List of naturally focusable elements
  const focusableElements = ['a', 'button', 'input', 'select', 'textarea', 'area'];

  // Match elements with matTooltip
  const tooltipRegex = /<(\w+)([^>]*)\[?matTooltip\]?\s*=\s*["'][^"']*["']([^>]*)>/gi;

  let match;
  while ((match = tooltipRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const tagName = match[1].toLowerCase();
    const beforeAttr = match[2] || '';
    const afterAttr = match[3] || '';
    const allAttributes = beforeAttr + afterAttr;

    // Check if the element is naturally focusable
    const isNaturallyFocusable = focusableElements.includes(tagName);

    // Check for tabindex attribute (makes element focusable)
    const hasTabindex = /tabindex\s*=\s*["']?[^"'\s>]+["']?/i.test(fullMatch);

    // Check for Angular tabindex binding
    const hasTabindexBinding = /\[tabindex\]\s*=\s*["'][^"']*["']/i.test(fullMatch);

    // Check if element has interactive Angular directives that might make it focusable
    const hasClickHandler = /\(click\)\s*=/i.test(fullMatch);
    const hasRouterLink = /routerLink/i.test(fullMatch);

    // If element is not focusable, flag it
    if (!isNaturallyFocusable && !hasTabindex && !hasTabindexBinding) {
      let suggestion = `Add tabindex="0" to make it keyboard accessible`;

      // If it has a click handler, it really should be a button
      if (hasClickHandler) {
        suggestion = `Consider using a <button> element, or add tabindex="0"`;
      }

      issues.push(
        `matTooltip on <${tagName}> is not keyboard accessible. ` +
        `Keyboard users cannot focus this element to see the tooltip. ${suggestion}.`
      );
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check that mat-expansion-panel has a mat-expansion-panel-header with content.
 * The header provides the accessible name and interaction target for the panel.
 *
 * @param {string} html - The HTML content to check
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and any issues found
 */
function checkMatExpansionHeader(html) {
  const issues = [];

  // Match mat-expansion-panel elements with their content
  const panelRegex = /<mat-expansion-panel[^>]*>([\s\S]*?)<\/mat-expansion-panel>/gi;

  let match;
  let panelIndex = 0;
  while ((match = panelRegex.exec(html)) !== null) {
    panelIndex++;
    const panelContent = match[1];

    // Check for mat-expansion-panel-header
    const headerRegex = /<mat-expansion-panel-header[^>]*>([\s\S]*?)<\/mat-expansion-panel-header>/i;
    const headerMatch = panelContent.match(headerRegex);

    if (!headerMatch) {
      issues.push(
        `mat-expansion-panel #${panelIndex} is missing mat-expansion-panel-header. ` +
        `The header is required for keyboard navigation and screen reader accessibility.`
      );
    } else {
      const headerContent = headerMatch[1];

      // Strip HTML tags and check for meaningful content
      const textContent = headerContent
        .replace(/<[^>]*>/g, '')
        .replace(/\{\{[^}]*\}\}/g, 'placeholder') // Treat interpolations as content
        .trim();

      // Check for mat-panel-title or mat-panel-description
      const hasPanelTitle = /<mat-panel-title[^>]*>[\s\S]*?<\/mat-panel-title>/i.test(headerContent);
      const hasPanelDescription = /<mat-panel-description[^>]*>[\s\S]*?<\/mat-panel-description>/i.test(headerContent);

      // Check for aria-label on the header
      const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(headerMatch[0]);

      if (!textContent && !hasPanelTitle && !hasPanelDescription && !hasAriaLabel) {
        issues.push(
          `mat-expansion-panel #${panelIndex} header appears to be empty. ` +
          `Add content, mat-panel-title, or aria-label to describe the panel.`
        );
      }
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check that mat-tab has a label (via label attribute, aria-label, or text content).
 * Tabs need accessible names for screen reader users to understand navigation.
 *
 * @param {string} html - The HTML content to check
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and any issues found
 */
function checkMatTabLabel(html) {
  const issues = [];

  // Match mat-tab elements
  const tabRegex = /<mat-tab([^>]*)>([\s\S]*?)<\/mat-tab>|<mat-tab([^>]*)\/>/gi;

  let match;
  let tabIndex = 0;
  while ((match = tabRegex.exec(html)) !== null) {
    tabIndex++;
    const attributes = match[1] || match[3] || '';
    const content = match[2] || '';

    // Check for label attribute
    const hasLabel = /\slabel\s*=\s*["'][^"']+["']/i.test(attributes);

    // Check for [label] binding
    const hasLabelBinding = /\[label\]\s*=\s*["'][^"']*["']/i.test(attributes);

    // Check for aria-label
    const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attributes);

    // Check for aria-labelledby
    const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes);

    // Check for ng-template with mat-tab-label
    const hasMatTabLabel = /<ng-template\s+mat-tab-label[^>]*>[\s\S]*?<\/ng-template>/i.test(content);

    if (!hasLabel && !hasLabelBinding && !hasAriaLabel && !hasAriaLabelledby && !hasMatTabLabel) {
      issues.push(
        `mat-tab #${tabIndex} is missing a label. ` +
        `Add a label attribute, [label] binding, aria-label, or <ng-template mat-tab-label> for accessibility.`
      );
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check that mat-step has a label (via label attribute or mat-step-label element).
 * Steps in a stepper need accessible names for screen reader navigation.
 *
 * @param {string} html - The HTML content to check
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and any issues found
 */
function checkMatStepLabel(html) {
  const issues = [];

  // Match mat-step elements
  const stepRegex = /<mat-step([^>]*)>([\s\S]*?)<\/mat-step>|<mat-step([^>]*)\/>/gi;

  let match;
  let stepIndex = 0;
  while ((match = stepRegex.exec(html)) !== null) {
    stepIndex++;
    const attributes = match[1] || match[3] || '';
    const content = match[2] || '';

    // Check for label attribute
    const hasLabel = /\slabel\s*=\s*["'][^"']+["']/i.test(attributes);

    // Check for [label] binding
    const hasLabelBinding = /\[label\]\s*=\s*["'][^"']*["']/i.test(attributes);

    // Check for aria-label
    const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attributes);

    // Check for aria-labelledby
    const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes);

    // Check for ng-template with matStepLabel
    const hasMatStepLabel = /<ng-template\s+matStepLabel[^>]*>[\s\S]*?<\/ng-template>/i.test(content);

    if (!hasLabel && !hasLabelBinding && !hasAriaLabel && !hasAriaLabelledby && !hasMatStepLabel) {
      issues.push(
        `mat-step #${stepIndex} is missing a label. ` +
        `Add a label attribute, [label] binding, aria-label, or <ng-template matStepLabel> for accessibility.`
      );
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check for MatSnackBar.open() calls and warn about politeness settings.
 * This is a static analysis check - it cannot determine if politeness is correctly set,
 * but it can identify snackbar usage and remind developers to consider the setting.
 *
 * @param {string} tsContent - The TypeScript content to check
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and any issues found
 */
function checkMatSnackbarPoliteness(tsContent) {
  const issues = [];

  // Match various patterns of snackbar.open() calls
  // Handles: this.snackBar.open(), snackBar.open(), _snackBar.open(), etc.
  const snackbarOpenRegex = /(\w+)\.open\s*\(\s*(['"`][^'"`]*['"`]|[^,)]+)\s*(?:,\s*(['"`][^'"`]*['"`]|[^,)]+))?\s*(?:,\s*(\{[^}]*\}))?\s*\)/g;

  // Also check for injection of MatSnackBar to confirm it's being used
  const hasMatSnackBarImport = /import\s*\{[^}]*MatSnackBar[^}]*\}\s*from\s*['"]@angular\/material\/snack-bar['"]/i.test(tsContent);
  const hasMatSnackBarInjection = /MatSnackBar/i.test(tsContent);

  if (!hasMatSnackBarImport && !hasMatSnackBarInjection) {
    // No MatSnackBar usage detected
    return { pass: true, issues: [] };
  }

  let match;
  let snackbarCallCount = 0;
  const callsWithoutExplicitPoliteness = [];

  // Look for snackbar-like open() calls
  const openCallRegex = /(?:snackBar|snack|_snackBar|matSnackBar)\.open\s*\(/gi;

  while ((match = openCallRegex.exec(tsContent)) !== null) {
    snackbarCallCount++;

    // Get the full call by finding the matching closing parenthesis
    const startIndex = match.index;
    let parenCount = 0;
    let endIndex = startIndex;
    let inString = false;
    let stringChar = '';

    for (let i = match.index; i < tsContent.length; i++) {
      const char = tsContent[i];

      // Track string boundaries
      if ((char === '"' || char === "'" || char === '`') && tsContent[i - 1] !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === '(') parenCount++;
        if (char === ')') {
          parenCount--;
          if (parenCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }

    const fullCall = tsContent.substring(startIndex, endIndex + 1);

    // Check if the call includes politeness configuration
    const hasPolitenessConfig = /politeness\s*:/i.test(fullCall);

    if (!hasPolitenessConfig) {
      // Extract line number for better reporting
      const linesBeforeMatch = tsContent.substring(0, startIndex).split('\n');
      const lineNumber = linesBeforeMatch.length;
      callsWithoutExplicitPoliteness.push(lineNumber);
    }
  }

  if (snackbarCallCount > 0) {
    // Always add a general warning about snackbar accessibility
    issues.push(
      `Found ${snackbarCallCount} MatSnackBar.open() call(s). ` +
      `Consider the 'politeness' setting for screen reader announcements: ` +
      `'polite' (default) for non-urgent messages, 'assertive' for important alerts, ` +
      `or 'off' if the message is purely visual.`
    );

    if (callsWithoutExplicitPoliteness.length > 0) {
      issues.push(
        `${callsWithoutExplicitPoliteness.length} call(s) do not explicitly set politeness ` +
        `(lines: ${callsWithoutExplicitPoliteness.join(', ')}). ` +
        `Default is 'polite'. Explicitly set it for clarity: ` +
        `snackBar.open(message, action, { politeness: 'polite' })`
      );
    }
  }

  // This check always "passes" but provides warnings
  // It's informational since we can't statically verify correct politeness usage
  return {
    pass: true,
    issues
  };
}

// Export all check functions
module.exports = {
  checkMatSliderLabel,
  checkMatMenuTrigger,
  checkMatTooltipKeyboard,
  checkMatExpansionHeader,
  checkMatTabLabel,
  checkMatStepLabel,
  checkMatSnackbarPoliteness
};
