/**
 * Additional HTML Accessibility Checks - Part 2
 *
 * This module provides 6 additional accessibility checks for HTML content:
 * 1. checkMetaRefresh - Detects disorienting meta refresh usage
 * 2. checkDuplicateIdAria - Validates ARIA ID references exist
 * 3. checkEmptyTableHeader - Ensures table headers have content
 * 4. checkScopeAttrMisuse - Validates scope attribute usage
 * 5. checkAutofocusUsage - Warns about autofocus attribute
 * 6. checkFormFieldName - Checks form fields have name attributes
 */

/**
 * Check for meta refresh usage which can disorient users
 * WCAG 2.2.1: Timing Adjustable, WCAG 3.2.5: Change on Request
 *
 * @param {string} html - The HTML string to check
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and issues found
 */
function checkMetaRefresh(html) {
    const issues = [];

    // Pattern to match <meta http-equiv="refresh" ...>
    // Handles various quote styles and attribute ordering
    const metaRefreshPattern = /<meta\s+[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi;

    const matches = html.match(metaRefreshPattern);

    if (matches) {
        matches.forEach((match) => {
            // Extract content attribute value if present
            const contentMatch = match.match(/content\s*=\s*["']?([^"'\s>]+)["']?/i);
            const contentValue = contentMatch ? contentMatch[1] : 'unknown';

            issues.push(
                `Found <meta http-equiv="refresh"> with content="${contentValue}". ` +
                `Auto-refresh can disorient users, especially those using screen readers. ` +
                `Consider providing user-controlled refresh options instead.`
            );
        });
    }

    return {
        pass: issues.length === 0,
        issues
    };
}

/**
 * Check that IDs referenced in ARIA attributes actually exist in the document
 * Validates: aria-labelledby, aria-describedby, aria-controls, aria-owns, aria-flowto
 *
 * @param {string} html - The HTML string to check
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and issues found
 */
function checkDuplicateIdAria(html) {
    const issues = [];

    // First, collect all IDs defined in the document
    const idPattern = /\sid\s*=\s*["']([^"']+)["']/gi;
    const definedIds = new Set();
    let idMatch;

    while ((idMatch = idPattern.exec(html)) !== null) {
        definedIds.add(idMatch[1]);
    }

    // ARIA attributes that reference IDs (can contain space-separated ID lists)
    const ariaRefAttributes = [
        'aria-labelledby',
        'aria-describedby',
        'aria-controls',
        'aria-owns',
        'aria-flowto',
        'aria-activedescendant',
        'aria-details',
        'aria-errormessage'
    ];

    // Check each ARIA reference attribute
    ariaRefAttributes.forEach((attr) => {
        // Pattern to match the ARIA attribute and its value
        const ariaPattern = new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'gi');
        let ariaMatch;

        while ((ariaMatch = ariaPattern.exec(html)) !== null) {
            // ARIA attributes can reference multiple IDs separated by spaces
            const referencedIds = ariaMatch[1].split(/\s+/).filter(id => id.length > 0);

            referencedIds.forEach((refId) => {
                if (!definedIds.has(refId)) {
                    issues.push(
                        `${attr} references ID "${refId}" which does not exist in the document. ` +
                        `Ensure all referenced IDs are defined.`
                    );
                }
            });
        }
    });

    return {
        pass: issues.length === 0,
        issues
    };
}

/**
 * Check that table header elements (<th>) are not empty
 * Empty headers provide no context for screen reader users
 *
 * @param {string} html - The HTML string to check
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and issues found
 */
