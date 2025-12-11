/**
 * @fileoverview Parser module for verify files containing accessibility test cases.
 *
 * Verify files contain both passing and failing test cases for accessibility checks,
 * separated by marker comments (@a11y-pass and @a11y-fail).
 *
 * @module core/parser
 */

'use strict';

/**
 * Marker patterns for HTML comments
 * @constant {Object}
 */
const HTML_MARKERS = {
  pass: /<!--\s*@a11y-pass\s*-->/i,
  fail: /<!--\s*@a11y-fail\s*-->/i
};

/**
 * Marker patterns for CSS/SCSS comments
 * @constant {Object}
 */
const CSS_MARKERS = {
  pass: /\/\*\s*@a11y-pass\s*\*\//i,
  fail: /\/\*\s*@a11y-fail\s*\*\//i
};

/**
 * Supported file types and their extensions
 * @constant {Object}
 */
const FILE_EXTENSIONS = {
  html: ['.html', '.htm'],
  scss: ['.scss', '.css', '.sass']
};

/**
 * Parse a verify file and extract pass/fail sections.
 *
 * The verify file format expects:
 * - An @a11y-pass marker followed by passing test cases
 * - An @a11y-fail marker followed by failing test cases
 *
 * @param {string} content - The verify file content
 * @param {string} type - File type: 'html' or 'scss'
 * @returns {{ passContent: string, failContent: string, error: string|null, warnings: string[] }}
 *
 * @example
 * // HTML verify file
 * const result = parseVerifyFile(`
 *   <!-- @a11y-pass -->
 *   <button>Click me</button>
 *   <!-- @a11y-fail -->
 *   <button></button>
 * `, 'html');
 *
 * @example
 * // SCSS verify file
 * const result = parseVerifyFile(`
 *   /* @a11y-pass *\/
 *   button:focus { outline: 2px solid blue; }
 *   /* @a11y-fail *\/
 *   button:focus { outline: none; }
 * `, 'scss');
 */
function parseVerifyFile(content, type) {
  const result = {
    passContent: '',
    failContent: '',
    error: null,
    warnings: []
  };

  // Validate inputs
  if (typeof content !== 'string') {
    result.error = 'Content must be a string';
    return result;
  }

  if (!content.trim()) {
    result.error = 'Content is empty';
    return result;
  }

  if (!type || !['html', 'scss'].includes(type.toLowerCase())) {
    result.error = `Invalid file type: ${type}. Expected 'html' or 'scss'`;
    return result;
  }

  // Select appropriate markers based on file type
  const markers = type.toLowerCase() === 'html' ? HTML_MARKERS : CSS_MARKERS;

  // Find marker positions
  const passMatch = content.match(markers.pass);
  const failMatch = content.match(markers.fail);

  // Validate markers exist
  if (!passMatch) {
    result.error = `Missing @a11y-pass marker. Expected ${type === 'html' ? '<!-- @a11y-pass -->' : '/* @a11y-pass */'}`;
    return result;
  }

  if (!failMatch) {
    result.error = `Missing @a11y-fail marker. Expected ${type === 'html' ? '<!-- @a11y-fail -->' : '/* @a11y-fail */'}`;
    return result;
  }

  // Get positions
  const passIndex = content.indexOf(passMatch[0]);
  const passEndIndex = passIndex + passMatch[0].length;
  const failIndex = content.indexOf(failMatch[0]);
  const failEndIndex = failIndex + failMatch[0].length;

  // Validate marker order
  if (failIndex < passIndex) {
    result.error = '@a11y-fail marker appears before @a11y-pass marker. Pass section must come first';
    return result;
  }

  // Extract pass content (between @a11y-pass and @a11y-fail)
  const rawPassContent = content.substring(passEndIndex, failIndex);
  result.passContent = trimSection(rawPassContent);

  // Extract fail content (after @a11y-fail to end of file)
  const rawFailContent = content.substring(failEndIndex);
  result.failContent = trimSection(rawFailContent);

  // Check for empty sections and add warnings
  if (!result.passContent.trim()) {
    result.warnings.push('Pass section is empty');
  }

  if (!result.failContent.trim()) {
    result.warnings.push('Fail section is empty');
  }

  // Check for content before @a11y-pass marker
  const contentBeforePass = content.substring(0, passIndex).trim();
  if (contentBeforePass) {
    result.warnings.push('Content found before @a11y-pass marker will be ignored');
  }

  return result;
}

