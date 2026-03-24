import { createHash } from "crypto";
import { getRedisClient } from "./redis";

// Cache configuration
const CACHE_CONFIG = {
  // TTL in seconds
  TTL: {
    QA_RESPONSE: 3600, // 1 hour - Q&A responses
    PROJECT_SUMMARY: 1800, // 30 minutes - project summaries
    COMMIT_DATA: 900, // 15 minutes - commit data
    EMBEDDING_SEARCH: 600, // 10 minutes - embedding search results
    MEETING_SUMMARY: 7200, // 2 hours - meeting summaries
    GITHUB_REPO_DATA: 1800, // 30 minutes - GitHub repo metadata
  },

  // Cache key prefixes
  KEYS: {
    QA_RESPONSE: "qa:",
    PROJECT_SUMMARY: "project:summary:",
    COMMIT_DATA: "commits:",
    EMBEDDING_SEARCH: "search:",
    MEETING_SUMMARY: "meeting:",
    GITHUB_REPO_DATA: "github:repo:",
  },
} as const;

// Check if cache bypass is enabled via environment
const isBypassEnabled = process.env.CACHE_BYPASS === "true";

// Cache metrics tracking
interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

const metrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
};

// Utility to create deterministic hash
export const createHashKey = (data: string): string => {
  return createHash("sha256").update(data).digest("hex").substring(0, 16);
};

// Cache wrapper class with error handling and metrics
export class CacheService {
  private redis = getRedisClient;

  // Generic get method with JSON parsing and error handling
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = await this.redis();
      const value = await client.get(key);

      if (value === null) {
        metrics.misses++;
        return null;
      }

