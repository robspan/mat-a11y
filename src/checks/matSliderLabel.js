const { format } = require('../core/errors');

module.exports = {
  name: 'matSliderLabel',
  description: 'Check that mat-slider has proper labeling via aria-label or aria-labelledby',
  tier: 'full',
  type: 'html',
  weight: 3,

  check(content) {
    // Early exit: no relevant elements, no issues
    if (!/mat-slider/i.test(content)) {
      return { pass: true, issues: [], elementsFound: 0 };
    }

    const issues = [];
    let elementsFound = 0;

    // Match mat-slider elements (both self-closing and with content)
    // Angular Material slider can be <mat-slider> with <input matSliderThumb> inside
    const matSliderRegex = /<mat-slider(?![a-z-])([^>]*)(?:\/>|>([\s\S]*?)<\/mat-slider>)/gi;

    // Pattern for quoted values that allows nested quotes of opposite type
    const quotedValue = '(?:"[^"]+"|\'[^\']+\')';
    const ariaLabelPattern = new RegExp(`(?:aria-label|\\[aria-label\\]|\\[attr\\.aria-label\\])\\s*=\\s*${quotedValue}`, 'i');
    const ariaLabelledbyPattern = new RegExp(`(?:aria-labelledby|\\[aria-labelledby\\]|\\[attr\\.aria-labelledby\\])\\s*=\\s*${quotedValue}`, 'i');

    let match;
    let sliderIndex = 0;
    while ((match = matSliderRegex.exec(content)) !== null) {
      sliderIndex++;
      elementsFound++;
      const fullMatch = match[0];
      const sliderAttrs = match[1] || '';
      const sliderContent = match[2] || '';

      // Check if the mat-slider itself has aria-label or aria-labelledby
      const sliderHasAriaLabel = ariaLabelPattern.test(sliderAttrs);
      const sliderHasAriaLabelledby = ariaLabelledbyPattern.test(sliderAttrs);

      // If the mat-slider has a label, thumbs inherit context - no need to check inputs
      if (sliderHasAriaLabel || sliderHasAriaLabelledby) {
        continue;
      }

      // Check for input with matSliderThumb inside (Angular Material 15+ pattern)
      // Also check for matSliderStartThumb and matSliderEndThumb for range sliders
      const thumbInputs = sliderContent.match(/<input[^>]*matSlider(?:Thumb|StartThumb|EndThumb)[^>]*>/gi) || [];

      if (thumbInputs.length > 0) {
        // Angular Material 15+ with explicit thumb inputs
        thumbInputs.forEach((inputElement, idx) => {
          const inputHasAriaLabel = ariaLabelPattern.test(inputElement);
          const inputHasAriaLabelledby = ariaLabelledbyPattern.test(inputElement);

          if (!inputHasAriaLabel && !inputHasAriaLabelledby) {
            const snippet = inputElement.substring(0, 80).replace(/\s+/g, ' ').trim() + '...';
            issues.push(format('MAT_SLIDER_MISSING_LABEL', { element: snippet }));
          }
        });
      } else {
        // Legacy mat-slider (pre-v15) or slider without explicit input
        // Check the mat-slider element itself - already checked above, so this is a fail
        const snippet = fullMatch.substring(0, 80).replace(/\s+/g, ' ').trim() + '...';
        issues.push(format('MAT_SLIDER_MISSING_LABEL', { element: snippet }));
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      elementsFound
    };
  }
};
