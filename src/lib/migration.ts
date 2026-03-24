// Migration utilities for handling backward compatibility

import { db } from "@/server/db";
import { smartChunkText } from "./chunking";
import { summariseCode, generateEmbedding } from "./gemini";
import type { EmbeddingVector, SafeSummary } from "@/types/types";

// Check if project needs migration from file-level to chunk-level embeddings
export async function checkMigrationStatus(projectId: string): Promise<{
  needsMigration: boolean;
  fileLevelCount: number;
  chunkLevelCount: number;
  totalFiles: number;
}> {
  const [fileLevelCount, chunkLevelCount] = await Promise.all([
    db.sourceCodeEmbedding.count({
      where: {
        projectId,
        isChunked: false,
      },
    }),
    db.sourceCodeEmbedding.count({
      where: {
        projectId,
        isChunked: true,
      },
    }),
  ]);

  const totalFiles = await db.sourceCodeEmbedding.groupBy({
    by: ["fileName"],
    where: {
      projectId,
    },
  });

  return {
    needsMigration: fileLevelCount > 0 && chunkLevelCount === 0,
    fileLevelCount,
    chunkLevelCount,
    totalFiles: totalFiles.length,
  };
}

// Migrate a single project from file-level to chunk-level embeddings
export async function migrateProjectToChunkedEmbeddings(
  projectId: string,
  options: {
    batchSize?: number;
    skipExisting?: boolean;
  } = {},
): Promise<{
  migratedFiles: number;
  failedFiles: number;
  totalChunks: number;
  errors: string[];
}> {
  const { batchSize = 5, skipExisting = true } = options;

  let migratedFiles = 0;
  let failedFiles = 0;
  let totalChunks = 0;
  const errors: string[] = [];

  console.log(`Starting migration for project ${projectId}`);

  try {
    // Get all file-level embeddings for this project
    const fileEmbeddings = await db.sourceCodeEmbedding.findMany({
      where: {
        projectId,
        isChunked: false,
      },
      select: {
        id: true,
        fileName: true,
        sourceCode: true,
        summary: true,
      },
    });

    console.log(`Found ${fileEmbeddings.length} files to migrate`);

    // Process files in batches
    for (let i = 0; i < fileEmbeddings.length; i += batchSize) {
      const batch = fileEmbeddings.slice(i, i + batchSize);

      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(fileEmbeddings.length / batchSize)}`,
      );

      const batchPromises = batch.map(async (fileEmbedding) => {
        try {
          // Check if chunked embeddings already exist
          if (skipExisting) {
            const existingChunks = await db.sourceCodeEmbedding.findFirst({
              where: {
                projectId,
                fileName: fileEmbedding.fileName,
                isChunked: true,
              },
            });

            if (existingChunks) {
              console.log(
                `Skipping ${fileEmbedding.fileName} (already chunked)`,
              );
              return {
                fileName: fileEmbedding.fileName,
                success: true,
                skipped: true,
              };
            }
          }

          // Generate chunks for this file
          const chunks = smartChunkText(
            fileEmbedding.sourceCode,
            fileEmbedding.fileName,
          );

          if (chunks.length === 0) {
            throw new Error("No chunks generated");
          }

          // Process each chunk
          let fileChunks = 0;
          for (const chunk of chunks) {
            try {
              // Generate summary for chunk (reuse existing summary if available)
              let summary: SafeSummary | null = null;

              // For now, use the original file summary for all chunks
              // TODO: Generate chunk-specific summaries for better results
              summary = fileEmbedding.summary as SafeSummary;

              // Generate embedding for chunk
              let embedding: EmbeddingVector | null = null;
              const maxRetries = 3;

              for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                  const result = await generateEmbedding(summary!);

                  if (
                    Array.isArray(result) &&
                    result.length > 0 &&
                    result.every((v) => typeof v === "number")
                  ) {
                    embedding = result as EmbeddingVector;
                    break;
                  }
                } catch (error) {
                  console.error(
                    `Chunk embedding retry ${attempt} failed: ${fileEmbedding.fileName}:${chunk.metadata.chunkIndex}`,
                    error,
                  );
                }
              }

              if (!embedding) {
                throw new Error("Failed to generate chunk embedding");
              }

              // Store chunk embedding
              const record = await db.sourceCodeEmbedding.create({
                data: {
                  projectId,
                  fileName: fileEmbedding.fileName,
                  summary: summary,
                  sourceCode: fileEmbedding.sourceCode,
                  isChunked: true,
                  chunkIndex: chunk.metadata.chunkIndex,
                  totalChunks: chunk.metadata.totalChunks,
                  chunkContent: chunk.content,
                  chunkMetadata: JSON.parse(JSON.stringify(chunk.metadata)),
                  embeddingType: "chunk",
                },
              });

              // Update embedding vector
              await db.$executeRaw<void>`
                UPDATE "SourceCodeEmbedding"
                SET "summaryEmbedding" = ${embedding}::vector
                WHERE "id" = ${record.id}
              `;

              fileChunks++;
            } catch (error) {
              console.error(
                `Failed to process chunk ${fileEmbedding.fileName}:${chunk.metadata.chunkIndex}:`,
                error,
              );
              throw error;
            }
          }

          // Delete old file-level embedding
          await db.sourceCodeEmbedding.delete({
            where: {
              id: fileEmbedding.id,
            },
          });

          totalChunks += fileChunks;
          console.log(
            `Migrated ${fileEmbedding.fileName} (${fileChunks} chunks)`,
          );

          return {
            fileName: fileEmbedding.fileName,
            success: true,
            chunks: fileChunks,
          };
        } catch (error) {
          const errorMsg = `Failed to migrate ${fileEmbedding.fileName}: ${error instanceof Error ? error.message : "Unknown error"}`;
          console.error(errorMsg);
          errors.push(errorMsg);

          return {
            fileName: fileEmbedding.fileName,
            success: false,
            error: errorMsg,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Update counters
      batchResults.forEach((result) => {
        if (result.success) {
          if (!result.skipped) {
            migratedFiles++;
          }
        } else {
          failedFiles++;
        }
      });

      // Small delay between batches to avoid overwhelming the system
      if (i + batchSize < fileEmbeddings.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    console.error(errorMsg);
    errors.push(errorMsg);
  }

  console.log(
    `Migration complete: ${migratedFiles} files migrated, ${failedFiles} failed, ${totalChunks} total chunks`,
  );

  return {
    migratedFiles,
    failedFiles,
    totalChunks,
    errors,
  };
}

// Get migration statistics for all projects
export async function getMigrationStats(): Promise<{
  totalProjects: number;
  projectsNeedingMigration: number;
  totalFileLevelEmbeddings: number;
  totalChunkLevelEmbeddings: number;
}> {
  const projects = await db.project.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  let projectsNeedingMigration = 0;
  let totalFileLevelEmbeddings = 0;
  let totalChunkLevelEmbeddings = 0;

  for (const project of projects) {
    const status = await checkMigrationStatus(project.id);

    if (status.needsMigration) {
      projectsNeedingMigration++;
    }

    totalFileLevelEmbeddings += status.fileLevelCount;
    totalChunkLevelEmbeddings += status.chunkLevelCount;
  }

  return {
    totalProjects: projects.length,
    projectsNeedingMigration,
    totalFileLevelEmbeddings,
    totalChunkLevelEmbeddings,
  };
}

// Utility to create database migration job
export async function createMigrationJob(projectId: string) {
  // This would be called by an admin or migration script
  const status = await checkMigrationStatus(projectId);

  if (!status.needsMigration) {
    return {
      success: false,
      message: "Project does not need migration",
      status,
    };
  }

  console.log(`  Starting migration job for project ${projectId}`);

  const result = await migrateProjectToChunkedEmbeddings(projectId);

  return {
    success: result.failedFiles === 0,
    message: `Migration completed: ${result.migratedFiles} files migrated`,
    result,
    status: await checkMigrationStatus(projectId),
  };
}
