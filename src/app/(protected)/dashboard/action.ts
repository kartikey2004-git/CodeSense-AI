"use server";

import { streamText } from "ai";
import { createStreamableValue } from "@ai-sdk/rsc";
import { generateEmbedding } from "@/lib/gemini";
import { db } from "@/server/db";
import { google } from "@ai-sdk/google";
import { cache } from "@/lib/cache";
import { mergeOverlappingChunks } from "@/lib/chunking";
import { dedupeByFile } from "@/lib/deduplication";
import type { SearchResult } from "@/types/types";
import { config } from "@/config/google.config";

export async function askQuestion(question: string, projectId: string) {
  if (!question?.trim()) {
    throw new Error("Question cannot be empty");
  }

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  const stream = createStreamableValue<string>("");

  try {
    // Check cache first

    const cachedResponse = await cache.getQAResponse(projectId, question);
    if (cachedResponse && !cache.isBypassed()) {
      console.log("Cache hit for Q&A:", {
        projectId,
        question: question.substring(0, 50) + "...",
      });

      // Stream cached response

      (async () => {
        try {
          for (const char of cachedResponse.answer) {
            stream.update(char);
            await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay for streaming effect
          }
          stream.done();
        } catch (err) {
          console.error("Cached streaming error:", err);
          stream.update("\n\nError displaying cached response.");
          stream.done();
        }
      })();

      return {
        output: stream.value,
        filesReferences: cachedResponse.filesReferences || [],
      };
    }

    console.log("Cache miss for Q&A:", {
      projectId,
      question: question.substring(0, 50) + "...",
    });

    // Cache miss - proceed with normal flow
    const queryVector = await generateEmbedding(question);

    if (!queryVector || queryVector.length === 0) {
      throw new Error("Failed to generate embedding for question");
    }

    // Check if search results are cached
    const cachedSearchResults = await cache.getEmbeddingSearch(
      projectId,
      question,
    );

    let result: SearchResult[] = cachedSearchResults || [];

    if (!cachedSearchResults) {
      const vectorQuery = `[${queryVector.join(",")}]`;

      // NEW: Search across chunks with backward compatibility and deduplication at SQL level

      result = (await db.$queryRaw`
        SELECT DISTINCT ON ("fileName") 
          "fileName",
          "sourceCode",
          "summary",
          "chunkContent",
          "chunkMetadata",
          "isChunked",
          "chunkIndex",
          "totalChunks",
          1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) AS similarity
        FROM "SourceCodeEmbedding"
        WHERE
          1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) > 0.5
          AND "projectId" = ${projectId}
        ORDER BY 
          "fileName", 
          similarity DESC
        LIMIT 20 -- Get more results since chunks are smaller
      `) as SearchResult[];

      // Cache search results
      await cache.setEmbeddingSearch(projectId, question, result);
    }

    // SQL DISTINCT ON already deduplicates by file, but keep deduplication as safety net

    const dedupedResults = dedupeByFile(result);

    console.log(
      `SQL DISTINCT ON + deduplication: ${result.length} results → ${dedupedResults.length} unique files`,
    );

    let context = "";

    // Handle chunked and file-level embeddings

    const chunks: Array<{ content: string; fileName: string; metadata?: any }> =
      [];

    const processedFiles = new Set<string>();

    for (const doc of dedupedResults ?? []) {
      if (!doc?.sourceCode) continue;

      if (doc.isChunked && doc.chunkContent) {
        // For chunked embeddings, use the chunk content
        chunks.push({
          content: doc.chunkContent,
          fileName: doc.fileName,
          metadata: doc.chunkMetadata,
        });
        processedFiles.add(doc.fileName);
      } else {
        // For legacy file-level embeddings, use full source code

        chunks.push({
          content: doc.sourceCode,
          fileName: doc.fileName,
        });
        processedFiles.add(doc.fileName);
      }
    }

    // Group chunks by file and merge overlapping content

    const chunksByFile = new Map<
      string,
      Array<{ content: string; metadata?: any }>
    >();

    for (const chunk of chunks) {
      if (!chunksByFile.has(chunk.fileName)) {
        chunksByFile.set(chunk.fileName, []);
      }

      chunksByFile.get(chunk.fileName)!.push({
        content: chunk.content,
        metadata: chunk.metadata,
      });
    }

    // Build context with file grouping

    for (const [fileName, fileChunks] of chunksByFile.entries()) {
      const mergedContent = mergeOverlappingChunks(
        fileChunks.map((chunk, index) => ({
          content: chunk.content,
          metadata: {
            fileName,
            chunkIndex: index,
            totalChunks: fileChunks.length,
            ...chunk.metadata,
          },
        })),
      );

      context += `source: ${fileName}\n`;
      context += `code content:\n${mergedContent}\n`;

      // Add chunk metadata if available

      if (fileChunks[0]?.metadata) {
        context += `chunk info: ${JSON.stringify(fileChunks[0].metadata, null, 2)}\n`;
      }

      context += `summary: ${dedupedResults.find((r) => r.fileName === fileName)?.summary || "No summary available"}\n\n`;
    }

    const MAX_CONTEXT_CHARS = 12_000;

    if (context.length > MAX_CONTEXT_CHARS) {
      context =
        context.slice(0, MAX_CONTEXT_CHARS) + "\n\n[...context truncated...]";
    }

    console.log(
      `Search Results: ${result.length} items → ${dedupedResults.length} unique files, ${chunks.length} chunks, ${processedFiles.size} files`,
    );

    console.log(`Context size: ${context.length} characters`);

    let fullAnswer = "";

    (async () => {
      try {
        const { textStream } = await streamText({
          model: google(config.model),
          prompt: `
      You are a ai code assistant who answers questions about the codebase. Your target audience is a technical intern
       
AI assistant is a brand new, powerful, human-like artificial intelligence.

The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.

AI is a well-behaved and well-mannered individual.

AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.

AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic

If the question is asking about code or a specific file. AI will provide the detailed answer, giving step by step instructions START CONTEXT BLOCK
${context}
END OF CONTEXT BLOCK

START QUESTION
${question}
END OF QUESTION

AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.

If the context does not provide the answer to question, the AI assistant will say, "I'm sorry

but AI assistant will not apologize for previous responses, but instead will indicated new information

AI assistant will not invent anything that is not drown directly from the context.
      `,
        });

        for await (const delta of textStream) {
          stream.update(delta);
          fullAnswer += delta;
        }

        // Cache the complete response

        const cacheData = {
          answer: fullAnswer,
          filesReferences: dedupedResults, // Use deduped results for caching
          timestamp: new Date().toISOString(),
        };

        await cache.setQAResponse(projectId, question, cacheData);

        console.log("Cached Q&A response:", {
          projectId,
          question: question.substring(0, 50) + "...",
        });

        stream.done();
      } catch (err) {
        console.error("Streaming error:", err);
        stream.update("\n\nError generating response. Please try again.");
        stream.done();
      }
    })();

    return {
      output: stream.value,
      filesReferences: dedupedResults ?? [], // Return deduped results to UI
    };
  } catch (error) {
    console.error("askQuestion failed:", error);

    stream.update("Something went wrong while processing your question.");
    stream.done();

    return {
      output: stream.value,
      filesReferences: [],
    };
  }
}