/**
 * Trim a section while preserving internal structure.
 * Removes leading/trailing empty lines but preserves indentation of content.
 *
 * @param {string} content - The section content to trim
 * @returns {string} Trimmed content
 * @private
 */
function trimSection(content) {
  if (!content) return '';

  // Split into lines
  const lines = content.split('\n');

  // Find first non-empty line
  let startIndex = 0;
  while (startIndex < lines.length && !lines[startIndex].trim()) {
    startIndex++;
  }

  // Find last non-empty line
  let endIndex = lines.length - 1;
  while (endIndex >= 0 && !lines[endIndex].trim()) {
    endIndex--;
  }

  // Handle all-empty content
  if (startIndex > endIndex) {
    return '';
  }

  // Extract content lines
  const contentLines = lines.slice(startIndex, endIndex + 1);

  // Find minimum indentation (excluding empty lines)
  let minIndent = Infinity;
  for (const line of contentLines) {
    if (line.trim()) {
      const leadingWhitespace = line.match(/^(\s*)/)[1].length;
      minIndent = Math.min(minIndent, leadingWhitespace);
    }
  }

  // If no indentation found, return as-is
  if (minIndent === Infinity || minIndent === 0) {
    return contentLines.join('\n');
  }

  // Remove common indentation from all lines
  const dedentedLines = contentLines.map(line => {
    if (!line.trim()) return '';
    return line.substring(minIndent);
  });

  return dedentedLines.join('\n');
}

/**
 * Detect file type from file extension.
 *
 * @param {string} filePath - Path to the file
 * @returns {'html'|'scss'|null} Detected file type or null if unknown
 *
 * @example
 * detectFileType('test.verify.html'); // returns 'html'
 * detectFileType('styles.verify.scss'); // returns 'scss'
 * detectFileType('unknown.txt'); // returns null
 */
function detectFileType(filePath) {
  if (typeof filePath !== 'string' || !filePath) {
    return null;
  }

  // Normalize path and extract extension
  const normalizedPath = filePath.toLowerCase().trim();

  // Check for HTML extensions
  for (const ext of FILE_EXTENSIONS.html) {
    if (normalizedPath.endsWith(ext)) {
      return 'html';
    }
  }

  // Check for SCSS/CSS extensions
  for (const ext of FILE_EXTENSIONS.scss) {
    if (normalizedPath.endsWith(ext)) {
      return 'scss';
    }
  }

  return null;
}

/**
 * Parse multiple verify files at once.
 *
 * @param {Array<{content: string, path: string}>} files - Array of file objects
 * @returns {Array<{path: string, passContent: string, failContent: string, error: string|null, warnings: string[]}>}
 */
function parseMultipleFiles(files) {
  if (!Array.isArray(files)) {
    return [];
  }

  return files.map(file => {
    const type = detectFileType(file.path);
    const result = parseVerifyFile(file.content, type);
    return {
      path: file.path,
      ...result
    };
  });
}

/**
 * Validate that a string contains valid verify file structure.
 * Performs a quick check without full parsing.
 *
 * @param {string} content - The content to validate
 * @param {string} type - File type: 'html' or 'scss'
 * @returns {{ valid: boolean, reason: string|null }}
 */
function validateVerifyStructure(content, type) {
  if (!content || typeof content !== 'string') {
    return { valid: false, reason: 'Content is empty or invalid' };
  }

  const markers = type === 'html' ? HTML_MARKERS : CSS_MARKERS;

  const hasPass = markers.pass.test(content);
  const hasFail = markers.fail.test(content);

  if (!hasPass && !hasFail) {
    return { valid: false, reason: 'No markers found' };
  }

  if (!hasPass) {
    return { valid: false, reason: 'Missing @a11y-pass marker' };
  }

  if (!hasFail) {
    return { valid: false, reason: 'Missing @a11y-fail marker' };
  }

  // Check order
  const passMatch = content.match(markers.pass);
  const failMatch = content.match(markers.fail);
  const passIndex = content.indexOf(passMatch[0]);
  const failIndex = content.indexOf(failMatch[0]);

  if (failIndex < passIndex) {
    return { valid: false, reason: '@a11y-fail appears before @a11y-pass' };
  }

  return { valid: true, reason: null };
}

module.exports = {
  parseVerifyFile,
  detectFileType,
  parseMultipleFiles,
  validateVerifyStructure,
  // Export constants for testing
  HTML_MARKERS,
  CSS_MARKERS,
  FILE_EXTENSIONS
};
