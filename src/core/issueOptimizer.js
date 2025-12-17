'use strict';

/**
 * Issue Optimizer
 * 
 * Post-processes analysis results to collapse duplicate issues to their root cause.
 * Uses the SCSS dependency graph to find common ancestors.
 * 
 * Example: If 10 component SCSS files all have "Missing prefers-reduced-motion" 
 * and they all import from a shared _animations.scss, the optimizer collapses 
 * these into 1 issue pointing at _animations.scss.
 */

const path = require('path');
const { buildGraph } = require('./scssGraph');

/**
 * Optimize issues by collapsing duplicates to root cause
 * 
 * @param {object} results - Normalized analysis results
 * @param {string} projectPath - Path to the project root
 * @param {object} options - Optimization options
 * @returns {object} Optimized results with collapsed issues
 */
function optimizeIssues(results, projectPath, options = {}) {
  const {
    enabled = true,
    minGroupSize = 2,  // Minimum files with same issue to trigger collapse
    scssOnly = true    // Only collapse SCSS-related issues
  } = options;

  if (!enabled) {
    return results;
  }

  // Build SCSS dependency graph
  const graph = buildGraph(projectPath);
  const stats = graph.getStats();

  // If no SCSS files found, return unchanged
  if (stats.fileCount === 0) {
    return results;
  }

  // Process based on result structure
  // Component analyzer uses "components", sitemap/route uses "entities"
  if (results.entities || results.components) {
    // Entity/component-based results
    return optimizeEntityResults(results, graph, { minGroupSize, scssOnly });
  } else if (results.issues) {
    // Flat issue list
    return optimizeFlatResults(results, graph, { minGroupSize, scssOnly });
  }

  return results;
}

/**
 * Optimize entity-based results (component analysis)
 * @private
 */
function optimizeEntityResults(results, graph, options) {
  const { minGroupSize, scssOnly } = options;

  // Handle both "entities" (sitemap/route) and "components" (component analyzer)
  const entities = results.entities || results.components || [];
  const entityKey = results.entities ? 'entities' : 'components';

  // Collect all issues across all entities
  const allIssues = [];
  for (const entity of entities) {
    for (const issue of entity.issues || []) {
      allIssues.push({
        ...issue,
        entityName: entity.name,
        entitySelector: entity.selector
      });
    }
  }

  // Group issues by check + message pattern
  const issueGroups = groupIssuesByPattern(allIssues, scssOnly);

  // Track which issues get collapsed
  const collapsedIssues = new Map(); // originalIssue -> rootCauseInfo
  const rootCauseIssues = [];        // New issues pointing to root cause

  for (const [pattern, issues] of issueGroups) {
    if (issues.length < minGroupSize) continue;

    // Get unique files with this issue - resolve to absolute paths for graph lookup
    const files = [...new Set(issues.map(i => i.file).filter(Boolean))];
    
    // Only process SCSS/CSS files, resolve paths to absolute
    const scssFiles = files
      .filter(f => f.endsWith('.scss') || f.endsWith('.css'))
      .map(f => path.resolve(f));

    if (scssFiles.length < minGroupSize) continue;

    // Find common ancestor
    const result = graph.findCommonAncestor(scssFiles);

    if (result.rootCause && result.confidence >= 0.5) {
      // Mark original issues as collapsed
      for (const issue of issues) {
        // Resolve issue file path for comparison
        const issueFilePath = issue.file ? path.resolve(issue.file) : null;
        if (issueFilePath && scssFiles.includes(issueFilePath)) {
          collapsedIssues.set(issue, {
            rootCause: result.rootCause,
            impactedFiles: result.impactedFiles,
            confidence: result.confidence
          });
        }
      }

      // Create a single root cause issue
      const sampleIssue = issues[0];
      rootCauseIssues.push({
        message: sampleIssue.message,
        file: result.rootCause,
        check: sampleIssue.check,
        isRootCause: true,
        impactedFiles: result.impactedFiles,
        impactCount: result.impactedFiles.length,
        originalPattern: pattern
      });
    }
  }

  // Rebuild entities with optimized issues
  // Track root causes globally so we only show each once across all entities
  const globalSeenRootCauses = new Set();
  
  const optimizedEntities = entities.map(entity => {
    const optimizedIssues = [];

    for (const issue of entity.issues || []) {
      const fullIssue = {
        ...issue,
        entityName: entity.name,
        entitySelector: entity.selector
      };

      const collapseInfo = findCollapsedIssue(fullIssue, collapsedIssues);
      
      if (collapseInfo) {
        // This issue is collapsed - add root cause only once GLOBALLY
        const rootKey = `${collapseInfo.rootCause}:${issue.check}:${issue.message}`;
        if (!globalSeenRootCauses.has(rootKey)) {
          globalSeenRootCauses.add(rootKey);
          optimizedIssues.push({
            message: issue.message,
            file: collapseInfo.rootCause,
            check: issue.check,
            isRootCause: true,
            impactCount: collapseInfo.impactedFiles.length,
            originalFile: issue.file
          });
        }
        // If already seen, skip - don't add duplicate root cause issue
      } else {
        // Keep issue as-is
        optimizedIssues.push(issue);
      }
    }

    return {
      ...entity,
      issues: optimizedIssues,
      originalIssueCount: (entity.issues || []).length,
      optimizedIssueCount: optimizedIssues.length
    };
  });

  // Calculate new totals
  const totalOriginal = entities.reduce(
    (sum, e) => sum + (e.issues || []).length, 0
  );
  const totalOptimized = optimizedEntities.reduce(
    (sum, e) => sum + e.issues.length, 0
  );

  // Count components with issues after optimization
  const componentCountOptimized = optimizedEntities.filter(e => e.issues.length > 0).length;

  return {
    ...results,
    [entityKey]: optimizedEntities,
    totalIssues: totalOptimized,
    componentCount: componentCountOptimized,
    optimization: {
      enabled: true,
      originalIssueCount: totalOriginal,
      optimizedIssueCount: totalOptimized,
      collapsedCount: totalOriginal - totalOptimized,
      rootCausesFound: rootCauseIssues.length
    }
  };
}

