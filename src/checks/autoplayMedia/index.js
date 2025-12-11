module.exports = {
  name: 'autoplayMedia',
  description: 'Autoplay media should have controls and be muted for accessibility',
  tier: 'enhanced',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];

    // Match video and audio elements with autoplay
    const mediaRegex = /<(video|audio)\s+[^>]*autoplay[^>]*>/gi;
    let mediaMatch;

    while ((mediaMatch = mediaRegex.exec(content)) !== null) {
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
};
