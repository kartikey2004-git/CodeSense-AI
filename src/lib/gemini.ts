import { google } from "@ai-sdk/google";
import { generateText } from "ai";

const apikey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";

// now we use gemini AI for summarising our commit where we pass diff for particular commit hash 

// and further we also including for kind of vector embedding that we'll be using for retrieval augmented generation model

export const aiSummariseCommit = async (diff: string) => {

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

Please summarise the following diff file: \n\n${diff}
`,
  });

  return text;
};



// // ----------- TEST -----------
// const res = await aiSummariseCommit(`diff --git a/src/server.ts b/src/server.ts
// index 2f3b1c1..7ba9d9f 100644
// --- a/src/server.ts
// +++ b/src/server.ts
// @@ -1,12 +1,15 @@
//  import express from "express";
// -import { getUsers } from "./userController";
// +import { getUsers, createUser } from "./userController";

//  const app = express();
//  app.use(express.json());

// -app.get("/users", getUsers);
// +app.get("/users", getUsers);
// +app.post("/users", createUser);

// -app.listen(3000, () => console.log("Server running"));
// +const PORT = process.env.PORT || 3000;
// +
// +app.listen(PORT, () => {
// +  console.log('Server running on particular port 3000');
// +});
// `);

// console.log(res);
