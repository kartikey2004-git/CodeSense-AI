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

// Utility to create deterministic hash
export const createHashKey = (data: string): string => {
  return createHash("sha256").update(data).digest("hex").substring(0, 16);
};

// Simplified cache service
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = getRedisClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for ${key}:`, error);
      return null;
    }
  },

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const client = getRedisClient();
      const serialized = JSON.stringify(value);
      ttlSeconds !== undefined
        ? client.setex(key, ttlSeconds, serialized)
        : client.set(key, serialized);
    } catch (error) {
      console.error(`Cache set error for ${key}:`, error);
    }
  },

  async del(key: string): Promise<void> {
    try {
      const client = getRedisClient();
      await client.del(key);
    } catch (error) {
      console.error(`Cache del error for ${key}:`, error);
    }
  },

  async deletePattern(pattern: string): Promise<void> {
    try {
      const client = getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      const client = getRedisClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for ${key}:`, error);
      return false;
    }
  },

  // Q&A specific methods
  async getQAResponse(
    projectId: string,
    question: string,
  ): Promise<any | null> {
    const questionHash = createHashKey(question);
    const key = `${CACHE_CONFIG.KEYS.QA_RESPONSE}${projectId}:${questionHash}`;
    return await this.get(key);
  },

  async setQAResponse(
    projectId: string,
    question: string,
    response: any,
  ): Promise<void> {
    const questionHash = createHashKey(question);
    const key = `${CACHE_CONFIG.KEYS.QA_RESPONSE}${projectId}:${questionHash}`;
    await this.set(key, response, CACHE_CONFIG.TTL.QA_RESPONSE);
  },

  // Project summary methods
  async getProjectSummary(projectId: string): Promise<any | null> {
    const key = `${CACHE_CONFIG.KEYS.PROJECT_SUMMARY}${projectId}`;
    return await this.get(key);
  },

  async setProjectSummary(projectId: string, summary: any): Promise<void> {
    const key = `${CACHE_CONFIG.KEYS.PROJECT_SUMMARY}${projectId}`;
    await this.set(key, summary, CACHE_CONFIG.TTL.PROJECT_SUMMARY);
  },

  // Commit data methods
  async getCommitData(projectId: string): Promise<any[] | null> {
    const key = `${CACHE_CONFIG.KEYS.COMMIT_DATA}${projectId}`;
    return await this.get(key);
  },

  async setCommitData(projectId: string, commits: any[]): Promise<void> {
    const key = `${CACHE_CONFIG.KEYS.COMMIT_DATA}${projectId}`;
    await this.set(key, commits, CACHE_CONFIG.TTL.COMMIT_DATA);
  },

  // Embedding search results
  async getEmbeddingSearch(
    projectId: string,
    query: string,
  ): Promise<any[] | null> {
    const queryHash = createHashKey(query);
    const key = `${CACHE_CONFIG.KEYS.EMBEDDING_SEARCH}${projectId}:${queryHash}`;
    return await this.get(key);
  },

  async setEmbeddingSearch(
    projectId: string,
    query: string,
    results: any[],
  ): Promise<void> {
    const queryHash = createHashKey(query);
    const key = `${CACHE_CONFIG.KEYS.EMBEDDING_SEARCH}${projectId}:${queryHash}`;
    await this.set(key, results, CACHE_CONFIG.TTL.EMBEDDING_SEARCH);
  },

  // Meeting summary methods
  async getMeetingSummary(meetingId: string): Promise<any | null> {
    const key = `${CACHE_CONFIG.KEYS.MEETING_SUMMARY}${meetingId}`;
    return await this.get(key);
  },

  async setMeetingSummary(meetingId: string, summary: any): Promise<void> {
    const key = `${CACHE_CONFIG.KEYS.MEETING_SUMMARY}${meetingId}`;
    await this.set(key, summary, CACHE_CONFIG.TTL.MEETING_SUMMARY);
  },

  // GitHub repo data methods
  async getGithubRepoData(repoUrl: string): Promise<any | null> {
    const key = `${CACHE_CONFIG.KEYS.GITHUB_REPO_DATA}${createHashKey(repoUrl)}`;
    return await this.get(key);
  },

  async setGithubRepoData(repoUrl: string, data: any): Promise<void> {
    const key = `${CACHE_CONFIG.KEYS.GITHUB_REPO_DATA}${createHashKey(repoUrl)}`;
    await this.set(key, data, CACHE_CONFIG.TTL.GITHUB_REPO_DATA);
  },

  // Cache invalidation methods
  async invalidateProjectCache(projectId: string): Promise<void> {
    const patterns = [
      `${CACHE_CONFIG.KEYS.PROJECT_SUMMARY}${projectId}`,
      `${CACHE_CONFIG.KEYS.COMMIT_DATA}${projectId}`,
      `${CACHE_CONFIG.KEYS.QA_RESPONSE}${projectId}:*`,
      `${CACHE_CONFIG.KEYS.EMBEDDING_SEARCH}${projectId}:*`,
    ];

    for (const pattern of patterns) {
      if (pattern.includes("*")) {
        await this.deletePattern(pattern);
      } else {
        await this.del(pattern);
      }
    }
  },

  async invalidateMeetingCache(meetingId: string): Promise<void> {
    await this.del(`${CACHE_CONFIG.KEYS.MEETING_SUMMARY}${meetingId}`);
  },

  async invalidateRepoCache(repoUrl: string): Promise<void> {
    const key = `${CACHE_CONFIG.KEYS.GITHUB_REPO_DATA}${createHashKey(repoUrl)}`;
    await this.del(key);
  },

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const client = getRedisClient();
      const testKey = "health:check";
      await client.set(testKey, "ok", "EX", 5);
      const result = await client.get(testKey);
      await client.del(testKey);
      return result === "ok";
    } catch (error) {
      console.error("Cache health check failed:", error);
      return false;
    }
  },
};
