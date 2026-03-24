import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { Document } from "@langchain/core/documents";
import { TRPCError } from "@trpc/server";
import { Octokit } from "octokit";

import { db } from "@/server/db";
import { summariseCode, generateEmbedding } from "./gemini";
import {
  smartChunkText,
  calculateChunkStats,
  validateChunks,
} from "./chunking";
import { isIgnoredFile } from "./filtering";
import type { EmbeddingVector, SafeSummary } from "@/types/types";

const maxRetries = 3;

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const isValidEmbedding = (value: unknown): value is EmbeddingVector => {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((v) => typeof v === "number")
  );
};

// NEW: Process multiple chunks with batch embedding generation
export const processChunksWithBatchEmbedding = async (
  chunks: Array<{ content: string; metadata: any }>,
  projectId: string,
  fileName: string,
): Promise<{ indexedChunks: number; skippedChunks: number }> => {
  let indexedChunks = 0;
  let skippedChunks = 0;

  try {
    console.log(
      `Processing ${chunks.length} chunks with batch embedding for: ${fileName}`,
    );

    // Step 1: Generate summaries for all chunks
    const chunkSummaries: Array<{ chunk: any; summary: string | null }> = [];

    for (const chunk of chunks) {
      let summary: SafeSummary | null = null;

      // Generate summary for chunk
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await summariseCode({
            pageContent: chunk.content,
            metadata: chunk.metadata,
          });

          if (isNonEmptyString(result)) {
            summary = result as SafeSummary;
            break;
          }

          console.log(
            `Chunk summary retry ${attempt} failed: ${fileName}:${chunk.metadata.chunkIndex}`,
          );
        } catch (error) {
          console.error("Chunk summary error:", error);
        }
      }

      chunkSummaries.push({ chunk, summary });
    }

    // Filter out chunks that failed summary generation
    const validChunks = chunkSummaries.filter((item) => item.summary !== null);
    const failedChunks = chunkSummaries.filter((item) => item.summary === null);

    console.log(
      `Summary generation: ${validChunks.length} success, ${failedChunks.length} failed`,
    );

    // Step 2: Generate embeddings in batches (batch size of 5 to respect rate limits)
    const BATCH_SIZE = 5;
    const allEmbeddings: Array<{
      chunk: any;
      summary: string;
      embedding: EmbeddingVector | null;
    }> = [];

    for (let i = 0; i < validChunks.length; i += BATCH_SIZE) {
      const batch = validChunks.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async ({ chunk, summary }) => {
        let embedding: EmbeddingVector | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const result = await generateEmbedding(summary!);

            if (isValidEmbedding(result)) {
              embedding = result;
              break;
            }

            console.log(
              `Batch embedding retry ${attempt} failed: ${fileName}:${chunk.metadata.chunkIndex}`,
            );
          } catch (error) {
            console.error("Batch embedding error:", error);
          }
        }

        return { chunk, summary: summary!, embedding };
      });

      const batchResults = await Promise.all(batchPromises);
      allEmbeddings.push(...batchResults);

      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < validChunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    // Step 3: Store all embeddings in database
    const validEmbeddings = allEmbeddings.filter(
      (item) => item.embedding !== null,
    );
    const failedEmbeddings = allEmbeddings.filter(
      (item) => item.embedding === null,
    );

    console.log(
      `Embedding generation: ${validEmbeddings.length} success, ${failedEmbeddings.length} failed`,
    );

    // Batch database operations
    const dbPromises = validEmbeddings.map(
      async ({ chunk, summary, embedding }) => {
        try {
          const record = await db.sourceCodeEmbedding.create({
            data: {
              projectId,
              fileName: fileName,
              summary: summary,
              sourceCode: chunk.content, // Store chunk content for reference
              isChunked: true,
              chunkIndex: chunk.metadata.chunkIndex,
              totalChunks: chunk.metadata.totalChunks,
              chunkContent: chunk.content,
              chunkMetadata: JSON.parse(JSON.stringify(chunk.metadata)),
              embeddingType: "chunk",
            },
          });

          // Update embedding vector
          try {
            await db.$executeRaw<void>`
              UPDATE "SourceCodeEmbedding"
              SET "summaryEmbedding" = ${embedding}::vector
              WHERE "id" = ${record.id}
            `;
          } catch (dbError) {
            console.error(
              `Failed to update embedding for chunk ${chunk.metadata.chunkIndex}:`,
              dbError,
            );
            throw new Error(
              `Embedding storage failed: ${dbError instanceof Error ? dbError.message : "Unknown database error"}`,
            );
          }

          return { success: true, chunkIndex: chunk.metadata.chunkIndex };
        } catch (error) {
          console.error(
            `Chunk DB insert failed: ${fileName}:${chunk.metadata.chunkIndex}`,
            error,
          );
          return { success: false, chunkIndex: chunk.metadata.chunkIndex };
        }
      },
    );

    const dbResults = await Promise.all(dbPromises);
    indexedChunks = dbResults.filter((r) => r.success).length;
    skippedChunks =
      dbResults.filter((r) => !r.success).length +
      failedChunks.length +
      failedEmbeddings.length;
  } catch (error) {
    console.error(`Batch chunk processing failed for: ${fileName}`, error);
    skippedChunks = chunks.length;
  }

  return { indexedChunks, skippedChunks };
};

