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
        prompt: `
You are an expert programmer, and you are trying to summarize a git diff.

Reminders about the git diff format:

For every file, there are a few metadata lines, like (for example):
\`\`\`
diff -- git a/lib/index.js b/lib/index.js
index aadf691 .. bfef603 100644
-- a/lib/index.js
+++ b/lib/index.js
\`\`\`
This means that \`lib/index.js\` was modified in this commit. Note that this is only an example.
Then there is a specifier of the lines that were modified
A line starting with \`+\` means it was added.
A line that starting with \`-\` means that line was deleted.
A line that starts with neither \`+\` nor \`-\` is code given for context and better understanding.
It is not part of the diff.
[...]
EXAMPLE SUMMARY COMMENTS:
\`\`\`
* Raised the amount of returned recordings from \`10\` to \`100\`. [packages/server/recordings_api.ts], [packages/server/constants.ts]
* Fixed a typo in the github action name [.github/workflows/gpt-commit-summarizer.yml]
* Moved the \`octokit\` initialization to a separate file [src/octokit.ts], [src/index.ts]
* Added an OpenAI API for completions [packages/utils/apis/openai.ts]
* Lowered numeric tolerance for test files
\`\`\`
Most commits will have less comments than this examples list.
The last comment does not include the file names,
because there were more than two relevant files in the hypothetical commit.
Do not include parts of the example in your summary.
It is given only as an example of appropriate comments.

Please summarise the following diff files: \n\n${diff}`,
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
            content: `Summarize the purpose of the ${doc.metadata.source} file and responsibilities in bullet points (max 5).

Here is the code:
${code}`,
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
