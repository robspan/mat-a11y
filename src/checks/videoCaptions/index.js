module.exports = {
  name: 'videoCaptions',
  description: 'Videos have caption tracks',
  tier: 'basic',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];
    const videoRegex = /<video[^>]*>[\s\S]*?<\/video>/gi;
    const videos = content.match(videoRegex) || [];

    for (const video of videos) {
      const hasTrack = /<track[^>]*kind=["']captions["']/i.test(video);
      if (!hasTrack) {
        issues.push('<video> missing <track kind="captions">');
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
