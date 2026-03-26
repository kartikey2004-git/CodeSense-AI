import Redis from "ioredis";

const baseRedisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

export const getQueueRedisOptions = () => ({
  ...baseRedisConfig,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 2000, 20000); // Exponential backoff, max 20s
    return delay;
  },
});

// Redis configuration for BullMQ Workers - wait for reconnection
export const getWorkerRedisOptions = () => ({
  ...baseRedisConfig,
  // Keep offline queue for workers - wait until Redis is available
  enableOfflineQueue: true,
  // Infinite retries for workers
  maxRetriesPerRequest: null,
  // Retry strategy for workers
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 2000, 20000); // Exponential backoff, max 20s
    return delay;
  },
});

// Legacy function for backward compatibility
export const getRedisConnectionOptions = () => getQueueRedisOptions();

let client: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!client) {
    client = new Redis(baseRedisConfig);

    client.on("error", (error) => {
      console.error("Redis error:", error);
    });
  }
  return client;
};
