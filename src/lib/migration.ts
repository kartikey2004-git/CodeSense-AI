// Migration utilities for handling backward compatibility

import { db } from "@/server/db";

// Check if project needs migration (simplified since chunking was removed)
export async function checkMigrationStatus(projectId: string): Promise<{
  needsMigration: boolean;
  embeddingCount: number;
}> {
  const embeddingCount = await db.sourceCodeEmbedding.count({
    where: {
      projectId,
    },
  });

  return {
    needsMigration: false, // No migration needed with current schema
    embeddingCount,
  };
}

// Get migration statistics for all projects
export async function getMigrationStats(): Promise<{
  totalProjects: number;
  totalEmbeddings: number;
}> {
  const projects = await db.project.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  let totalEmbeddings = 0;

  for (const project of projects) {
    const status = await checkMigrationStatus(project.id);
    totalEmbeddings += status.embeddingCount;
  }

  return {
    totalProjects: projects.length,
    totalEmbeddings,
  };
}

// Placeholder function for compatibility - no longer needed
export async function migrateProjectToChunkedEmbeddings(
  projectId: string,
  options?: any,
): Promise<{
  migratedFiles: number;
  failedFiles: number;
  totalChunks: number;
  errors: string[];
}> {
  return {
    migratedFiles: 0,
    failedFiles: 0,
    totalChunks: 0,
    errors: ["Chunking migration is no longer supported"],
  };
}

// Utility to create database migration job
export async function createMigrationJob(projectId: string) {
  const status = await checkMigrationStatus(projectId);

  if (!status.needsMigration) {
    return {
      success: false,
      message: "Project does not need migration",
      status,
    };
  }

  return {
    success: true,
    message: "No migration required with current schema",
    status,
  };
}
