module.exports = {
  name: 'textJustify',
  description: 'Detects text-align: justify which creates uneven word spacing and causes readability issues for users with dyslexia',
  tier: 'full',
  type: 'scss',
  weight: 3,

  check(content) {
    const issues = [];

    // Pattern to find text-align: justify declarations
    const justifyPattern = /([\w\s.#\[\]='"~^$*|&>:+-]+)\s*\{[^}]*text-align\s*:\s*justify/gi;

    let match;

    while ((match = justifyPattern.exec(content)) !== null) {
      const selector = match[1].trim();

      issues.push(
        `[Warning] "${selector}" uses "text-align: justify" which creates uneven word spacing. ` +
        `This can cause readability issues for users with dyslexia due to "rivers" of white space. ` +
        `Consider using "text-align: left" (or "start") for better readability.`
      );
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};
