import type { SearchResult } from "@/types/types";

/**
 * Deduplicates search results by file path, keeping only the highest scoring chunk per file.
 * 
 * @param results - Array of search results (chunk-level)
 * @returns Deduplicated array with one result per file (highest similarity score)
 */
export function dedupeByFile(results: SearchResult[]): SearchResult[] {
  if (!results || results.length === 0) {
    return [];
  }

  // Group by fileName and track highest similarity per file
  const fileMap = new Map<string, SearchResult>();

  for (const result of results) {
    if (!result.fileName) continue;

    const existing = fileMap.get(result.fileName);
    
    // Keep the result with higher similarity score
    if (!existing || (result.similarity > existing.similarity)) {
      fileMap.set(result.fileName, result);
    }
  }

  // Convert back to array and sort by similarity (descending)
  return Array.from(fileMap.values()).sort((a, b) => b.similarity - a.similarity);
}

/**
 * Alternative deduplication that preserves chunk information while showing unique files.
 * This keeps the best chunk per file but maintains chunk metadata for context.
 * 
 * @param results - Array of search results (chunk-level)
 * @returns Deduplicated array with one result per file (highest similarity score)
 */
export function dedupeByFileWithChunkInfo(results: SearchResult[]): SearchResult[] {
  if (!results || results.length === 0) {
    return [];
  }

  // Group by fileName and track highest similarity per file
  const fileMap = new Map<string, SearchResult>();

  for (const result of results) {
    if (!result.fileName) continue;

    const existing = fileMap.get(result.fileName);
    
    // Keep the result with higher similarity score
    if (!existing || (result.similarity > existing.similarity)) {
      fileMap.set(result.fileName, result);
    }
  }

  // Convert back to array and sort by similarity (descending)
  return Array.from(fileMap.values()).sort((a, b) => b.similarity - a.similarity);
}
