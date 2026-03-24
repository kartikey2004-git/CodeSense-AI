import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { GoogleGenAI } from "@google/genai";
import { Document } from "@langchain/core/documents";
import { config } from "@/config/google.config";
import { QuotaManager } from "@/lib/quota-manager";

// now we use gemini AI for summarising our commit where we pass diff for particular commit hash

// and further we also including for kind of vector embedding that we'll be using for retrieval augmented generation model

export class AIService {
  constructor() {
    if (!config.googleApiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set in env");
    }

    console.log(
      "API KEY:",
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "LOADED" : "MISSING",
    );
  }

  async summariseDiff(diff: string): Promise<string> {
    try {
      const { text } = await generateText({
        model: google(config.model),
        prompt: `You are a senior software engineer summarizing a git diff.

Generate EXACTLY 4 bullet points summarizing the most important changes from the diff.

Rules:

1. Only use information present in the diff.
2. Do not invent features, files, or behavior.
3. Prioritize functional and logical changes over formatting.
4. Use past-tense commit style verbs (Added, Fixed, Updated, Refactored, Improved, Removed).
5. Each bullet must be ONE sentence.
6. Keep each line concise (max 20 words).
7. Do not repeat similar changes across bullets.
8. If there are fewer than 4 meaningful changes, summarize smaller changes to still produce 4 bullets.

Formatting:

- Use "*" for bullets
- No headings
- No explanations
- No extra text before or after bullets

Git diff input:
${diff}
`,
      });

      if (!text?.trim()) {
        throw new Error("Empty response from Gemini");
      }

      return text;
    } catch (error) {
      console.log("Error in generating Summaries");
      return "";
    }
  }

  async summariseCode(doc: Document): Promise<string> {
    console.log("getting summary for ", doc.metadata.source);

    // Check quota before making API call
    if (!QuotaManager.canMakeRequest()) {
      console.warn(
        `    Gemini quota exceeded. Time until reset: ${QuotaManager.getTimeUntilReset()}`,
      );
      return this.generateFallbackSummary(doc);
    }

    try {
      // limiting code content to first 10000 characters in case of context overrun while summarisation
      const code = doc.pageContent?.slice(0, 10000);

      if (!code.trim()) {
        console.log("No code content found in doc.");
        return this.generateFallbackSummary(doc);
      }

      console.log("Sending prompt to Gemini…");
      console.log("Prompt length:", code.length);

      // Record the request
      QuotaManager.recordRequest();

      // Enhanced retry with exponential backoff and timeout
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Add timeout to the API call
          const { text } = await Promise.race([
            generateText({
              model: google(config.model),
              messages: [
                {
                  role: "user",
                  content: `You are a senior software engineer analyzing a source file.

Summarize the PURPOSE of the file and its main RESPONSIBILITIES.

Rules:

1. Use ONLY the provided code.
2. Do NOT guess external behavior or project context.
3. Focus on what the file is responsible for, not line-by-line implementation details.
4. Write in clear technical language.
5. Use present tense.
6. Each bullet must be one short sentence.
7. Keep bullets between 8-15 words.
8. Output a maximum of 5 bullets.
9. If fewer responsibilities exist, summarize core purpose clearly.

Formatting:

- Use "*" for bullets
- No headings
- No explanations outside bullets
- Do not repeat the file name in bullets

File path:
${doc.metadata.source}

Source code:
${code}
`,
                },
              ],
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Gemini API timeout")), 25000),
            ),
          ]);

          console.log("Raw response received.");
          console.log("Summary length:", text?.length);

          if (!text?.trim()) {
            throw new Error("Empty response from Gemini");
          }

          return text;
        } catch (error) {
          lastError =
            error instanceof Error ? error : new Error("Unknown error");

          // Enhanced rate limit handling
          if (
            lastError.message.includes("rate limit") ||
            lastError.message.includes("quota") ||
            lastError.message.includes("timeout")
          ) {
            const delayMs = Math.min(2000 * Math.pow(2, attempt - 1), 30000); // More conservative: 2s, 4s, 8s max 30s
            console.warn(
              ` Rate limit/timeout hit, retry ${attempt}/${maxRetries} in ${delayMs}ms:`,
              lastError.message,
            );
            if (attempt < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              continue;
            }
          }

          // For other errors, shorter delay
          if (attempt < maxRetries) {
            const delayMs = 1000 * attempt; // 1s, 2s, 3s
            console.warn(
              `Summary retry ${attempt}/${maxRetries} in ${delayMs}ms:`,
              lastError.message,
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }

      // All retries failed - use fallback
      console.error(
        `  All ${maxRetries} attempts failed for ${doc.metadata.source}:`,
        lastError?.message,
      );
      return this.generateFallbackSummary(doc);
    } catch (error) {
      console.error("Unexpected error in summariseCode:", error);
      return this.generateFallbackSummary(doc);
    }
  }

  // Fallback summary generator for when AI fails
  private generateFallbackSummary(doc: Document): string {
    const content = doc.pageContent.slice(0, 500); // First 500 chars
    const fileName = doc.metadata.source || "unknown file";
    const language = this.detectLanguageFromContent(content);

    // Basic heuristics based on content
    const summaries = [];

    if (content.includes("function") || content.includes("def")) {
      summaries.push(`* Defines functions for ${language} code execution`);
    }
    if (content.includes("class")) {
      summaries.push(
        `* Contains class definitions for object-oriented programming`,
      );
    }
    if (content.includes("import") || content.includes("require")) {
      summaries.push(`* Manages module imports and dependencies`);
    }
    if (content.includes("export")) {
      summaries.push(`* Exports functionality for use by other modules`);
    }
    if (fileName.includes("config") || fileName.includes(".env")) {
      summaries.push(
        `* Stores configuration settings and environment variables`,
      );
    }
    if (fileName.includes("test") || fileName.includes("spec")) {
      summaries.push(`* Contains test cases for code validation`);
    }

    // Default summary if no patterns detected
    if (summaries.length === 0) {
      summaries.push(`* ${language} source file with code implementation`);
      summaries.push(`* Contains program logic and functionality`);
    }

    return summaries.join("\n");
  }

  private detectLanguageFromContent(content: string): string {
    if (
      content.includes("function") ||
      content.includes("const") ||
      content.includes("let")
    )
      return "JavaScript";
    if (content.includes("def ")) return "Python";
    if (content.includes("public class")) return "Java";
    if (content.includes("package ")) return "Go";
    return "generic";
  }

  async generateEmbedding(summary: string): Promise<number[]> {
    if (!summary || summary.trim().length < 3) {
      throw new Error("Text too short for embedding");
    }

    const ai = new GoogleGenAI({
      apiKey: config.googleApiKey,
    });

    try {
      // Add timeout to embedding generation
      const response = await Promise.race([
        ai.models.embedContent({
          model: "gemini-embedding-001",
          contents: summary,
          config: {
            outputDimensionality: 768,
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Embedding generation timeout")),
            15000,
          ),
        ),
      ]);

      const embedding = response.embeddings?.[0]?.values;

      console.log(response.embeddings?.length);

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error("Empty embedding returned from Gemini");
      }

      return embedding;
    } catch (error) {
      console.error("Embedding generation failed:", {
        input: summary.slice(0, 100),
        error,
      });
      throw error;
    }
  }
}
