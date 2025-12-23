import { db } from "@/server/db";
import { Octokit } from "octokit";
import axios from "axios";
import { aiSummariseCommit } from "./gemini";

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || undefined,
});

// we use github token to authenticate with github and increase our rate limit usage

type Response = {
  commitHash: string;
  commitMessage: string;
  commitAuthorName: string;
  commitAuthorAvatar: string;
  commitDate: Date;
};

// get the list of commits related data from github repo using octokit in type Response

export const getCommitHashes = async (
  githubUrl: string,
): Promise<Response[]> => {
  // get the owner and repo from particular github URL

  const [owner, repo] = githubUrl.split("/").slice(-2);

  if (!owner || !repo) {
    throw new Error("Invalid github url");
  }

  try {
    // list commits from github repo using octokit

    const { data } = await octokit.rest.repos.listCommits({
      owner,
      repo,
    });

    if (!Array.isArray(data)) return [];

    // sort commits by date descending means latest commit first

    const sortedCommits = [...data].sort(
      (a: any, b: any) =>
        new Date(b.commit?.author?.date ?? 0).getTime() -
        new Date(a.commit?.author?.date ?? 0).getTime(),
    );

    // return top 3 latest commits for particular githubUrl

    return sortedCommits.slice(0, 3).map((commit: any) => ({
      commitHash: commit.sha ?? "",
      commitMessage: commit.commit?.message ?? "",
      commitAuthorName: commit.commit?.author?.name ?? "",
      commitAuthorAvatar: commit?.author?.avatar_url ?? "",
      commitDate: commit.commit?.author?.date ?? "",
    }));
  } catch (error) {
    console.error("Failed to fetch commits:", error);
    return [];
  }
};

export const pollCommits = async (projectId: string) => {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  // fetch githubUrl for particular project from database

  const { githubUrl } = await fetchProjectGithubUrl(projectId);

  // get the list of last 10 latest commits from particular githubUrl

  const commitHashes = await getCommitHashes(githubUrl);

  if (commitHashes.length === 0) return [];

  // then filter out the unprocessed commits from particular project

  //  unprocessed commits are those commits which are not present in our database yet

  // because we don't want to generate again summaries for already AI summarised commits

  const unprocessedCommits = await filterUnprocessedCommits(
    projectId,
    commitHashes,
  );

  if (unprocessedCommits.length === 0) return [];

  // then we summarise each commit diff using generative AI for unprocessed commits only

  const summaryResponses = await Promise.allSettled(
    unprocessedCommits.map((commit) => {
      return summariseCommit(githubUrl, commit.commitHash);
    }),
  );

  // then we create many commits in our database with the summaries we got from ai

  const summaries = summaryResponses.map((response) =>
    response.status === "fulfilled" ? response.value : "",
  );

  // finally we create many commits in our database with the summaries we got from ai

  try {
    const commits = await db.commit.createMany({
      data: summaries.map((summary, index) => {
        console.log(`processing commit ${index}`);

        const commit = unprocessedCommits[index];

        return {
          projectId,
          commitHash: commit?.commitHash!,
          commitMessage: commit?.commitMessage!,
          commitAuthorName: commit?.commitAuthorName!,
          commitAuthorAvatar: commit?.commitAuthorAvatar!,
          commitDate: commit?.commitDate!,
          summary,
        };
      }),
    });

    return commits;
  } catch (error) {
    console.error("Failed to store commits:", error);
    throw error;
  }
};

// fetch githubUrl for particular project from database and return that particular project and githubUrl

async function fetchProjectGithubUrl(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      githubUrl: true,
    },
  });

  if (!project?.githubUrl) {
    throw new Error("Project has no github url");
  }

  return { project, githubUrl: project?.githubUrl };
}

// get the diff , then pass the diff into ai and then summarise with help of AI sdk - generative AI

async function summariseCommit(
  githubUrl: string,
  commitHash: string,
): Promise<string> {
  if (!githubUrl || !commitHash) return "";

  try {
    const { data: diff } = await axios.get(
      `${githubUrl}/commit/${commitHash}.diff`,
      {
        headers: {
          Accept: "application/vnd.github.v3.diff",
        },
        responseType: "text",
        timeout: 15_000,
      },
    );

    if (!diff || typeof diff !== "string") return "";

    const summary = await aiSummariseCommit(diff);
    return summary || "";
  } catch (error) {
    console.error(`Failed to summarise commit ${commitHash}:`, error);
    return "";
  }
}

async function filterUnprocessedCommits(
  projectId: string,
  commitHashes: Response[],
): Promise<Response[]> {
  if (!commitHashes.length) return [];

  // we first get all the processed commits from database - commits that are already saved in database

  const processedCommits = await db.commit.findMany({
    where: {
      projectId,
    },
    select: { commitHash: true },
  });

  // then we filter out the unprocessed commits from the list of commit hashes we got from github by comparing the commit hashes

  const processedSet = new Set(processedCommits.map((c) => c.commitHash));

  return commitHashes.filter((commit) => !processedSet.has(commit.commitHash));
}

/*

  - for building commit log and how get commit log history and their ai summaries

  -  We are going to use github API and for that we are using octokit

  - Octokit is a lineup of GitHub-maintained client libraries for the GitHub API 

  - through octokit we can interact with the repository and the commits history of a repository

  - so we can use octokit to basically pull in all the list of commits and we are going to poll for commits and so whenever there is new commit we're going to process them

  we extract all the given things from github url that we have in our project

  - commitMessage
  - commitHash
  - commitAuthorName
  - commitAuthorAvatar
  - commitDate    
  
  - then we generate ai summary for each commit diff

*/

/*

-  we can run typescript files with help of bun run file.ts and with help of npx also : npx tsx file.ts

- we can now basically link the commit whenever we create new project we call the pollCommits function 

    - that first fetches the github url
    - then get the list of last 10 latest commits

    - and then filter out the unprocessed commits : unprocessed commits are those commits which are not present in our database yet 

    - and then we summarise each commit diff 

    - and then we create many commits in our database with the summaries we got from ai
*/
