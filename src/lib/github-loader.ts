import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { Document } from "@langchain/core/documents";
import { TRPCError } from "@trpc/server";

import { db } from "@/server/db";
import { summariseCode, generateEmbedding } from "./gemini";

type EmbeddingResult = {
  summary: string;
  embedding: number[];
  sourceCode: string;
  fileName: string;
};

function isEmbeddingResult(
  value: EmbeddingResult | null,
): value is EmbeddingResult {
  return value !== null;
}

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

const generateEmbeddings = async (
  docs: Document[],
): Promise<EmbeddingResult[]> => {
  /*
  
    - this function is going to loop through all files document

    - and generate AI summary for files pageContent and then take summary and generate vector embeddings for it
  
  */

  const results = await Promise.allSettled(
    docs.map(async (doc) => {
      try {
        // for each document generate summary
        const summary = await summariseCode(doc);

        if (!summary?.trim()) return null;

        // for each document summary : generate embedding

        const embedding = await generateEmbedding(summary);

        if (!embedding.length) return null;

        return {
          summary,
          embedding,
          sourceCode: JSON.parse(JSON.stringify(doc.pageContent)), // parsing and then convert to string in case of any error

          fileName: doc.metadata.source ?? "unknown",
        };
      } catch {
        return null;
      }
    }),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<EmbeddingResult | null> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value)
    .filter(isEmbeddingResult);
};

export const indexGithubRepo = async (
  projectId: string,
  githubUrl: string,
  githubToken?: string,
) => {
  // first load all files from github repository with help of github repo loader

  const docs = await loadGithubRepo(githubUrl, githubToken);

  /*

    - now we have all files from github repository in docs variable as array of Document type

    -  now we generate summary for each file pageContent and then generate vector embedding for that summary
  
  */

  const embeddings = await generateEmbeddings(docs);

  if (!embeddings.length) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No valid embeddings generated.",
    });
  }

  /*

    - now we have generate AI summary for files pagecontent(code) in repo and all embeddings for each file summary in allEmbeddings variable

    - now we need to store each embedding in our database with help of prisma client
  
  */

  await Promise.allSettled(
    embeddings.map(async (embedding, index) => {
      try {
        console.log(
          `Indexing ${index + 1}/${embeddings.length}: ${embedding.fileName}`,
        );

        // creating a new record in SourceCodeEmbedding table for each file embedding

        const record = await db.sourceCodeEmbedding.create({
          data: {
            summary: embedding.summary,
            sourceCode: embedding.sourceCode,
            fileName: embedding.fileName,
            projectId,
          },
        });

        /*

        - but how we insert the vector  inside the postgres database 

          - just by nature of prisma , prisma doesn't support kind of inserting our vectors for now

          - that's why we need to write raw SQL query to insert the vector after we have created the row ---> basically update the row
      
      */

        await db.$executeRaw`
          UPDATE "SourceCodeEmbedding"
          SET "summaryEmbedding" = ${embedding.embedding}::vector
          WHERE "id" = ${record.id}
        `;
      } catch (error) {
        console.error(`DB write failed for ${embedding.fileName}:`, error);
      }
    }),
  );
};
