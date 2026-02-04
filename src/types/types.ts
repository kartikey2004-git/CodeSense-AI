export type SourceCode = {
  language: string;
  content: string;
};

export type FileReference = {
  fileName: string;
  sourceCode: SourceCode;
  summary: string;
};

export type SearchResult = {
  fileName: string;
  sourceCode: string;
  summary: string;
};

export type FormInput = {
  repoUrl: string;
  projectName: string;
  githubToken?: string;
};

export type EmbeddingVector = number[];

export type SafeSummary = string & { __brand: "SafeSummary" };

export type Response = {
  commitHash: string;
  commitMessage: string;
  commitAuthorName: string;
  commitAuthorAvatar: string;
  commitDate: Date;
};
