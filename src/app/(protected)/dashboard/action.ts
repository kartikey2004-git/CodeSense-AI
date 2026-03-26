"use server";

import { streamText } from "ai";
import { createStreamableValue } from "@ai-sdk/rsc";
import { generateEmbedding } from "@/lib/gemini";
import { google } from "@ai-sdk/google";
import { cache } from "@/lib/cache";
import { dedupeByFile } from "@/lib/deduplication";
import type { SearchResult } from "@/types/types";
import { config } from "@/config/google.config";
import { vectorSimilaritySearch } from "@/lib/vector-operations";

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

    if (cachedResponse) {
      // Stream cached response

      (async () => {
        try {
          for (const char of cachedResponse.answer) {
            stream.update(char);
            await new Promise((resolve) => setTimeout(resolve, 10)); 
          }
          stream.done();
        } catch (err) {
          stream.update("\n\nError displaying cached response.");
          stream.done();
        }
      })();

      return {
        output: stream.value,
        filesReferences: cachedResponse.filesReferences || [],
      };
    }

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
      // Use new vector operations with proper error handling
      
      try {
        const vectorResults = await vectorSimilaritySearch({
          projectId,
          queryEmbedding: queryVector,
          limit: 20,
          threshold: 0.5,
        });

        // Convert to SearchResult format
        result = vectorResults.map((r) => ({
          fileName: r.fileName,
          sourceCode: r.sourceCode,
          summary: r.summary,
          chunkContent: undefined, // No more chunking
          chunkMetadata: undefined,
          isChunked: false,
          chunkIndex: undefined,
          totalChunks: undefined,
          similarity: r.similarity,
        }));
      } catch (error) {
        console.error("Vector similarity search failed:", error);
        result = [];
      }

      // Cache search results
      await cache.setEmbeddingSearch(projectId, question, result);
    }

    // SQL DISTINCT ON already deduplicates by file, but keep deduplication as safety net

    const dedupedResults = dedupeByFile(result);

    let context = "";

    // Simplified handling - no more chunking complexity
    
    const chunks: Array<{ content: string; fileName: string; metadata?: any }> =
      dedupedResults.map((doc) => ({
        content: doc.sourceCode,
        fileName: doc.fileName,
      }));

    // Simplified context building - no more chunking complexity

    for (const chunk of chunks) {
      context += `source: ${chunk.fileName}\n`;
      context += `code content:\n${chunk.content}\n`;
      context += `summary: ${dedupedResults.find((r) => r.fileName === chunk.fileName)?.summary || "No summary available"}\n\n`;
    }

    const MAX_CONTEXT_CHARS = 12_000;

    if (context.length > MAX_CONTEXT_CHARS) {
      context =
        context.slice(0, MAX_CONTEXT_CHARS) + "\n\n[...context truncated...]";
    }

    console.log(
      `Search Results: ${result.length} items → ${dedupedResults.length} unique files, context: ${chunks.length} files`,
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
