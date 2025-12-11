/**
 * WCAG 2.1 Color Contrast Utilities
 *
 * Provides functions for calculating color contrast ratios
 * according to WCAG 2.1 guidelines.
 */

const NAMED_COLORS = {
  white: [255, 255, 255],
  black: [0, 0, 0],
  red: [255, 0, 0],
  green: [0, 128, 0],
  lime: [0, 255, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  cyan: [0, 255, 255],
  magenta: [255, 0, 255],
  orange: [255, 165, 0],
  purple: [128, 0, 128],
  pink: [255, 192, 203],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  silver: [192, 192, 192],
  maroon: [128, 0, 0],
  olive: [128, 128, 0],
  navy: [0, 0, 128],
  teal: [0, 128, 128],
  aqua: [0, 255, 255],
  fuchsia: [255, 0, 255],
};

/**
 * Parse a CSS color string to RGB values
 * @param {string} color - CSS color value
 * @returns {number[]|null} RGB array [r, g, b] or null if unparseable
 */
function parseColor(color) {
  if (!color || typeof color !== 'string') return null;

  color = color.trim().toLowerCase();

  // Transparent
  if (color === 'transparent' || color === 'inherit' || color === 'initial') {
    return null;
  }

  // Named colors
  if (NAMED_COLORS[color]) {
    return [...NAMED_COLORS[color]];
  }

  // Hex colors: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
  const hexMatch = color.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];

    // Expand shorthand
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    } else if (hex.length === 4) {
      hex = hex.split('').map(c => c + c).join('');
    }

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return [r, g, b];
    }
  }

  // RGB/RGBA: rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)/i);
  if (rgbMatch) {
    return [
      parseInt(rgbMatch[1]),
      parseInt(rgbMatch[2]),
      parseInt(rgbMatch[3])
    ];
  }

  // RGB with percentages: rgb(100%, 50%, 0%)
  const rgbPctMatch = color.match(/rgba?\(\s*([\d.]+)%\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/i);
  if (rgbPctMatch) {
    return [
      Math.round(parseFloat(rgbPctMatch[1]) * 2.55),
      Math.round(parseFloat(rgbPctMatch[2]) * 2.55),
      Math.round(parseFloat(rgbPctMatch[3]) * 2.55)
    ];
  }

  // HSL: hsl(h, s%, l%)
  const hslMatch = color.match(/hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/i);
  if (hslMatch) {
    return hslToRgb(
      parseFloat(hslMatch[1]),
      parseFloat(hslMatch[2]),
      parseFloat(hslMatch[3])
    );
  }

  return null;
}

/**
 * Convert HSL to RGB
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {number[]} RGB array
 */
function hslToRgb(h, s, l) {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Calculate relative luminance per WCAG 2.1
 * @param {number[]} rgb - RGB array [r, g, b]
 * @returns {number|null} Luminance value (0-1) or null
 */
function getLuminance(rgb) {
  if (!rgb || rgb.length !== 3) return null;

  const [r, g, b] = rgb.map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 * @param {string} color1 - First CSS color
 * @param {string} color2 - Second CSS color
 * @returns {number|null} Contrast ratio or null if colors unparseable
 */
function getContrastRatio(color1, color2) {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);

  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);

  if (l1 === null || l2 === null) return null;

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA requirements
 * @param {number} ratio - Contrast ratio
 * @param {boolean} isLargeText - Whether text is large (18pt+ or 14pt bold)
 * @returns {boolean} Whether contrast is sufficient
 */
function meetsWCAG_AA(ratio, isLargeText = false) {
  if (ratio === null) return true; // Can't determine
  return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA requirements
 * @param {number} ratio - Contrast ratio
 * @param {boolean} isLargeText - Whether text is large
 * @returns {boolean} Whether contrast is sufficient for AAA
 */
function meetsWCAG_AAA(ratio, isLargeText = false) {
  if (ratio === null) return true;
  return isLargeText ? ratio >= 4.5 : ratio >= 7.0;
}

/**
 * Get a human-readable contrast rating
 * @param {number} ratio - Contrast ratio
 * @returns {string} Rating: 'fail', 'AA-large', 'AA', 'AAA'
 */
function getContrastRating(ratio) {
  if (ratio === null) return 'unknown';
  if (ratio >= 7.0) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3.0) return 'AA-large';
  return 'fail';
}

module.exports = {
  parseColor,
  getLuminance,
  getContrastRatio,
  meetsWCAG_AA,
  meetsWCAG_AAA,
  getContrastRating,
  hslToRgb,
  NAMED_COLORS
};