function checkEmptyTableHeader(html) {
    const issues = [];

    // Pattern to match <th> elements and capture their content
    // Handles attributes and nested content
    const thPattern = /<th(\s[^>]*)?>([^<]*(?:<(?!\/th>)[^<]*)*)<\/th>/gi;
    let match;

    while ((match = thPattern.exec(html)) !== null) {
        const attributes = match[1] || '';
        const content = match[2] || '';

        // Check if th has aria-label attribute (acceptable alternative)
        const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attributes);

        // Check if th has aria-labelledby attribute
        const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes);

        // Check if content is empty or only whitespace
        const trimmedContent = content.replace(/<[^>]*>/g, '').trim();
        const hasVisibleContent = trimmedContent.length > 0;

        // Check for visually hidden text (common pattern)
        const hasScreenReaderText = /<span[^>]*class\s*=\s*["'][^"']*(?:sr-only|visually-hidden|screen-reader)[^"']*["'][^>]*>[^<]+<\/span>/i.test(content);

        if (!hasVisibleContent && !hasAriaLabel && !hasAriaLabelledby && !hasScreenReaderText) {
            issues.push(
                `Found empty <th> element without text content, aria-label, or aria-labelledby. ` +
                `Table headers must have accessible text to provide context for data cells.`
            );
        }
    }

    // Also check for self-closing or immediately closed th elements
    const emptyThPattern = /<th(\s[^>]*)?\/?>(\s*<\/th>)?/gi;
    let emptyMatch;

    while ((emptyMatch = emptyThPattern.exec(html)) !== null) {
        const fullMatch = emptyMatch[0];
        // Skip if this is a proper th with content (already checked above)
        if (!fullMatch.includes('</th>') || fullMatch.match(/<th[^>]*>\s*<\/th>/i)) {
            const attributes = emptyMatch[1] || '';
            const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attributes);
            const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attributes);

            if (!hasAriaLabel && !hasAriaLabelledby && fullMatch.match(/<th[^>]*>\s*<\/th>/i)) {
                // Already caught by first pattern, skip duplicate
                continue;
            }
        }
    }

    return {
        pass: issues.length === 0,
        issues
    };
}

/**
 * Check that scope attribute is only used on <th> elements
 * The scope attribute is only valid on table header cells
 *
 * @param {string} html - The HTML string to check
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and issues found
 */