      metrics.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      metrics.errors++;
      console.error(`Cache get error for key ${key}:`, error);
      // Enhanced fail-safe: return null and continue
      return null;
    }
  }

  // Generic set method with JSON serialization and TTL
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const client = await this.redis();
      const serialized = JSON.stringify(value);

      if (ttlSeconds) {
        await client.setex(key, ttlSeconds, serialized);
      } else {
        await client.set(key, serialized);
      }

      metrics.sets++;
    } catch (error) {
      metrics.errors++;
      console.error(`Cache set error for key ${key}:`, error);
      // Enhanced fail-safe: don't throw, just log
      // Cache failures should never break the main flow
    }
  }

  // Delete specific key
  async delete(key: string): Promise<void> {
    try {
      const client = await this.redis();
      await client.del(key);
      metrics.deletes++;
    } catch (error) {
      metrics.errors++;
      console.error(`Cache delete error for key ${key}:`, error);
      // Enhanced fail-safe: don't throw
    }
  }

  // Delete keys by pattern
  async deletePattern(pattern: string): Promise<void> {
    try {
      const client = await this.redis();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
        metrics.deletes += keys.length;
      }
    } catch (error) {
      metrics.errors++;
      console.error(
        `Cache delete pattern error for pattern ${pattern}:`,
        error,
      );
      // Enhanced fail-safe: don't throw
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      const client = await this.redis();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      metrics.errors++;
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  // Get TTL for key
  async getTTL(key: string): Promise<number> {
    try {
      const client = await this.redis();
      return await client.ttl(key);
    } catch (error) {
      metrics.errors++;
      console.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  // Q&A specific methods
  async getQAResponse(
    projectId: string,
    question: string,
  ): Promise<any | null> {
    const questionHash = createHashKey(question);
    const key = `${CACHE_CONFIG.KEYS.QA_RESPONSE}${projectId}:${questionHash}`;
    return await this.get(key);
  }

  async setQAResponse(
    projectId: string,
    question: string,
    response: any,
  ): Promise<void> {
    const questionHash = createHashKey(question);
    const key = `${CACHE_CONFIG.KEYS.QA_RESPONSE}${projectId}:${questionHash}`;
    await this.set(key, response, CACHE_CONFIG.TTL.QA_RESPONSE);
  }

  // Project summary methods
  async getProjectSummary(projectId: string): Promise<any | null> {
    const key = `${CACHE_CONFIG.KEYS.PROJECT_SUMMARY}${projectId}`;
    return await this.get(key);
  }

  async setProjectSummary(projectId: string, summary: any): Promise<void> {
    const key = `${CACHE_CONFIG.KEYS.PROJECT_SUMMARY}${projectId}`;
    await this.set(key, summary, CACHE_CONFIG.TTL.PROJECT_SUMMARY);
  }

  // Commit data methods
  async getCommitData(projectId: string): Promise<any[] | null> {
    const key = `${CACHE_CONFIG.KEYS.COMMIT_DATA}${projectId}`;
    return await this.get(key);
  }

  async setCommitData(projectId: string, commits: any[]): Promise<void> {
    const key = `${CACHE_CONFIG.KEYS.COMMIT_DATA}${projectId}`;
    await this.set(key, commits, CACHE_CONFIG.TTL.COMMIT_DATA);
  }

  // Embedding search results
  async getEmbeddingSearch(
    projectId: string,
    query: string,
  ): Promise<any[] | null> {
    const queryHash = createHashKey(query);
    const key = `${CACHE_CONFIG.KEYS.EMBEDDING_SEARCH}${projectId}:${queryHash}`;
    return await this.get(key);
  }

  async setEmbeddingSearch(
    projectId: string,
    query: string,
    results: any[],
  ): Promise<void> {
    const queryHash = createHashKey(query);
    const key = `${CACHE_CONFIG.KEYS.EMBEDDING_SEARCH}${projectId}:${queryHash}`;
    await this.set(key, results, CACHE_CONFIG.TTL.EMBEDDING_SEARCH);
  }

  // Meeting summary methods
  async getMeetingSummary(meetingId: string): Promise<any | null> {
    const key = `${CACHE_CONFIG.KEYS.MEETING_SUMMARY}${meetingId}`;
    return await this.get(key);
  }

  async setMeetingSummary(meetingId: string, summary: any): Promise<void> {
    const key = `${CACHE_CONFIG.KEYS.MEETING_SUMMARY}${meetingId}`;
    await this.set(key, summary, CACHE_CONFIG.TTL.MEETING_SUMMARY);
  }

  // GitHub repo data methods
  async getGithubRepoData(repoUrl: string): Promise<any | null> {
    const key = `${CACHE_CONFIG.KEYS.GITHUB_REPO_DATA}${createHashKey(repoUrl)}`;
    return await this.get(key);
  }

  async setGithubRepoData(repoUrl: string, data: any): Promise<void> {
    const key = `${CACHE_CONFIG.KEYS.GITHUB_REPO_DATA}${createHashKey(repoUrl)}`;
    await this.set(key, data, CACHE_CONFIG.TTL.GITHUB_REPO_DATA);
  }

  // Cache invalidation methods with fail-safe handling
  async invalidateProjectCache(projectId: string): Promise<void> {
    console.log(`Starting cache invalidation for project ${projectId}`);

    const operations = [
      {
        key: `${CACHE_CONFIG.KEYS.PROJECT_SUMMARY}${projectId}`,
        type: "delete",
      },
      { key: `${CACHE_CONFIG.KEYS.COMMIT_DATA}${projectId}`, type: "delete" },
      {
        key: `${CACHE_CONFIG.KEYS.QA_RESPONSE}${projectId}:*`,
        type: "pattern",
      },
      {
        key: `${CACHE_CONFIG.KEYS.EMBEDDING_SEARCH}${projectId}:*`,
        type: "pattern",
      },
    ];

    // Process each operation independently - don't let one failure break others
    const results = await Promise.allSettled(
      operations.map(async (op) => {
        try {
          if (op.type === "delete") {
            await this.delete(op.key);
            console.log(`Deleted cache key: ${op.key}`);
          } else if (op.type === "pattern") {
            await this.deletePattern(op.key);
            console.log(`Deleted cache pattern: ${op.key}`);
          }
          return { success: true, operation: op.key };
        } catch (error) {
          console.warn(`    Cache operation failed: ${op.key}`, error);
          return { success: false, operation: op.key, error };
        }
      }),
    );

    // Log results but don't throw
    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    ).length;
    const failed = results.length - successful;

    if (failed > 0) {
      console.warn(
        `    Cache invalidation partially failed: ${successful}/${results.length} operations succeeded`,
      );
      // Log specific failures
      results.forEach((result, index) => {
        const operation = operations[index];
        if (!operation) return; // Skip if operation doesn't exist

        if (
          result.status === "rejected" ||
          (result.status === "fulfilled" && !result.value.success)
        ) {
          console.warn(`  Failed operation: ${operation.key}`);
        }
      });
    } else {
      console.log(
        `Cache invalidation completed: ${successful} operations succeeded`,
      );
    }

    // Never throw - cache failures should not break the main flow
  }

  async invalidateMeetingCache(meetingId: string): Promise<void> {
    await this.delete(`${CACHE_CONFIG.KEYS.MEETING_SUMMARY}${meetingId}`);
  }

  async invalidateRepoCache(repoUrl: string): Promise<void> {
    const key = `${CACHE_CONFIG.KEYS.GITHUB_REPO_DATA}${createHashKey(repoUrl)}`;
    try {
      await this.delete(key);
    } catch (error) {
      console.warn(`Failed to invalidate repo cache for ${repoUrl}:`, error);
      // Don't throw - cache failures should not break the main flow
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.redis();
      const testKey = "health:check";
      await client.set(testKey, "ok", "EX", 5);
      const result = await client.get(testKey);
      await client.del(testKey);
      return result === "ok";
    } catch (error) {
      console.error("Cache health check failed:", error);
      return false;
    }
  }

  // Get cache statistics
  async getStats(): Promise<any> {
    try {
      const client = await this.redis();
      const info = await client.info("memory");
      const keyspace = await client.info("keyspace");

      return {
        memory: info,
        keyspace: keyspace,
        connected: true,
        metrics: { ...metrics }, // Copy to avoid external mutation
      };
    } catch (error) {
      console.error("Cache stats error:", error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metrics: { ...metrics },
      };
    }
  }

  // Reset metrics
  resetMetrics(): void {
    metrics.hits = 0;
    metrics.misses = 0;
    metrics.sets = 0;
    metrics.deletes = 0;
    metrics.errors = 0;
  }

  // Get current metrics
  getMetrics(): CacheMetrics {
    return { ...metrics };
  }

  // Optional cache bypass for debugging
  private bypassCache = isBypassEnabled;

  setBypass(bypass: boolean): void {
    this.bypassCache = bypass;
    console.log(
      `Cache bypass ${bypass ? "ENABLED" : "DISABLED"} (env: ${isBypassEnabled})`,
    );
  }

  isBypassed(): boolean {
    return this.bypassCache || isBypassEnabled;
  }
}

// Singleton instance
export const cache = new CacheService();
