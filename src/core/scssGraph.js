'use strict';

/**
 * SCSS Dependency Graph
 * 
 * Parses @import and @use statements to build a dependency graph.
 * Used to find common ancestors when multiple files have the same issue.
 * 
 * No external dependencies - pure regex-based parsing for our use case.
 */

const fs = require('fs');
const path = require('path');

/**
 * Build a dependency graph for all SCSS files in a directory
 * @param {string} projectPath - Root path to scan for SCSS files
 * @param {string[]} ignore - Patterns to ignore
 * @returns {ScssGraph} The dependency graph instance
 */
function buildGraph(projectPath, ignore = ['node_modules', 'dist', '.git', '.angular']) {
  // Resolve to absolute path for consistent comparisons with issue file paths
  const absolutePath = path.resolve(projectPath);
  const graph = new ScssGraph(absolutePath);
  graph.scan(ignore);
  return graph;
}

/**
 * SCSS Dependency Graph class
 */
class ScssGraph {
  constructor(projectPath) {
    this.projectPath = projectPath;
    // Map: normalized file path -> Set of normalized paths it imports
    this.imports = new Map();
    // Map: normalized file path -> Set of normalized paths that import it
    this.importedBy = new Map();
    // All discovered SCSS files
    this.files = new Set();
  }

  /**
   * Scan project for SCSS files and build the graph
   * @param {string[]} ignore - Patterns to ignore
   */
  scan(ignore) {
    const scssFiles = this._findScssFiles(this.projectPath, ignore);
    
    for (const file of scssFiles) {
      this.files.add(file);
      this._parseImports(file);
    }
  }

  /**
   * Find all SCSS files in a directory
   * @private
   */
  _findScssFiles(dir, ignore) {
    const files = [];

    const walk = (currentDir) => {
      let entries;
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch (e) {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        // Check ignore patterns
        let shouldIgnore = false;
        for (const pattern of ignore) {
          if (fullPath.includes(pattern) || entry.name === pattern) {
            shouldIgnore = true;
            break;
          }
        }
        if (shouldIgnore) continue;

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.scss') || entry.name.endsWith('.css'))) {
          files.push(this._normalize(fullPath));
        }
      }
    };

