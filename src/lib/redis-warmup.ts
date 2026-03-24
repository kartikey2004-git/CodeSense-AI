// Redis warmup utility - establishes connection during app startup
import { getRedisClient } from "./redis";

export async function warmupRedisConnection() {
  try {
    console.log("Warming up Redis connection...");
    const client = await getRedisClient();
    await client.ping();
    console.log("Redis warmup successful");
    return true;
  } catch (error) {
    console.warn(
      "    Redis warmup failed, but application will continue:",
      error,
    );
    return false;
  }
}