/**
 * Optimize flat issue results
 * @private
 */
function optimizeFlatResults(results, graph, options) {
  const { minGroupSize, scssOnly } = options;

  // Group issues by check + message pattern
  const issueGroups = groupIssuesByPattern(results.issues, scssOnly);

  const optimizedIssues = [];
  const processedPatterns = new Set();

  for (const issue of results.issues) {
    const pattern = getIssuePattern(issue);
    const group = issueGroups.get(pattern);

    if (!group || group.length < minGroupSize) {
      // Keep as-is
      optimizedIssues.push(issue);
      continue;
    }

    if (processedPatterns.has(pattern)) {
      // Already processed this pattern
      continue;
    }

    // Get unique SCSS files with this issue
    const scssFiles = [...new Set(
      group.map(i => i.file).filter(f => 
        f && (f.endsWith('.scss') || f.endsWith('.css'))
      )
    )];

    if (scssFiles.length < minGroupSize) {
      // Not enough SCSS files, keep all issues
      for (const i of group) {
        if (!processedPatterns.has(getIssuePattern(i))) {
          optimizedIssues.push(i);
        }
      }
      processedPatterns.add(pattern);
      continue;
    }

    // Find common ancestor
    const result = graph.findCommonAncestor(scssFiles);

    if (result.rootCause && result.confidence >= 0.5) {
      // Collapse to root cause
      optimizedIssues.push({
        message: issue.message,
        file: result.rootCause,
        check: issue.check,
        isRootCause: true,
        impactedFiles: result.impactedFiles,
        impactCount: result.impactedFiles.length
      });
      processedPatterns.add(pattern);
    } else {
      // No common ancestor, keep original issues
      optimizedIssues.push(issue);
    }
  }

  return {
    ...results,
    issues: optimizedIssues,
    totalIssues: optimizedIssues.length,
    optimization: {
      enabled: true,
      originalIssueCount: results.issues.length,
      optimizedIssueCount: optimizedIssues.length,
      collapsedCount: results.issues.length - optimizedIssues.length
    }
  };
}

/**
 * Group issues by their check + message pattern
 * @private
 */
function groupIssuesByPattern(issues, scssOnly) {
  const groups = new Map();

  for (const issue of issues) {
    // Skip non-SCSS issues if scssOnly is true
    if (scssOnly && issue.file && 
        !issue.file.endsWith('.scss') && 
        !issue.file.endsWith('.css')) {
      continue;
    }

    const pattern = getIssuePattern(issue);
    
    if (!groups.has(pattern)) {
      groups.set(pattern, []);
    }
    groups.get(pattern).push(issue);
  }

  return groups;
}

/**
 * Get a pattern key for an issue (for grouping similar issues)
 * @private
 */
function getIssuePattern(issue) {
  // Normalize message by removing file-specific parts
  const normalizedMessage = (issue.message || '')
    .replace(/['"`][^'"`]+\.(scss|css)[^'"`]*['"`]/g, '<file>')
    .replace(/line\s+\d+/gi, 'line N')
    .replace(/\d+px/g, 'Npx');

  return `${issue.check || 'unknown'}::${normalizedMessage}`;
}

/**
 * Find if an issue was collapsed
 * @private
 */
function findCollapsedIssue(issue, collapsedMap) {
  for (const [collapsed, info] of collapsedMap) {
    if (collapsed.file === issue.file && 
        collapsed.check === issue.check &&
        collapsed.message === issue.message) {
      return info;
    }
  }
  return null;
}

/**
 * Format impact annotation for display
 * @param {object} issue - Issue with root cause info
 * @returns {string} Formatted annotation
 */
function formatImpactAnnotation(issue) {
  if (!issue.isRootCause || !issue.impactCount) {
    return '';
  }
  return ` (fixes ${issue.impactCount} file${issue.impactCount > 1 ? 's' : ''})`;
}

/**
 * Get summary of optimization results
 * @param {object} results - Optimized results
 * @returns {string} Human-readable summary
 */
function getOptimizationSummary(results) {
  if (!results.optimization || !results.optimization.enabled) {
    return '';
  }

  const { originalIssueCount, optimizedIssueCount, collapsedCount } = results.optimization;
  
  if (collapsedCount === 0) {
    return 'No issues could be collapsed to a common root cause.';
  }

  const percentage = ((collapsedCount / originalIssueCount) * 100).toFixed(0);
  return `Optimized: ${originalIssueCount} issues → ${optimizedIssueCount} unique fixes (${percentage}% reduction via root cause analysis)`;
}

module.exports = {
  optimizeIssues,
  formatImpactAnnotation,
  getOptimizationSummary
};
