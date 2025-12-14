'use strict';

/**
 * Formatter Result Utilities
 *
 * Goal: formatters should not care which aggregation method produced the results.
 * This module normalizes different result shapes into a common representation.
 *
 * Supported inputs:
 * - Sitemap analysis: { urlCount, distribution, urls, internal.routes }
 * - Route analysis:   { routeCount, routes, distribution? }
 * - File-based scan:  { summary.issues, summary.auditScore, files }
 * - Component scan:   { components: [{ name, issues: [...] }], auditScore }
 */

const { collectPages, getTotalCount, getDistribution, getPathLabel } = require('./page-utils');

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeIssue(issue, fallback = {}) {
  if (!issue || typeof issue !== 'object') {
    return {
      check: fallback.check || 'unknown',
      message: String(issue || ''),
      file: fallback.file || 'unknown',
      line: fallback.line || 1
    };
  }

  return {
    check: issue.check || fallback.check || 'unknown',
    message: issue.message || fallback.message || '',
    file: issue.file || fallback.file || 'unknown',
    line: issue.line || fallback.line || 1,
    element: issue.element
  };
}

function scoreFromIssues(issues) {
  const n = asArray(issues).length;
  return n === 0 ? 100 : 0;
}

function normalizeEntities(results) {
  if (!results || typeof results !== 'object') return [];

  // Component-based analysis
  if (Array.isArray(results.components)) {
    return results.components.map(comp => {
      const issues = asArray(comp.issues).map(i => normalizeIssue(i));
      return {
        label: comp.name || comp.className || 'Unknown',
        kind: 'component',
        auditScore: typeof comp.auditScore === 'number' ? comp.auditScore : scoreFromIssues(issues),
        issues
      };
    });
  }

  // File-based analysis
  if (results.summary && Array.isArray(results.summary.issues)) {
    const issues = asArray(results.summary.issues).map(i => normalizeIssue(i));
    const auditScore = typeof results.summary.auditScore === 'number' ? results.summary.auditScore : scoreFromIssues(issues);
    return [{ label: 'files', kind: 'file', auditScore, issues }];
  }

  // Page-like analysis (sitemap/routes)
  const pages = collectPages(results);
  if (pages.length > 0) {
    return pages.map(page => {
      const issues = asArray(page.issues).map(i => normalizeIssue(i, { file: getPathLabel(page) }));
      const auditScore = typeof page.auditScore === 'number'
        ? page.auditScore
        : (typeof page.score === 'number' ? page.score : scoreFromIssues(issues));

      return {
        label: getPathLabel(page),
        kind: 'page',
        auditScore,
        issues,
        auditsPassed: typeof page.auditsPassed === 'number' ? page.auditsPassed : undefined,
        auditsTotal: typeof page.auditsTotal === 'number' ? page.auditsTotal : undefined
      };
    });
  }

  return [];
}

function computeDistributionFromEntities(entities) {
  const distribution = { passing: 0, warning: 0, failing: 0 };
  for (const e of entities) {
    const score = typeof e?.auditScore === 'number' ? e.auditScore : 0;
    if (score >= 90) distribution.passing++;
    else if (score >= 50) distribution.warning++;
    else distribution.failing++;
  }
  return distribution;
}

function normalizeResults(results) {
  const entities = normalizeEntities(results);

  // Prefer the original total when provided (urlCount/routeCount/totalComponentsScanned), else entity length.
  const total = (() => {
    if (results && typeof results === 'object' && typeof results.totalComponentsScanned === 'number') {
      return results.totalComponentsScanned;
    }
    return getTotalCount(results, entities);
  })();

  // Prefer the original distribution when present, else compute from entities.
  const distribution = (() => {
    // Component analysis doesn't typically have passing entities in the list (only components with issues).
    // If we have scan counts, derive a stable distribution from those.
    if (results && typeof results === 'object' && typeof results.totalComponentsScanned === 'number') {
      const componentCount = typeof results.componentCount === 'number' ? results.componentCount : entities.length;
      const passing = Math.max(0, results.totalComponentsScanned - componentCount);
      return { passing, warning: 0, failing: componentCount };
    }

    // getDistribution expects "pages"; entities are close enough because only auditScore matters.
    const fromResults = getDistribution(results, entities);
    if (fromResults && typeof fromResults === 'object') return fromResults;
    return computeDistributionFromEntities(entities);
  })();

  const tier = results?.tier || 'material';

  const issues = [];
  for (const entity of entities) {
    for (const issue of asArray(entity.issues)) {
      issues.push({
        ...normalizeIssue(issue),
        entity: entity.label,
        auditScore: entity.auditScore
      });
    }
  }

  return { tier, total, distribution, entities, issues };
}

function getWorstEntities(entities, limit = 5) {
  return asArray(entities)
    .filter(e => typeof e.auditScore === 'number')
    .sort((a, b) => (a.auditScore ?? 0) - (b.auditScore ?? 0))
    .slice(0, limit);
}

module.exports = {
  normalizeResults,
  normalizeEntities,
  getWorstEntities
};
