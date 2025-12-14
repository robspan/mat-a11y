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

function scoreFromCheckAggregates(checkAggregates) {
  if (!checkAggregates || typeof checkAggregates !== 'object') return null;

  let auditsTotal = 0;
  let auditsPassed = 0;

  for (const data of Object.values(checkAggregates)) {
    if (!data || typeof data !== 'object') continue;

    const elementsFound = Number(data.elementsFound || 0);
    const issues = Number(data.issues || 0);
    const errors = Number(data.errors || 0);
    const warnings = Number(data.warnings || 0);

    // Treat checks as "applicable" when they actually encountered something
    // (elements found) or recorded any findings.
    const applicable = elementsFound > 0 || issues > 0 || errors > 0 || warnings > 0;
    if (!applicable) continue;

    auditsTotal++;

    const ok = issues === 0 && errors === 0 && warnings === 0;
    if (ok) auditsPassed++;
  }

  const auditScore = auditsTotal === 0 ? 100 : Math.round((auditsPassed / auditsTotal) * 100);
  return { auditScore, auditsPassed, auditsTotal };
}

function normalizeEntities(results) {
  if (!results || typeof results !== 'object') return [];

  // Component-based analysis
  if (Array.isArray(results.components)) {
    return results.components.map(comp => {
      const issues = asArray(comp.issues).map(i => normalizeIssue(i));

      const fromAggregates = scoreFromCheckAggregates(comp.checkAggregates);
      const auditScore = typeof comp.auditScore === 'number'
        ? comp.auditScore
        : (fromAggregates ? fromAggregates.auditScore : scoreFromIssues(issues));

      return {
        label: comp.name || comp.className || 'Unknown',
        kind: 'component',
        auditScore,
        issues,
        auditsPassed: fromAggregates ? fromAggregates.auditsPassed : undefined,
        auditsTotal: fromAggregates ? fromAggregates.auditsTotal : undefined
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
    // Component analysis often only lists components with issues.
    // If we have scan counts, compute a score-based distribution:
    // - Assume non-listed components are clean and therefore "passing".
    // - Classify listed entities by auditScore thresholds.
    if (results && typeof results === 'object' && typeof results.totalComponentsScanned === 'number') {
      const scanned = results.totalComponentsScanned;
      const listed = typeof results.componentCount === 'number' ? results.componentCount : entities.length;
      const cleanNotListed = Math.max(0, scanned - listed);

      let passing = cleanNotListed;
      let warning = 0;
      let failing = 0;

      for (const e of entities) {
        const score = typeof e?.auditScore === 'number' ? e.auditScore : 0;
        if (score >= 90) passing++;
        else if (score >= 50) warning++;
        else failing++;
      }

      return { passing, warning, failing };
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
