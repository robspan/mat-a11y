module.exports = {
  name: 'marqueeElement',
  description: 'The deprecated <marquee> element is inaccessible and should not be used',
  tier: 'enhanced',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];

    // Match marquee elements (opening tag)
    const marqueeRegex = /<marquee\b[^>]*>/gi;
    const marqueeMatches = content.match(marqueeRegex);

    if (marqueeMatches && marqueeMatches.length > 0) {
      issues.push(`Found ${marqueeMatches.length} <marquee> element(s). The <marquee> element is deprecated and inaccessible. Moving text is difficult to read and cannot be paused by assistive technologies. Use CSS animations with prefers-reduced-motion support instead, or static text.`);
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