// NEW: Process file with chunking strategy
export const processFileWithChunking = async (
  doc: Document,
  projectId: string,
  fileName: string,
): Promise<{ indexedChunks: number; skippedChunks: number }> => {
  let indexedChunks = 0;
  let skippedChunks = 0;

  try {
    // Generate chunks for this file
    const chunks = smartChunkText(doc.pageContent, fileName);

    if (chunks.length === 0) {
      console.log(`No chunks generated for: ${fileName}`);
      return { indexedChunks: 0, skippedChunks: 0 };
    }

    // Validate chunks with detailed logging
    const validation = validateChunks(chunks);
    if (validation.invalid.length > 0) {
      console.log(
        `    ${validation.invalid.length} invalid chunks for: ${fileName}`,
      );
      // Log details about invalid chunks for debugging
      validation.invalid.forEach((chunk, index) => {
        console.log(
          `  Invalid chunk ${index + 1}: ${chunk.content.length} chars, type: ${chunk.metadata.language}, path: ${chunk.metadata.filePath}`,
        );
      });
    }

    const validChunks = validation.valid;
    console.log(`Processing ${validChunks.length} chunks for: ${fileName}`);
    console.log(`Chunk stats:`, validation.stats);

    // Process chunks with batch embedding
    const result = await processChunksWithBatchEmbedding(
      validChunks,
      projectId,
      fileName,
    );

    indexedChunks = result.indexedChunks;
    skippedChunks = result.skippedChunks;
  } catch (error) {
    console.error(`Chunk processing failed for: ${fileName}`, error);
  }

  return { indexedChunks, skippedChunks };
};
export const loadGithubRepo = async (
  githubUrl: string,
  githubToken?: string, // to access a private repository
): Promise<Document[]> => {
  try {
    // First, detect the default branch
    const [owner, repo] = githubUrl.split("/").slice(-2);

    if (!owner || !repo) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid GitHub URL format",
      });
    }

    // Create octokit instance for API calls
    const octokit = new Octokit({
      auth: githubToken || undefined,
    });

    // Get repository info to find default branch
    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo,
    });

    const defaultBranch = repoData.default_branch || "main";
    console.log(`Using default branch: ${defaultBranch} for ${owner}/${repo}`);

    const loader = new GithubRepoLoader(githubUrl, {
      accessToken: githubToken || undefined, // access token for accessing private repositories

      branch: defaultBranch, // Use detected default branch

      recursive: true, // by default recursive : false - only going to loads top level folders and files
      // but here we need every files and folder , even they are deeply nested

      unknown: "warn", // if there are some unknown types like binaries and pdf it warns

      maxConcurrency: 5, // number of concurrent requests (multiple requests are being processed simultaneously) to make to GitHub API

      ignoreFiles: [
        // Lock files
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "bun.lockb",
        "requirements.txt",
        "poetry.lock",
        "Pipfile.lock",
        "composer.lock",
        "Gemfile.lock",
        "Cargo.lock",

        // Build artifacts and dist directories
        "dist/**",
        "build/**",
        "out/**",
        ".next/**",
        ".nuxt/**",
        ".vuepress/**",
        ".gatsby/**",
        "coverage/**",
        ".coverage/**",
        "node_modules/**",

        // Minified files
        "**/*.min.js",
        "**/*.min.css",
        "**/*.bundle.js",
        "**/*.chunk.js",

        // Auto-generated files
        "**/*.d.ts",
        ".env.*",
        ".env",
        "**/*.log",
        "**/*.tmp",

        // Cache and temp directories
        ".cache/**",
        ".tmp/**",
        "temp/**",
        "tmp/**",

        // OS files
        ".DS_Store",
        "Thumbs.db",

        // IDE files
        ".vscode/**",
        ".idea/**",
        ".swp",
        ".swo",
      ], // ignoring files while loading files from repo
    });

    const docs = await loader.load();

    if (!docs.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Repository is empty or unreadable.",
      });
    }

    return docs;
  } catch (error) {
    console.error("GitHub load failed:", error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (
        error.message.includes("404") ||
        error.message.includes("Not Found")
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Repository not found or inaccessible. Check if the repository exists and is public, or provide a GitHub token.",
        });
      }

      if (
        error.message.includes("403") ||
        error.message.includes("Forbidden")
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Repository access forbidden. You may need to provide a GitHub token for private repositories.",
        });
      }
    }

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Failed to load GitHub repository.",
    });
  }
};

