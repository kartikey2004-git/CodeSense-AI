import { getRedisClient } from "./redis";

export class QuotaManager {
  private static readonly QUOTA_KEY = "gemini:daily_quota";
  private static readonly QUOTA_RESET_KEY = "gemini:daily_quota_reset";
  private static readonly DAILY_LIMIT = 1000; // Production-appropriate limit
  private static readonly RESET_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  static async canMakeRequest(): Promise<boolean> {
    try {
      const redis = getRedisClient();
      const current = await redis.get(this.QUOTA_KEY);
      const count = current ? parseInt(current) : 0;

      if (count >= this.DAILY_LIMIT) {
        return false;
      }

      // Check if we need to reset (new day)
      const lastReset = await redis.get(this.QUOTA_RESET_KEY);
      const now = Date.now();

      if (!lastReset || now - parseInt(lastReset) > this.RESET_INTERVAL) {
        await redis.set(this.QUOTA_KEY, "0");
        await redis.set(this.QUOTA_RESET_KEY, now.toString());
        await redis.expire(this.QUOTA_KEY, this.RESET_INTERVAL / 1000);
        await redis.expire(this.QUOTA_RESET_KEY, this.RESET_INTERVAL / 1000);
        return true;
      }

      return count < this.DAILY_LIMIT;
    } catch (error) {
      console.error("Quota check failed:", error);
      return true; // Allow request if quota check fails
    }
  }

  static async recordRequest(): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.incr(this.QUOTA_KEY);

      // Set expiry if not already set
      await redis.expire(this.QUOTA_KEY, this.RESET_INTERVAL / 1000);

      console.log(`Gemini API request recorded`);
    } catch (error) {
      console.error("Quota recording failed:", error);
    }
  }

  static async getRemainingRequests(): Promise<number> {
    try {
      const redis = getRedisClient();
      const current = await redis.get(this.QUOTA_KEY);
      const count = current ? parseInt(current) : 0;
      return Math.max(0, this.DAILY_LIMIT - count);
    } catch (error) {
      console.error("Remaining requests check failed:", error);
      return this.DAILY_LIMIT;
    }
  }

  static getTimeUntilReset(): string {
    // For simplicity, return next midnight time
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const timeUntilReset = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
    const minutes = Math.floor(
      (timeUntilReset % (1000 * 60 * 60)) / (1000 * 60),
    );

    return `${hours}h ${minutes}m`;
  }

  // Legacy sync methods for backward compatibility
  static canMakeRequestSync(): boolean {
    console.warn("Using deprecated sync method. Use canMakeRequest() instead.");
    return true; // Always allow in sync mode, actual limiting handled async
  }

  static recordRequestSync(): void {
    console.warn("Using deprecated sync method. Use recordRequest() instead.");
    // Record asynchronously in background
    this.recordRequest().catch(console.error);
  }
}
