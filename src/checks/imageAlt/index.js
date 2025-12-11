module.exports = {
  name: 'imageAlt',
  description: 'Images have alt attributes',
  tier: 'basic',
  type: 'html',
  weight: 10,

  check(content) {
    const issues = [];
    const imgRegex = /<img[^>]*>/gi;
    const images = content.match(imgRegex) || [];

    for (const img of images) {
      const hasAlt = /\balt=/i.test(img) || /\[alt\]=/i.test(img) || /\[attr\.alt\]=/i.test(img);

      if (!hasAlt) {
        const src = img.match(/src=["']([^"']+)["']/i);
        issues.push(`Image missing alt attribute: ${src ? src[1] : 'unknown source'}`);
      }
    }

    return { pass: issues.length === 0, issues };
  }
};