export const indexGithubRepo = async (
  projectId: string,
  githubUrl: string,
  githubToken?: string,
) => {
  console.log(`  Starting GitHub repository indexing`);
  console.log(`Project ID: ${projectId}`);
  console.log(`GitHub URL: ${githubUrl}`);
  console.log(`Token provided: ${!!githubToken}`);

  try {
    // first load all files from github repository with help of github repo loader
    console.log(`Loading repository from GitHub...`);
    const docs = await loadGithubRepo(githubUrl, githubToken);
    console.log(`Successfully loaded ${docs.length} documents from GitHub`);

    if (!docs.length) {
      console.error(`  No source files found in repository ${githubUrl}`);
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No source files found.",
      });
    }

    console.log(`Loaded ${docs.length} files from repository`);

    // Track processing statistics
    let totalIndexedChunks = 0;
    let totalSkippedChunks = 0;
    let processedFiles = 0;
    let skippedFiles = 0;

    console.log(
      `Starting to process ${docs.length} files with chunking strategy`,
    );

    // Process each file with chunking strategy
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];

      if (!doc) {
        console.log(`    Skipping undefined document at index ${i}`);
        skippedFiles++;
        continue;
      }

      const fileName: string =
        typeof doc?.metadata?.source === "string"
          ? doc.metadata.source
          : "unknown";

      console.log(`\nProcessing ${i + 1}/${docs.length}: ${fileName}`);

      // Apply filtering logic BEFORE expensive operations
      if (isIgnoredFile(fileName)) {
        console.log(`Skipping ignored file: ${fileName}`);
        skippedFiles++;
        continue;
      }

      // Check if file is already processed (backward compatibility)
      console.log(`Checking if file ${fileName} is already indexed...`);
      const alreadyIndexed = await db.sourceCodeEmbedding.findFirst({
        where: {
          projectId: projectId,
          fileName: fileName,
          isChunked: true, // Check for chunked embeddings
        },
      });

      if (alreadyIndexed) {
        console.log(`File already chunked and indexed: ${fileName}`);
        processedFiles++;
        continue;
      }

      // Clean up old file-level embeddings if they exist
      await db.sourceCodeEmbedding.deleteMany({
        where: {
          projectId: projectId,
          fileName: fileName,
          isChunked: false,
        },
      });

      // Process file with chunking
      const result = await processFileWithChunking(doc, projectId, fileName);

      if (result.indexedChunks > 0) {
        totalIndexedChunks += result.indexedChunks;
        totalSkippedChunks += result.skippedChunks;
        processedFiles++;
        console.log(
          `Successfully processed ${result.indexedChunks} chunks for ${fileName}`,
        );
      } else {
        skippedFiles++;
        console.log(`  Failed to process any chunks for ${fileName}`);
      }
    }

    console.log(`\nIndexing Summary:`);
    console.log(`Total files: ${docs.length}`);
    console.log(`Processed files: ${processedFiles}`);
    console.log(`  Skipped files: ${skippedFiles}`);
    console.log(`Total chunks indexed: ${totalIndexedChunks}`);
    console.log(`    Total chunks skipped: ${totalSkippedChunks}`);

    return {
      totalFiles: docs.length,
      indexedFiles: processedFiles,
      totalChunks: totalIndexedChunks,
      skippedChunks: totalSkippedChunks,
    };
  } catch (error) {
    console.error(
      `  GitHub repository indexing failed for project ${projectId}:`,
      error,
    );
    console.error("Error details:", {
      projectId,
      githubUrl,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};
