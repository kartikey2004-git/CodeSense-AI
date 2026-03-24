/**
 * Utility functions for filtering out irrelevant files and commits
 * Prevents unnecessary AI processing and embedding generation
 */

// Lock files and dependency files to ignore
const IGNORED_FILE_PATTERNS = [
  // Lock files
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /bun\.lockb$/,
  /requirements\.txt$/,
  /poetry\.lock$/,
  /Pipfile\.lock$/,
  /composer\.lock$/,
  /Gemfile\.lock$/,
  /Cargo\.lock$/,

  // Build artifacts and dist
  /^dist\//,
  /^build\//,
  /^out\//,
  /^\.next\//,
  /^\.nuxt\//,
  /^\.vuepress\//,
  /^\.gatsby\//,
  /^coverage\//,
  /^\.coverage\//,
  /^node_modules\//,

  // Minified files
  /\.min\.js$/,
  /\.min\.css$/,
  /\.bundle\.js$/,
  /\.chunk\.js$/,

  // Auto-generated files
  /\.d\.ts$/,
  /^\.env\./,
  /^\.env$/,
  /\.log$/,
  /\.tmp$/,

  // Cache and temp directories
  /^\.cache\//,
  /^\.tmp\//,
  /^temp\//,
  /^tmp\//,

  // OS files
  /^\.DS_Store$/,
  /^Thumbs\.db$/,

  // IDE files
  /^\.vscode\//,
  /^\.idea\//,
  /^\.swp$/,
  /^\.swo$/,
];

// Dependency-only commit message patterns
const DEPENDENCY_COMMIT_PATTERNS = [
  /bump/i,
  /dependency/i,
  /dependencies/i,
  /lock/i,
  /version update/i,
  /update version/i,
  /^chore\(deps?\)/i,
  /^fix\(deps?\)/i,
  /npm audit/i,
  /security update/i,
  /package update/i,
  /upgrade/i,
  /downgrade/i,
];

/**
 * Check if a file should be ignored based on its path
 */
export function isIgnoredFile(filePath: string): boolean {
  return IGNORED_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
}

/**
 * Check if a commit should be ignored based on its message
 */
export function shouldIgnoreCommit(commitMessage: string): boolean {
  return DEPENDENCY_COMMIT_PATTERNS.some((pattern) =>
    pattern.test(commitMessage),
  );
}

/**
 * Filter files to only include relevant ones for processing
 */
export function filterRelevantFiles(files: string[]): string[] {
  return files.filter((file) => !isIgnoredFile(file));
}

/**
 * Check if a commit has any relevant files
 */
export function hasRelevantFiles(files: string[]): boolean {
  const relevantFiles = filterRelevantFiles(files);
  return relevantFiles.length > 0;
}

/**
 * Comprehensive commit filtering check
 * Returns true if the commit should be processed, false if it should be skipped
 */
export function shouldProcessCommit(
  commitMessage: string,
  files: string[],
): boolean {
  // Skip if commit message indicates dependency-only changes
  if (shouldIgnoreCommit(commitMessage)) {
    console.log(
      `Skipping dependency-only commit: ${commitMessage.substring(0, 50)}...`,
    );
    return false;
  }

  // Skip if no relevant files
  if (!hasRelevantFiles(files)) {
    console.log(
      `Skipping commit with no relevant files: ${commitMessage.substring(0, 50)}...`,
    );
    return false;
  }

  return true;
}

/**
 * Get statistics about filtering for logging
 */
export function getFilteringStats(files: string[]): {
  total: number;
  relevant: number;
  ignored: number;
  ignoredFiles: string[];
} {
  const relevantFiles = filterRelevantFiles(files);
  const ignoredFiles = files.filter((file) => isIgnoredFile(file));

  return {
    total: files.length,
    relevant: relevantFiles.length,
    ignored: ignoredFiles.length,
    ignoredFiles: ignoredFiles.slice(0, 10), // Show first 10 for logging
  };
}
