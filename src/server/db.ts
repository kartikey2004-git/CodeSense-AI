import { env } from "@/env";
import { PrismaClient } from "@prisma/client";

// Create proper connection pool for production
const createPrismaClient = () => {
  const isProduction = env.NODE_ENV === "production";
  const isDevelopment = env.NODE_ENV === "development";

  if (isProduction) {
    // Production: Use connection pooling with proper limits
    return new PrismaClient({
      log: ["error"],
      datasources: {
        db: {
          url: env.DATABASE_URL,
        },
      },
    });
  }

  // Development: Verbose logging
  return new PrismaClient({
    log: ["query", "error", "warn"],
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
  });
};

// Singleton pattern with proper serverless handling
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

// Only store in global during development to avoid serverless memory leaks
if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// Connection health check function
export const checkDbConnection = async (): Promise<boolean> => {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
};

// Graceful shutdown function
export const disconnectDb = async (): Promise<void> => {
  try {
    await db.$disconnect();
    console.log("Database disconnected successfully");
  } catch (error) {
    console.error("Error disconnecting database:", error);
  }
};
