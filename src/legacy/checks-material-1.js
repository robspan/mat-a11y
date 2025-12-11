/**
 * Angular Material Accessibility Checks - Part 1
 *
 * This module contains accessibility validation functions for Angular Material components.
 * Each function analyzes HTML strings and returns pass/fail status with detailed issues.
 */

/**
 * Check 1: mat-icon Accessibility
 *
 * Mat-icons must be properly labeled for screen readers:
 * - Decorative icons: aria-hidden="true" (icon provides no meaningful info)
 * - Informative icons: aria-label or aria-labelledby (icon conveys meaning)
 *
 * @param {string} html - The HTML string to analyze
 * @returns {{ pass: boolean, issues: string[] }} - Validation result
 */
function checkMatIconAccessibility(html) {
  const issues = [];

  // Pattern to match <mat-icon> elements (both self-closing and with content)
  // Captures the full tag including attributes
  const matIconElementRegex = /<mat-icon([^>]*)>([^<]*)<\/mat-icon>|<mat-icon([^>]*)\/>/gi;

  // Pattern to match elements with matIcon attribute selector
  const matIconAttrRegex = /<[a-z][a-z0-9-]*[^>]*\bmatIcon\b[^>]*>/gi;

  let match;

  // Check <mat-icon> elements
  while ((match = matIconElementRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const attributes = match[1] || match[3] || '';

    const hasAriaHidden = /aria-hidden\s*=\s*["']true["']/i.test(attributes);
    const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attributes);
    const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes);

    if (!hasAriaHidden && !hasAriaLabel && !hasAriaLabelledby) {
      // Extract a snippet for context (truncate if too long)
      const snippet = fullMatch.length > 80 ? fullMatch.substring(0, 80) + '...' : fullMatch;
      issues.push(
        `<mat-icon> missing accessibility attribute. Add aria-hidden="true" for decorative icons ` +
        `or aria-label/aria-labelledby for informative icons. Found: ${snippet}`
      );
    }
  }

  // Check elements with matIcon attribute
  while ((match = matIconAttrRegex.exec(html)) !== null) {
    const fullMatch = match[0];

    const hasAriaHidden = /aria-hidden\s*=\s*["']true["']/i.test(fullMatch);
    const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(fullMatch);
    const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(fullMatch);

    if (!hasAriaHidden && !hasAriaLabel && !hasAriaLabelledby) {
      const snippet = fullMatch.length > 80 ? fullMatch.substring(0, 80) + '...' : fullMatch;
      issues.push(
        `Element with [matIcon] missing accessibility attribute. Add aria-hidden="true" for decorative icons ` +
        `or aria-label/aria-labelledby for informative icons. Found: ${snippet}`
      );
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 2: mat-form-field Label Requirement
 *
 * Every mat-form-field must contain a mat-label element for proper labeling.
 * This ensures form fields are properly announced by screen readers.
 *
 * @param {string} html - The HTML string to analyze
 * @returns {{ pass: boolean, issues: string[] }} - Validation result
 */
function checkMatFormFieldLabel(html) {
  const issues = [];

  // Pattern to match mat-form-field elements with their content
  // Uses a non-greedy match to capture content between opening and closing tags
  const matFormFieldRegex = /<mat-form-field([^>]*)>([\s\S]*?)<\/mat-form-field>/gi;

  let match;

  while ((match = matFormFieldRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const content = match[2] || '';

    // Check if mat-label exists within the form field content
    const hasMatLabel = /<mat-label[^>]*>/i.test(content);

    if (!hasMatLabel) {
      // Create a truncated snippet for the error message
      const snippet = fullMatch.length > 100
        ? fullMatch.substring(0, 100) + '...'
        : fullMatch;
      issues.push(
        `<mat-form-field> missing <mat-label> element. Add a <mat-label> to provide ` +
        `an accessible label for the form field. Found: ${snippet}`
      );
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 3: mat-select Placeholder vs Label
 *
 * Mat-select should use mat-label instead of relying solely on placeholder attribute.
 * The placeholder disappears once a selection is made, leaving no visible label.
 *
 * @param {string} html - The HTML string to analyze
 * @returns {{ pass: boolean, issues: string[] }} - Validation result
 */
function checkMatSelectPlaceholder(html) {
  const issues = [];

  // Find all mat-form-field elements containing mat-select
  const matFormFieldRegex = /<mat-form-field([^>]*)>([\s\S]*?)<\/mat-form-field>/gi;

  // Standalone mat-select (not in form-field)
  const standaloneSelectRegex = /<mat-select([^>]*)>/gi;

  let match;

  // Check mat-select within mat-form-field
  while ((match = matFormFieldRegex.exec(html)) !== null) {
    const content = match[2] || '';

    // Check if this form-field contains a mat-select
    const selectMatch = /<mat-select([^>]*)>/i.exec(content);
    if (selectMatch) {
      const selectAttributes = selectMatch[1] || '';
      const hasPlaceholder = /\bplaceholder\s*=\s*["'][^"']+["']/i.test(selectAttributes);
      const hasMatLabel = /<mat-label[^>]*>/i.test(content);

      // Issue: has placeholder but no mat-label
      if (hasPlaceholder && !hasMatLabel) {
        const snippet = selectMatch[0].length > 80
          ? selectMatch[0].substring(0, 80) + '...'
          : selectMatch[0];
        issues.push(
          `<mat-select> uses placeholder attribute without <mat-label>. ` +
          `Placeholder disappears on selection. Add <mat-label> for persistent labeling. Found: ${snippet}`
        );
      }
    }
  }

  // Check for standalone mat-select with placeholder (outside mat-form-field)
  // Reset regex state
  standaloneSelectRegex.lastIndex = 0;

  while ((match = standaloneSelectRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const attributes = match[1] || '';

    // Check if this select is inside a mat-form-field (skip if so, handled above)
    const beforeSelect = html.substring(0, match.index);
    const lastFormFieldOpen = beforeSelect.lastIndexOf('<mat-form-field');
    const lastFormFieldClose = beforeSelect.lastIndexOf('</mat-form-field');

    // If inside a mat-form-field, skip (already handled)
    if (lastFormFieldOpen > lastFormFieldClose) {
      continue;
    }

    const hasPlaceholder = /\bplaceholder\s*=\s*["'][^"']+["']/i.test(attributes);
    const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attributes);
    const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes);

    if (hasPlaceholder && !hasAriaLabel && !hasAriaLabelledby) {
      const snippet = fullMatch.length > 80 ? fullMatch.substring(0, 80) + '...' : fullMatch;
      issues.push(
        `Standalone <mat-select> uses placeholder without proper labeling. ` +
        `Add aria-label or wrap in <mat-form-field> with <mat-label>. Found: ${snippet}`
      );
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 4: mat-button on Valid Host Elements
 *
 * Material button directives (mat-button, mat-raised-button, mat-flat-button, etc.)
 * should only be applied to <button> or <a> elements for proper semantics and accessibility.
 *
 * @param {string} html - The HTML string to analyze
 * @returns {{ pass: boolean, issues: string[] }} - Validation result
 */
function checkMatButtonType(html) {
  const issues = [];

  // List of mat-button directive variants
  const buttonDirectives = [
    'mat-button',
    'mat-raised-button',
    'mat-flat-button',
    'mat-stroked-button',
    'mat-icon-button',
    'mat-fab',
    'mat-mini-fab'
  ];

  // Create regex pattern to match any element with mat-button directives
  // This matches the opening tag of any element
  const elementRegex = /<([a-z][a-z0-9-]*)\s([^>]*?)>/gi;

  let match;

  while ((match = elementRegex.exec(html)) !== null) {
    const tagName = match[1].toLowerCase();
    const attributes = match[2] || '';
    const fullMatch = match[0];

    // Check if any mat-button directive is present
    let foundDirective = null;
    for (const directive of buttonDirectives) {
      // Match directive as attribute (with or without value)
      const directiveRegex = new RegExp(`\\b${directive}\\b`, 'i');
      if (directiveRegex.test(attributes)) {
        foundDirective = directive;
        break;
      }
    }

    // If a button directive was found, verify it's on a valid element
    if (foundDirective) {
      const validElements = ['button', 'a'];
      if (!validElements.includes(tagName)) {
        const snippet = fullMatch.length > 80 ? fullMatch.substring(0, 80) + '...' : fullMatch;
        issues.push(
          `"${foundDirective}" directive applied to <${tagName}> element. ` +
          `Material button directives should only be used on <button> or <a> elements ` +
          `for proper accessibility. Found: ${snippet}`
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
 * Check 5: mat-dialog Focus Management
 *
 * Mat-dialog-content should have cdkFocusInitial on an element to manage
 * initial focus when the dialog opens. This is important for keyboard navigation.
 *
 * @param {string} html - The HTML string to analyze
 * @returns {{ pass: boolean, issues: string[] }} - Validation result
 */
function checkMatDialogFocus(html) {
  const issues = [];

  // Pattern to match mat-dialog-content elements
  // Also check for [mat-dialog-content] attribute selector
  const dialogContentRegex = /<mat-dialog-content([^>]*)>([\s\S]*?)<\/mat-dialog-content>/gi;
  const dialogContentAttrRegex = /<([a-z][a-z0-9-]*)[^>]*\bmat-dialog-content\b[^>]*>([\s\S]*?)<\/\1>/gi;

  // Also match div with attribute
  const divDialogContentRegex = /<div[^>]*\bmat-dialog-content\b[^>]*>([\s\S]*?)<\/div>/gi;

  let match;

  // Check <mat-dialog-content> elements
  while ((match = dialogContentRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const attributes = match[1] || '';
    const content = match[2] || '';

    // Check for cdkFocusInitial in content or on the element itself
    const hasFocusInitial = /cdkFocusInitial/i.test(content) || /cdkFocusInitial/i.test(attributes);

    // Also check for cdkTrapFocus with autoCapture
    const hasAutoCapture = /cdkTrapFocusAutoCapture/i.test(fullMatch);

    if (!hasFocusInitial && !hasAutoCapture) {
      const snippet = fullMatch.length > 100 ? fullMatch.substring(0, 100) + '...' : fullMatch;
      issues.push(
        `<mat-dialog-content> missing focus management. Add cdkFocusInitial attribute ` +
        `to an interactive element inside the dialog for proper keyboard navigation. Found: ${snippet}`
      );
    }
  }

  // Check elements with [mat-dialog-content] attribute
  while ((match = divDialogContentRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const content = match[1] || '';

    const hasFocusInitial = /cdkFocusInitial/i.test(fullMatch);
    const hasAutoCapture = /cdkTrapFocusAutoCapture/i.test(fullMatch);

    if (!hasFocusInitial && !hasAutoCapture) {
      const snippet = fullMatch.length > 100 ? fullMatch.substring(0, 100) + '...' : fullMatch;
      issues.push(
        `Element with [mat-dialog-content] missing focus management. Add cdkFocusInitial attribute ` +
        `to an interactive element inside the dialog for proper keyboard navigation. Found: ${snippet}`
      );
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 6: mat-table Header Row Requirement
 *
 * Mat-table must have mat-header-row to provide column headers for accessibility.
 * Screen readers use headers to understand table structure.
 *
 * @param {string} html - The HTML string to analyze
 * @returns {{ pass: boolean, issues: string[] }} - Validation result
 */
function checkMatTableHeaders(html) {
  const issues = [];

  // Pattern to match mat-table elements
  const matTableElementRegex = /<mat-table([^>]*)>([\s\S]*?)<\/mat-table>/gi;

  // Pattern to match elements with mat-table attribute/directive
  const matTableAttrRegex = /<table[^>]*\bmat-table\b[^>]*>([\s\S]*?)<\/table>/gi;

  let match;

  // Check <mat-table> elements
  while ((match = matTableElementRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const content = match[2] || '';

    // Check for mat-header-row in content
    // Can be <mat-header-row> element or [mat-header-row] attribute
    const hasHeaderRow = /<mat-header-row/i.test(content) || /\bmat-header-row\b/i.test(content);

    if (!hasHeaderRow) {
      const snippet = fullMatch.length > 100 ? fullMatch.substring(0, 100) + '...' : fullMatch;
      issues.push(
        `<mat-table> missing <mat-header-row>. Tables must have header rows for ` +
        `screen readers to understand the table structure. Found: ${snippet}`
      );
    }
  }

  // Check <table mat-table> elements
  while ((match = matTableAttrRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const content = match[1] || '';

    // Check for mat-header-row or tr with mat-header-row attribute
    const hasHeaderRow = /<mat-header-row/i.test(content) ||
                         /\bmat-header-row\b/i.test(content) ||
                         /<tr[^>]*mat-header-row/i.test(content);

    if (!hasHeaderRow) {
      const snippet = fullMatch.length > 100 ? fullMatch.substring(0, 100) + '...' : fullMatch;
      issues.push(
        `<table mat-table> missing header row. Add <tr mat-header-row> or ` +
        `<mat-header-row> for screen readers to understand the table structure. Found: ${snippet}`
      );
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

/**
 * Check 7: mat-chip-list/mat-chip-listbox Accessibility Label
 *
 * Mat-chip-list and mat-chip-listbox components need aria-label to describe
 * the purpose of the chip list for screen reader users.
 *
 * @param {string} html - The HTML string to analyze
 * @returns {{ pass: boolean, issues: string[] }} - Validation result
 */
function checkMatChipListLabel(html) {
  const issues = [];

  // Pattern to match mat-chip-list elements (older API)
  const matChipListRegex = /<mat-chip-list([^>]*)>/gi;

  // Pattern to match mat-chip-listbox elements (newer API)
  const matChipListboxRegex = /<mat-chip-listbox([^>]*)>/gi;

  // Pattern for mat-chip-set (another variant)
  const matChipSetRegex = /<mat-chip-set([^>]*)>/gi;

  let match;

  // Check <mat-chip-list> elements
  while ((match = matChipListRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const attributes = match[1] || '';

    const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attributes);
    const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes);

    if (!hasAriaLabel && !hasAriaLabelledby) {
      const snippet = fullMatch.length > 80 ? fullMatch.substring(0, 80) + '...' : fullMatch;
      issues.push(
        `<mat-chip-list> missing aria-label or aria-labelledby. Add a label to describe ` +
        `the purpose of the chip list for screen reader users. Found: ${snippet}`
      );
    }
  }

  // Check <mat-chip-listbox> elements
  while ((match = matChipListboxRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const attributes = match[1] || '';

    const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attributes);
    const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes);

    if (!hasAriaLabel && !hasAriaLabelledby) {
      const snippet = fullMatch.length > 80 ? fullMatch.substring(0, 80) + '...' : fullMatch;
      issues.push(
        `<mat-chip-listbox> missing aria-label or aria-labelledby. Add a label to describe ` +
        `the purpose of the chip listbox for screen reader users. Found: ${snippet}`
      );
    }
  }

  // Check <mat-chip-set> elements
  while ((match = matChipSetRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const attributes = match[1] || '';

    const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attributes);
    const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes);

    if (!hasAriaLabel && !hasAriaLabelledby) {
      const snippet = fullMatch.length > 80 ? fullMatch.substring(0, 80) + '...' : fullMatch;
      issues.push(
        `<mat-chip-set> missing aria-label or aria-labelledby. Add a label to describe ` +
        `the purpose of the chip set for screen reader users. Found: ${snippet}`
      );
    }
  }

  return {
    pass: issues.length === 0,
    issues
  };
}

// Export all check functions
module.exports = {
  checkMatIconAccessibility,
  checkMatFormFieldLabel,
  checkMatSelectPlaceholder,
  checkMatButtonType,
  checkMatDialogFocus,
  checkMatTableHeaders,
  checkMatChipListLabel
};
