"use server";

import { streamText } from "ai";
import { createStreamableValue } from "@ai-sdk/rsc";
import { generateEmbedding } from "@/lib/gemini";
import { db } from "@/server/db";
import { google } from "@ai-sdk/google";

type SearchResult = {
  fileName: string;
  sourceCode: string;
  summary: string;
};

export async function askQuestion(question: string, projectId: string) {
  if (!question?.trim()) {
    throw new Error("Question cannot be empty");
  }

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  const stream = createStreamableValue<string>("");

  try {
    const queryVector = await generateEmbedding(question);

    if (!queryVector || queryVector.length === 0) {
      throw new Error("Failed to generate embedding for question");
    }

    const vectorQuery = `[${queryVector.join(",")}]`;

    const result = (await db.$queryRaw`
      SELECT
        "fileName",
        "sourceCode",
        "summary",
        1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) AS similarity
      FROM "SourceCodeEmbedding"
      WHERE
        1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) > 0.5
        AND "projectId" = ${projectId}
      ORDER BY similarity DESC
      LIMIT 10
    `) as SearchResult[];

    let context = "";

    for (const doc of result ?? []) {
      if (!doc?.sourceCode) continue;

      context +=
        `source: ${doc.fileName}\n` +
        `code content:\n${doc.sourceCode}\n` +
        `summary of file: ${doc.summary}\n\n`;
    }

    const MAX_CONTEXT_CHARS = 12_000;
    if (context.length > MAX_CONTEXT_CHARS) {
      context = context.slice(0, MAX_CONTEXT_CHARS);
    }

    (async () => {
      try {
        const { textStream } = await streamText({
          model: google("gemini-2.5-flash"),
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
        }

        stream.done();
      } catch (err) {
        console.error("Streaming error:", err);
        stream.update("\n\nError generating response. Please try again.");
      }
    })();

    return {
      output: stream.value,
      filesReferences: result ?? [],
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