function checkScopeAttrMisuse(html) {
    const issues = [];

    // Pattern to find scope attribute on any element
    const scopePattern = /<(\w+)(\s[^>]*?\sscope\s*=\s*["'][^"']*["'][^>]*)>/gi;
    let match;

    while ((match = scopePattern.exec(html)) !== null) {
        const tagName = match[1].toLowerCase();

        // scope is only valid on <th> elements
        if (tagName !== 'th') {
            issues.push(
                `Found scope attribute on <${tagName}> element. ` +
                `The scope attribute is only valid on <th> elements to indicate ` +
                `whether a header applies to a row, column, rowgroup, or colgroup.`
            );
        }
    }

    // Also check for scope at the start of attributes (different pattern)
    const scopeStartPattern = /<(\w+)\s+scope\s*=\s*["'][^"']*["'][^>]*>/gi;

    while ((match = scopeStartPattern.exec(html)) !== null) {
        const tagName = match[1].toLowerCase();

        if (tagName !== 'th') {
            // Avoid duplicate issues
            const isDuplicate = issues.some(issue =>
                issue.includes(`<${tagName}> element`)
            );

            if (!isDuplicate) {
                issues.push(
                    `Found scope attribute on <${tagName}> element. ` +
                    `The scope attribute is only valid on <th> elements to indicate ` +
                    `whether a header applies to a row, column, rowgroup, or colgroup.`
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
 * Check for autofocus attribute usage (generates warning)
 * Autofocus can disorient screen reader users by unexpectedly moving focus
 * WCAG 3.2.1: On Focus
 *
 * @param {string} html - The HTML string to check
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and issues found
 */
function checkAutofocusUsage(html) {
    const issues = [];

    // Pattern to match elements with autofocus attribute
    // Handles both autofocus="autofocus", autofocus="true", and standalone autofocus
    const autofocusPattern = /<(\w+)([^>]*?\s(?:autofocus(?:\s*=\s*["']?[^"'\s>]*["']?)?))([^>]*)>/gi;
    let match;

    while ((match = autofocusPattern.exec(html)) !== null) {
        const tagName = match[1].toLowerCase();

        // Try to extract identifying information about the element
        const fullAttributes = (match[2] || '') + (match[3] || '');
        const idMatch = fullAttributes.match(/\sid\s*=\s*["']([^"']+)["']/i);
        const nameMatch = fullAttributes.match(/\sname\s*=\s*["']([^"']+)["']/i);
        const typeMatch = fullAttributes.match(/\stype\s*=\s*["']([^"']+)["']/i);

        let elementIdentifier = `<${tagName}>`;
        if (idMatch) {
            elementIdentifier += ` with id="${idMatch[1]}"`;
        } else if (nameMatch) {
            elementIdentifier += ` with name="${nameMatch[1]}"`;
        } else if (typeMatch) {
            elementIdentifier += ` of type="${typeMatch[1]}"`;
        }

        issues.push(
            `Warning: Found autofocus attribute on ${elementIdentifier}. ` +
            `Autofocus can disorient screen reader users by moving focus unexpectedly. ` +
            `Consider whether autofocus is truly necessary or if focus management ` +
            `should be handled more explicitly.`
        );
    }

    // Additional pattern for standalone autofocus attribute (boolean attribute)
    const standalonePattern = /<(\w+)\s+autofocus(?:\s|>|\/)/gi;

    while ((match = standalonePattern.exec(html)) !== null) {
        const tagName = match[1].toLowerCase();

        // Check if already reported (avoid duplicates)
        const isDuplicate = issues.some(issue =>
            issue.includes(`<${tagName}>`) && issue.includes('autofocus')
        );

        if (!isDuplicate) {
            issues.push(
                `Warning: Found autofocus attribute on <${tagName}> element. ` +
                `Autofocus can disorient screen reader users by moving focus unexpectedly. ` +
                `Consider whether autofocus is truly necessary.`
            );
        }
    }

    return {
        pass: issues.length === 0,
        issues
    };
}

/**
 * Check that form fields inside <form> elements have name attributes
 * Name attributes are required for proper form submission
 *
 * @param {string} html - The HTML string to check
 * @returns {{ pass: boolean, issues: string[] }} - Result with pass status and issues found
 */
function checkFormFieldName(html) {
    const issues = [];

    // Pattern to find <form> elements and their content
    const formPattern = /<form[^>]*>([\s\S]*?)<\/form>/gi;
    let formMatch;

    while ((formMatch = formPattern.exec(html)) !== null) {
        const formContent = formMatch[1];

        // Check input elements (excluding buttons and submit/reset types which don't need names)
        const inputPattern = /<input([^>]*)>/gi;
        let inputMatch;

        while ((inputMatch = inputPattern.exec(formContent)) !== null) {
            const attributes = inputMatch[1];

            // Extract type attribute
            const typeMatch = attributes.match(/\stype\s*=\s*["']([^"']+)["']/i);
            const type = typeMatch ? typeMatch[1].toLowerCase() : 'text'; // default type is text

            // Skip buttons, submit, reset, image (these don't require name for data submission)
            // Also skip hidden fields used for CSRF tokens etc. that may be auto-generated
            const skipTypes = ['button', 'submit', 'reset', 'image'];
            if (skipTypes.includes(type)) {
                continue;
            }

            // Check for name attribute
            const hasName = /\sname\s*=\s*["'][^"']+["']/i.test(attributes);

            if (!hasName) {
                const idMatch = attributes.match(/\sid\s*=\s*["']([^"']+)["']/i);
                const identifier = idMatch ? ` with id="${idMatch[1]}"` : '';

                issues.push(
                    `Found <input type="${type}">${identifier} inside a form without a name attribute. ` +
                    `Form fields need a name attribute for proper form submission.`
                );
            }
        }

        // Check select elements
        const selectPattern = /<select([^>]*)>/gi;
        let selectMatch;

        while ((selectMatch = selectPattern.exec(formContent)) !== null) {
            const attributes = selectMatch[1];
            const hasName = /\sname\s*=\s*["'][^"']+["']/i.test(attributes);

            if (!hasName) {
                const idMatch = attributes.match(/\sid\s*=\s*["']([^"']+)["']/i);
                const identifier = idMatch ? ` with id="${idMatch[1]}"` : '';

                issues.push(
                    `Found <select>${identifier} inside a form without a name attribute. ` +
                    `Form fields need a name attribute for proper form submission.`
                );
            }
        }

        // Check textarea elements
        const textareaPattern = /<textarea([^>]*)>/gi;
        let textareaMatch;

        while ((textareaMatch = textareaPattern.exec(formContent)) !== null) {
            const attributes = textareaMatch[1];
            const hasName = /\sname\s*=\s*["'][^"']+["']/i.test(attributes);

            if (!hasName) {
                const idMatch = attributes.match(/\sid\s*=\s*["']([^"']+)["']/i);
                const identifier = idMatch ? ` with id="${idMatch[1]}"` : '';

                issues.push(
                    `Found <textarea>${identifier} inside a form without a name attribute. ` +
                    `Form fields need a name attribute for proper form submission.`
                );
            }
        }
    }

    return {
        pass: issues.length === 0,
        issues
    };
}

// Export all check functions
module.exports = {
    checkMetaRefresh,
    checkDuplicateIdAria,
    checkEmptyTableHeader,
    checkScopeAttrMisuse,
    checkAutofocusUsage,
    checkFormFieldName
};