    walk(dir);
    return files;
  }

  /**
   * Parse @import and @use statements from a file
   * @private
   */
  _parseImports(filePath) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
      return;
    }

    const fileDir = path.dirname(filePath);
    const imports = new Set();

    // Match @import 'path' or @import "path"
    // Also handles multiple imports: @import 'a', 'b';
    const importRegex = /@import\s+(['"])([^'"]+)\1(?:\s*,\s*(['"])([^'"]+)\3)*\s*;/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      // First import in the statement
      const resolved = this._resolveImport(fileDir, match[2]);
      if (resolved) imports.add(resolved);
      
      // Check for additional imports in the same statement
      const fullMatch = match[0];
      const additionalImports = fullMatch.match(/['"]([^'"]+)['"]/g);
      if (additionalImports) {
        for (const imp of additionalImports) {
          const cleanPath = imp.replace(/['"]/g, '');
          const resolved = this._resolveImport(fileDir, cleanPath);
          if (resolved) imports.add(resolved);
        }
      }
    }

    // Match CSS @import url('path') or @import url("path") or @import url(path)
    const cssImportRegex = /@import\s+url\(['"]?([^'")]+)['"]?\)\s*;/g;
    while ((match = cssImportRegex.exec(content)) !== null) {
      const resolved = this._resolveImport(fileDir, match[1]);
      if (resolved) imports.add(resolved);
    }

    // Match @use 'path' (Sass modules)
    const useRegex = /@use\s+(['"])([^'"]+)\1/g;
    while ((match = useRegex.exec(content)) !== null) {
      const resolved = this._resolveImport(fileDir, match[2]);
      if (resolved) imports.add(resolved);
    }

    // Match @forward 'path' (Sass modules)
    const forwardRegex = /@forward\s+(['"])([^'"]+)\1/g;
    while ((match = forwardRegex.exec(content)) !== null) {
      const resolved = this._resolveImport(fileDir, match[2]);
      if (resolved) imports.add(resolved);
    }

    // Store the imports
    this.imports.set(filePath, imports);

    // Build reverse lookup (importedBy)
    for (const imported of imports) {
      if (!this.importedBy.has(imported)) {
        this.importedBy.set(imported, new Set());
      }
      this.importedBy.get(imported).add(filePath);
    }
  }

  /**
   * Resolve an import path to an actual file
   * Handles partials (_file.scss), extension omission, and index files
   * @private
   */
  _resolveImport(fromDir, importPath) {
    // Skip remote URLs and node_modules imports
    if (importPath.startsWith('http://') || 
        importPath.startsWith('https://') ||
        importPath.startsWith('~')) {
      return null;
    }

    const candidates = this._getImportCandidates(fromDir, importPath);
    
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return this._normalize(candidate);
      }
    }

    return null;
  }

  /**
   * Generate candidate file paths for an import
   * @private
   */
  _getImportCandidates(fromDir, importPath) {
    const candidates = [];
    const base = path.resolve(fromDir, importPath);
    const dir = path.dirname(base);
    const file = path.basename(base);

    // Direct path with extension
    candidates.push(base);
    
    // Add .scss extension
    candidates.push(base + '.scss');
    
    // Partial (underscore prefix)
    candidates.push(path.join(dir, '_' + file + '.scss'));
    candidates.push(path.join(dir, '_' + file));
    
    // Index file in directory
    candidates.push(path.join(base, '_index.scss'));
    candidates.push(path.join(base, 'index.scss'));

    return candidates;
  }

  /**
   * Normalize a file path for consistent comparison
   * @private
   */
  _normalize(filePath) {
    return path.normalize(filePath).toLowerCase();
  }

  /**
   * Get all files that a given file imports (direct dependencies)
   * @param {string} filePath - The file to check
   * @returns {string[]} Array of imported file paths
   */
  getImports(filePath) {
    const normalized = this._normalize(filePath);
    const imports = this.imports.get(normalized);
    return imports ? Array.from(imports) : [];
  }

  /**
   * Get all files that import a given file (direct dependents)
   * @param {string} filePath - The file to check
   * @returns {string[]} Array of files that import this one
   */
  getImportedBy(filePath) {
    const normalized = this._normalize(filePath);
    const importers = this.importedBy.get(normalized);
    return importers ? Array.from(importers) : [];
  }

  /**
   * Get all ancestors of a file (transitive importers)
   * @param {string} filePath - The file to check
   * @param {Set} visited - Already visited files (for cycle detection)
   * @returns {string[]} Array of all files that directly or indirectly import this one
   */
  getAllAncestors(filePath, visited = new Set()) {
    const normalized = this._normalize(filePath);
    if (visited.has(normalized)) return [];
    visited.add(normalized);

    const ancestors = [];
    const directImporters = this.getImportedBy(filePath);

    for (const importer of directImporters) {
      ancestors.push(importer);
      ancestors.push(...this.getAllAncestors(importer, visited));
    }

    return [...new Set(ancestors)];
  }

  /**
   * Get all descendants of a file (transitive imports)
   * @param {string} filePath - The file to check
   * @param {Set} visited - Already visited files (for cycle detection)
   * @returns {string[]} Array of all files that this file directly or indirectly imports
   */
  getAllDescendants(filePath, visited = new Set()) {
    const normalized = this._normalize(filePath);
    if (visited.has(normalized)) return [];
    visited.add(normalized);

    const descendants = [];
    const directImports = this.getImports(filePath);

    for (const imported of directImports) {
      descendants.push(imported);
      descendants.push(...this.getAllDescendants(imported, visited));
    }

    return [...new Set(descendants)];
  }

  /**
   * Find the common imported file(s) for a set of files
   * Returns the file(s) that, if fixed, would resolve issues in all given files
   * 
   * For SCSS, if multiple files all @import the same file and that file has an issue,
   * fixing the common import fixes all of them.
   * 
   * @param {string[]} files - Array of file paths with the same issue
   * @returns {object} Result with rootCause file(s) and impact info
   */
  findCommonAncestor(files) {
    if (!files || files.length === 0) {
      return { rootCause: null, impactedFiles: [], confidence: 0 };
    }

    if (files.length === 1) {
      return { 
        rootCause: files[0], 
        impactedFiles: [files[0]], 
        confidence: 1 
      };
    }

    const normalizedFiles = files.map(f => this._normalize(f));

    // Get all imports (descendants) for each file - these are files they depend on
    const descendantSets = normalizedFiles.map(f => {
      const descendants = new Set(this.getAllDescendants(f));
      descendants.add(f); // Include the file itself
      return descendants;
    });

    // Find intersection of all descendant sets - files that all input files import
    let commonImports = new Set(descendantSets[0]);
    for (let i = 1; i < descendantSets.length; i++) {
      commonImports = new Set(
        [...commonImports].filter(x => descendantSets[i].has(x))
      );
    }

    if (commonImports.size === 0) {
      // No common import - these files are independent
      return { 
        rootCause: null, 
        impactedFiles: files, 
        confidence: 0 
      };
    }

    // Find the "shallowest" common import (closest to the original files)
    // This is the one that is imported directly or with fewest steps
    // Prefer files that are imported by more of the original files directly
    let bestImport = null;
    let maxDirectImporters = -1;

    for (const candidate of commonImports) {
      // Skip if it's one of the original files themselves
      if (normalizedFiles.includes(candidate)) continue;
      
      // Count how many original files directly import this candidate
      const directImporters = this.getImportedBy(candidate);
      const directCount = normalizedFiles.filter(f => 
        directImporters.includes(f)
      ).length;
      
      if (directCount > maxDirectImporters) {
        maxDirectImporters = directCount;
        bestImport = candidate;
      }
    }

    // If no best import found (all common imports are the files themselves), pick the first
    if (!bestImport && commonImports.size > 0) {
      for (const candidate of commonImports) {
        if (!normalizedFiles.includes(candidate)) {
          bestImport = candidate;
          break;
        }
      }
    }

    if (!bestImport) {
      return { 
        rootCause: null, 
        impactedFiles: files, 
        confidence: 0 
      };
    }

    // Calculate confidence: what fraction of input files import this file?
    const importers = this.getImportedBy(bestImport);
    const allImporters = new Set(importers);
    // Also add transitive importers
    for (const imp of importers) {
      for (const transitive of this.getImportedBy(imp)) {
        allImporters.add(transitive);
      }
    }
    
    const coveredFiles = normalizedFiles.filter(f => 
      allImporters.has(f) || this.getAllDescendants(f).includes(bestImport)
    );
    const confidence = coveredFiles.length / normalizedFiles.length;

    return {
      rootCause: bestImport,
      impactedFiles: files,
      confidence
    };
  }

  /**
   * Check if fileA imports fileB (directly or indirectly)
   * @param {string} fileA - The potential importer
   * @param {string} fileB - The potential imported file
   * @returns {boolean}
   */
  imports(fileA, fileB) {
    const descendants = this.getAllDescendants(fileA);
    return descendants.includes(this._normalize(fileB));
  }

  /**
   * Get graph statistics
   * @returns {object} Stats about the graph
   */
  getStats() {
    let totalImports = 0;
    for (const imports of this.imports.values()) {
      totalImports += imports.size;
    }

    return {
      fileCount: this.files.size,
      edgeCount: totalImports,
      avgImportsPerFile: this.files.size > 0 ? (totalImports / this.files.size).toFixed(2) : 0
    };
  }
}

module.exports = {
  buildGraph,
  ScssGraph
};
