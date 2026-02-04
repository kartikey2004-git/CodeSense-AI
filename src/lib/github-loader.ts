import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { Document } from "@langchain/core/documents";
import { TRPCError } from "@trpc/server";

import { db } from "@/server/db";
import { summariseCode, generateEmbedding } from "./gemini";
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

export const loadGithubRepo = async (
  githubUrl: string,
  githubToken?: string, // to access a private repository
): Promise<Document[]> => {
  /*

  - A class that represents a document loader for loading files from a GitHub repository.

  - langchain provides us with this kind of class that just represents a document loader for loading files from a GitHub repository.
  
  */

  try {
    const loader = new GithubRepoLoader(githubUrl, {
      accessToken: githubToken || undefined, // access token for accessing private repositories

      branch: "main", // all files on main branch

      recursive: true, // by default recursive : false - only going to loads top level folders and files

      // but here we need every files and folder , even they are deeply nested

      unknown: "warn", // if there are some unknown types like binaries and pdf it warns

      maxConcurrency: 5, // number of concurrent requests (multiple requests are being processed simultaneously) to make to GitHub API

      ignoreFiles: [
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "bun.lockb",
      ], // ignoring files while loading files from repo
    });

    /*
  
    - It Fetches the files from the GitHub repository and creates Document instances for each file.

    - returns a promise that resolves to an array of Document instances.
  
    */

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
  // first load all files from github repository with help of github repo loader

  const docs = await loadGithubRepo(githubUrl, githubToken);

  if (!docs.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No source files found.",
    });
  }

  /*

    - now we have all files from github repository in docs variable as array of Document type

    -  now we generate summary for each file pageContent and then generate vector embedding for that summary
  
  */

  // to keep track of processed files

  let indexedFiles = 0;

  // Loop through all files and generate summary for each file

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];

    const fileName: string =
      typeof doc?.metadata?.source === "string"
        ? doc.metadata.source
        : "unknown";

    console.log(`Processing ${i + 1}/${docs.length}: ${fileName}`);

    const alreadyIndexed = await db.sourceCodeEmbedding.findFirst({
      where: {
        projectId: projectId,
        fileName: fileName,
      },
    });

    if (alreadyIndexed) {
      console.log(`File already indexed: ${fileName}`);
      continue;
    }

    // for each file generate AI summary for code files and then take summary and generate vector embeddings for it

    let summary: SafeSummary | null = null;

    // Summarise Retry Loop for generating summary for all files

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await summariseCode(doc!);

        if (isNonEmptyString(result)) {
          summary = result as SafeSummary;
          break;
        }

        console.log(`Summary retry ${attempt} failed`);
      } catch (error) {
        console.error("Summary error:", error);
      }
    }

    if (!summary) {
      console.log(`Skipping file (summary failed): ${fileName}`);
      continue;
    }

    // Embedding Retry Loop for generating vector embeddings for all files

    let embedding: EmbeddingVector | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await generateEmbedding(summary);

        if (isValidEmbedding(result)) {
          embedding = result;
          break;
        }

        console.log(`Embedding retry ${attempt} failed: ${fileName}`);
      } catch (error) {
        console.error("Embedding error:", error);
      }
    }

    if (!embedding) {
      console.log(`Skipping file (embedding failed): ${fileName}`);
      continue;
    }

    try {
      // creating a new record in SourceCodeEmbedding table for each file embedding

      const record = await db.sourceCodeEmbedding.create({
        data: {
          projectId,
          fileName: fileName,
          summary: summary,
          sourceCode: String(doc!.pageContent),
        },
      });

      /*

        - but how we insert the vector  inside the postgres database 

          - just by nature of prisma , prisma doesn't support kind of inserting our vectors for now

          - that's why we need to write raw SQL query to insert the vector after we have created the row ---> basically update the row
      
      */

      await db.$executeRaw<void>`
          UPDATE "SourceCodeEmbedding"
          SET "summaryEmbedding" = ${embedding}::vector
          WHERE "id" = ${record.id}
        `;

      indexedFiles++;

      console.log("Indexed successfully");
    } catch (error) {
      console.error(`DB insert failed: ${fileName}`, error);
    }
  }

  return {
    totalFiles: docs.length,
    indexedFiles,
  };

  /*

    - now we have generate AI summary for files pagecontent(code) in repo and all embeddings for each file summary in allEmbeddings variable

    - now we need to store each embedding in our database with help of prisma client
  
  */
};
