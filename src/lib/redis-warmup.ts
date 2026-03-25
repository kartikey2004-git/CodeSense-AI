// Redis warmup utility - establishes connection during app startup
import { getRedisClient } from "./redis";

export async function warmupRedisConnection() {
  // Skip warmup during build time
  const isBuildTime =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NODE_ENV === "production";
  if (isBuildTime) {
    console.log("Skipping Redis warmup during build time");
    return false;
  }

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
