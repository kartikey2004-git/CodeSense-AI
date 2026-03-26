import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { TRPCError } from "@trpc/server";
import { Octokit } from "octokit";
import * as path from "node:path";

import { db } from "@/server/db";
import { generateEmbedding, summariseCode } from "@/lib/gemini";
import { storeEmbedding } from "@/lib/vector-operations";
import { isIgnoredFile } from "./filtering";
import type { EmbeddingVector } from "@/types/types";

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
      accessToken: githubToken || undefined,
      branch: defaultBranch,
      recursive: true,
      unknown: "warn",
      maxConcurrency: 3, // Control GitHub API rate limits
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
        ".vscode/**",
        ".idea/**",
        ".swp",
        ".swo",
      ],
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
  console.log(`Starting GitHub repository indexing`);
  console.log(`Project ID: ${projectId}`);
  console.log(`GitHub URL: ${githubUrl}`);
  console.log(`Token provided: ${!!githubToken}`);

  try {
    // Load repository using LangChain's built-in loader
    console.log(`Loading repository from GitHub...`);
    const docs = await loadGithubRepo(githubUrl, githubToken);
    console.log(`Successfully loaded ${docs.length} documents from GitHub`);

    if (!docs.length) {
      console.error(`No source files found in repository ${githubUrl}`);
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No source files found.",
      });
    }

    // Use LangChain's text splitter for optimal chunking
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2000,
      chunkOverlap: 200,
    });

    console.log(`Splitting ${docs.length} documents into chunks`);
    const chunks = await splitter.splitDocuments(docs);
    console.log(`Created ${chunks.length} chunks for processing`);

    // Filter chunks before processing
    const filteredChunks = chunks.filter(
      (chunk) => !isIgnoredFile(chunk.metadata.source),
    );
    console.log(`Filtered to ${filteredChunks.length} relevant chunks`);

    // Track processing statistics
    let processedCount = 0;
    let failedCount = 0;
    let skippedCount = chunks.length - filteredChunks.length;

    console.log(
      `Starting to process ${filteredChunks.length} chunks with optimized batching`,
    );

    // Process chunks in reasonable batch size with proper error handling
    const BATCH_SIZE = 20;
    for (let i = 0; i < filteredChunks.length; i += BATCH_SIZE) {
      const batch = filteredChunks.slice(i, i + BATCH_SIZE);

      console.log(
        `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(filteredChunks.length / BATCH_SIZE)}`,
      );

      const results = await Promise.allSettled(
        batch.map(async (chunk) => {
          try {
            // Check if chunk is already processed
            const fileName = chunk.metadata.source;
            const alreadyIndexed = await db.sourceCodeEmbedding.findFirst({
              where: {
                projectId: projectId,
                fileName: path.basename(fileName),
                sourceCode: chunk.pageContent.substring(0, 100), // Check first 100 chars
              },
            });

            if (alreadyIndexed) {
              console.log(`Chunk already indexed: ${fileName}`);
              return { status: "skipped", fileName };
            }

            // Use AI to generate intelligent summary
            const summary = await summariseCode(chunk);

            // Generate embedding for the summary
            const embedding = await generateEmbedding(summary);

            if (!embedding || embedding.length === 0) {
              console.warn(`Failed to generate embedding for ${fileName}`);
              return {
                status: "failed",
                fileName,
                error: "No embedding generated",
              };
            }

            // Store embedding using vector operations
            await storeEmbedding({
              projectId,
              fileName: path.basename(fileName),
              sourceCode: chunk.pageContent,
              summary,
              embedding,
            });

            return { status: "success", fileName };
          } catch (error) {
            console.error(
              `Failed to process chunk ${chunk.metadata.source}:`,
              error,
            );
            return {
              status: "failed",
              fileName: chunk.metadata.source,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        }),
      );

      // Process batch results
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          if (result.value.status === "success") {
            processedCount++;
          } else if (result.value.status === "failed") {
            failedCount++;
          }
        } else {
          failedCount++;
        }
      });

      // Add delay between batches to respect rate limits
      if (i + BATCH_SIZE < filteredChunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`\nIndexing Summary:`);
    console.log(`Total documents: ${docs.length}`);
    console.log(`Total chunks: ${chunks.length}`);
    console.log(`Filtered chunks: ${filteredChunks.length}`);
    console.log(`Skipped chunks: ${skippedCount}`);
    console.log(`Processed chunks: ${processedCount}`);
    console.log(`Failed chunks: ${failedCount}`);

    return {
      totalFiles: docs.length,
      indexedFiles: processedCount,
      totalChunks: chunks.length,
      skippedChunks: failedCount + skippedCount,
    };
  } catch (error) {
    console.error(
      `GitHub repository indexing failed for project ${projectId}:`,
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
