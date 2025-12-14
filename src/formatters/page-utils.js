'use strict';

/**
 * Formatter Page Utilities
 *
 * Normalizes analysis outputs into a "page-like" list.
 * Supports:
 * - sitemap-based analysis: results.urls
 * - route-based analysis: results.routes
 */

function collectPages(results) {
  if (!results || typeof results !== 'object') return [];

  const urls = Array.isArray(results.urls) ? results.urls : [];
  const routeBasedRoutes = Array.isArray(results.routes) ? results.routes : [];

  // NOTE: We intentionally do NOT include results.internal.routes here.
  // Internal routes are a sitemap-specific add-on and have separate counts/distribution.
  // Keeping them out prevents normalized totals/distribution from disagreeing with entity lists.
  return [...urls, ...routeBasedRoutes];
}

function getTotalCount(results, pages) {
  if (results && typeof results === 'object') {
    if (typeof results.urlCount === 'number') return results.urlCount;
    if (typeof results.routeCount === 'number') return results.routeCount;
  }
  return Array.isArray(pages) ? pages.length : 0;
}

function computeDistributionFromPages(pages) {
  const distribution = { passing: 0, warning: 0, failing: 0 };
  for (const page of pages || []) {
    const score = typeof page?.auditScore === 'number' ? page.auditScore : 0;
    if (score >= 90) distribution.passing++;
    else if (score >= 50) distribution.warning++;
    else distribution.failing++;
  }
  return distribution;
}

function getDistribution(results, pages) {
  const d = results?.distribution;
  if (d && typeof d === 'object' && ['passing', 'warning', 'failing'].every(k => typeof d[k] === 'number')) {
    return d;
  }
  return computeDistributionFromPages(pages);
}

function getPathLabel(page) {
  return page?.path || page?.url || 'unknown';
}

module.exports = {
  collectPages,
  getTotalCount,
  getDistribution,
  getPathLabel
};
