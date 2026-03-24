import { Redis } from "ioredis";

// Redis connection configuration with Docker compatibility
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 1, // Reduced to 1 for faster failure
  lazyConnect: true,
  enableOfflineQueue: false,
  connectTimeout: 3000, // Reduced to 3s for very fast detection
  commandTimeout: 2000, // Reduced to 2s for very fast timeout
  retryDelayOnClusterDown: 300,
  enableReadyCheck: true,
  maxHeartbeatPerSecond: 5,
  // Docker-specific settings
  family: 4, // Force IPv4 for Docker compatibility
  keepAlive: 30000, // 30 seconds keep alive (number, not boolean)
  // Add circuit breaker configuration
  retryDelayOnFailedCommand: 500,
};

// Singleton Redis client instance
let redisClient: Redis | null = null;
let isConnecting = false;
let connectionPromise: Promise<Redis> | null = null;

// Circuit breaker state
let redisAvailable = true;
let lastConnectionAttempt = 0;
const CONNECTION_COOLDOWN = 10000; // 10 seconds between failed attempts (reduced for development)

// Get singleton Redis client (shared across entire app) with circuit breaker
export const getRedisClient = async (): Promise<Redis> => {
  // Circuit breaker: don't try to reconnect if recently failed
  if (
    !redisAvailable &&
    Date.now() - lastConnectionAttempt < CONNECTION_COOLDOWN
  ) {
    throw new Error("Redis temporarily unavailable (circuit breaker active)");
  }

  // If we have a ready connection, reuse it
  if (redisClient && redisClient.status === "ready") {
    redisAvailable = true;
    return redisClient;
  }

  // If connection is in progress, wait for it
  if (isConnecting && connectionPromise) {
    try {
      const client = await connectionPromise;
      redisAvailable = true;
      return client;
    } catch (error) {
      // If the connection promise failed, reset and try again
      isConnecting = false;
      connectionPromise = null;
      // Fall through to create new connection
    }
  }

  // Create new connection
  isConnecting = true;
  lastConnectionAttempt = Date.now();
  connectionPromise = (async () => {
    try {
      // Clean up any existing client
      if (redisClient) {
        try {
          await redisClient.quit();
        } catch (e) {
          // Ignore cleanup errors
        }
        redisClient = null;
      }

      console.log("Attempting Redis connection to:", {
        host: redisConfig.host,
        port: redisConfig.port,
        hasPassword: !!redisConfig.password,
      });

      redisClient = new Redis(redisConfig);

      // Set up event handlers first
      redisClient.on("connect", () => {
        console.log("Redis client connected");
      });

      redisClient.on("ready", () => {
        console.log("Redis client ready");
        redisAvailable = true;
        isConnecting = false;
      });

      redisClient.on("error", (error) => {
        console.error("  Redis client error:", error.message);
        redisAvailable = false;
        // Don't immediately reset - let the connection retry naturally
      });

      redisClient.on("close", () => {
        console.log("Redis client connection closed");
        redisAvailable = false;
        redisClient = null;
        isConnecting = false;
      });

      redisClient.on("reconnecting", () => {
        console.log("Redis client reconnecting...");
      });

      // Wait for connection with timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Redis connection timeout"));
        }, 2000); // Reduced to 2 seconds for very fast detection

        const checkReady = () => {
          if (redisClient && redisClient.status === "ready") {
            clearTimeout(timeout);
            resolve();
          } else if (
            redisClient &&
            (redisClient.status === "end" || redisClient.status === "close")
          ) {
            clearTimeout(timeout);
            reject(new Error("Redis connection closed"));
          } else {
            setTimeout(checkReady, 50); // Check every 50ms
          }
        };

        // Start checking after a short delay
        setTimeout(checkReady, 50);
      });

      return redisClient;
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
      redisAvailable = false;
      if (redisClient) {
        try {
          await redisClient.quit();
        } catch (e) {
          // Ignore cleanup errors
        }
        redisClient = null;
      }
      isConnecting = false;
      connectionPromise = null;
      throw error;
    }
  })();
  return connectionPromise;
};

// Get Redis connection options for BullMQ (uses same config but different instance)
export const getRedisConnectionOptions = () => {
  return {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    maxRetriesPerRequest: null, // Required for BullMQ workers
    lazyConnect: true,
    enableOfflineQueue: false,
  };
};

// Health check for Redis with Docker diagnostics
export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    console.log("Checking Redis health...");
    const client = await getRedisClient();
    const result = await client.ping();
    console.log("Redis health check successful:", result);
    return result === "PONG";
  } catch (error) {
    console.error("  Redis health check failed:", error);
    console.log("Docker troubleshooting tips:");
    console.log("  1. Ensure Redis container is running: docker ps");
    console.log("  2. Check port mapping: docker port <redis-container>");
    console.log("  3. Verify REDIS_HOST and REDIS_PORT env vars");
    console.log(
      "  4. Test connection: docker exec -it <redis-container> redis-cli ping",
    );
    return false;
  }
};

// Graceful shutdown
export const closeRedisConnection = async (): Promise<void> => {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      console.log("Redis connection closed gracefully");
    }
  } catch (error) {
    console.error("Error closing Redis connection:", error);
  }
};

// Process signal handlers for graceful shutdown
process.on("SIGINT", closeRedisConnection);
process.on("SIGTERM", closeRedisConnection);
process.on("SIGUSR2", closeRedisConnection); // For nodemon

export default getRedisClient;
