// Redis warmup utility - establishes connection during app startup
import { getRedisClient } from "./redis";

export async function warmupRedisConnection(): Promise<void> {
  console.log("Redis warmup skipped - using lazy connection");
}
