// Quota management for Gemini API
export class QuotaManager {
  private static lastResetTime = Date.now();
  private static requestCount = 0;
  private static readonly DAILY_LIMIT = 15; // Conservative limit for free tier
  private static readonly RESET_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  static canMakeRequest(): boolean {
    const now = Date.now();

    // Reset counter if 24 hours have passed
    if (now - this.lastResetTime > this.RESET_INTERVAL) {
      this.lastResetTime = now;
      this.requestCount = 0;
      return true;
    }

    return this.requestCount < this.DAILY_LIMIT;
  }

  static recordRequest(): void {
    this.requestCount++;
    console.log(
      `Gemini API request ${this.requestCount}/${this.DAILY_LIMIT} today`,
    );
  }

  static getRemainingRequests(): number {
    const now = Date.now();

    // Reset counter if 24 hours have passed
    if (now - this.lastResetTime > this.RESET_INTERVAL) {
      return this.DAILY_LIMIT;
    }

    return Math.max(0, this.DAILY_LIMIT - this.requestCount);
  }

  static getTimeUntilReset(): string {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    const timeUntilReset = this.RESET_INTERVAL - timeSinceReset;

    const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
    const minutes = Math.floor(
      (timeUntilReset % (1000 * 60 * 60)) / (1000 * 60),
    );

    return `${hours}h ${minutes}m`;
  }
}
