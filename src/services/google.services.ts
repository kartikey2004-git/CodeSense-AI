import { google } from "@ai-sdk/google";
import { generateText, embed } from "ai";
import { config } from "../config/google.config";
import type { Document } from "@langchain/core/documents";

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
        model: google("gemini-2.5-flash"),
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

    try {
      // limiting code content to first 10000 characters in case of context overrun while summarisation

      const code = doc.pageContent?.slice(0, 10000);

      if (!code.trim()) {
        console.log("No code content found in doc.");
        return "";
      }

      console.log("Sending prompt to Gemini…");
      console.log("Prompt length:", code.length);

      const { text } = await generateText({
        model: google("gemini-2.5-flash"),
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
      });

      console.log("Raw response received.");

      console.log("Summary length:", text?.length);

      return text;
    } catch (error) {
      console.error("Error generating summary");
      return "";
    }
  }

  async generateEmbedding(summary: string): Promise<number[]> {
    try {
      const model = google.textEmbedding("text-embedding-004");

      const result = await embed({
        model,
        value: summary,
      });

      return result.embedding;
    } catch (error) {
      console.log("Error in generating Summaries");
      return [];
    }
  }
}
