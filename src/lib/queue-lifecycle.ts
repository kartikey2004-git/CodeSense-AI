import { closeQueueConnections } from "./queue";

// Graceful shutdown handler for BullMQ queues and workers
export class QueueLifecycleManager {
  private static isShuttingDown = false;

  // Initialize graceful shutdown handlers
  static initialize() {
    if (this.isShuttingDown) return;

    // Handle SIGTERM (sent by system/process managers)
    process.on("SIGTERM", () => {
      console.log("Received SIGTERM, gracefully shutting down queues...");
      this.gracefulShutdown();
    });

    // Handle SIGINT (sent by Ctrl+C)
    process.on("SIGINT", () => {
      console.log("Received SIGINT, gracefully shutting down queues...");
      this.gracefulShutdown();
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (err) => {
      console.error("Uncaught exception:", err);
      this.gracefulShutdown().then(() => {
        process.exit(1);
      });
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled rejection at:", promise, "reason:", reason);
      this.gracefulShutdown().then(() => {
        process.exit(1);
      });
    });
  }

  // Graceful shutdown with timeout
  private static async gracefulShutdown() {
    if (this.isShuttingDown) {
      console.log("Shutdown already in progress...");
      return;
    }

    this.isShuttingDown = true;
    console.log("Starting graceful shutdown of queue connections...");

    try {
      // Close all queue connections with timeout
      const shutdownPromise = closeQueueConnections();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Shutdown timeout")), 30000); // 30 second timeout
      });

      await Promise.race([shutdownPromise, timeoutPromise]);
      console.log("All queue connections closed successfully");
    } catch (error) {
      console.error("Error during graceful shutdown:", error);
    } finally {
      process.exit(0);
    }
  }

  // Force shutdown (emergency)
  static forceShutdown() {
    console.log("Force shutdown initiated");
    closeQueueConnections().catch((error) => {
      console.error("Error during force shutdown:", error);
    });
    process.exit(1);
  }
}

// Auto-initialize if this module is imported
QueueLifecycleManager.initialize();
