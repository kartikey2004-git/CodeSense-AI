import { z } from "zod";

// Repository indexing job data
export const RepoIndexingJobSchema = z.object({
  projectId: z.string(),
  githubUrl: z.string(),
  githubToken: z.string().optional(),
  jobId: z.string(), // Add jobId field
});

export type RepoIndexingJobData = z.infer<typeof RepoIndexingJobSchema>;

// Commit polling job data
export const CommitPollingJobSchema = z.object({
  projectId: z.string(),
});

export type CommitPollingJobData = z.infer<typeof CommitPollingJobSchema>;

// Meeting processing job data
export const MeetingProcessingJobSchema = z.object({
  meetingId: z.string(),
  projectId: z.string(),
});

export type MeetingProcessingJobData = z.infer<
  typeof MeetingProcessingJobSchema
>;

// Webhook processing job data
export const WebhookProcessingJobSchema = z.object({
  deliveryId: z.string(),
  event: z.string(),
  repository: z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    html_url: z.string(),
    clone_url: z.string(),
    default_branch: z.string(),
  }),
  ref: z.string(),
  before: z.string(),
  after: z.string(),
  commits: z.array(
    z.object({
      id: z.string(),
      message: z.string(),
      url: z.string(),
      author: z.object({
        name: z.string(),
        email: z.string(),
        username: z.string(),
      }),
      added: z.array(z.string()),
      removed: z.array(z.string()),
      modified: z.array(z.string()),
    }),
  ),
  pusher: z.object({
    name: z.string(),
    email: z.string(),
  }),
});

export type WebhookProcessingJobData = z.infer<
  typeof WebhookProcessingJobSchema
>;

// Job result types
export interface JobResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

// Repository indexing result
export interface RepoIndexingResult {
  totalFiles: number;
  indexedFiles: number;
  skippedFiles: number;
  totalChunks: number;
  skippedChunks: number;
  errors: string[];
}

// Commit polling result
export interface CommitPollingResult {
  commitsProcessed: number;
  newCommits: number;
}

// Meeting processing result
export interface MeetingProcessingResult {
  issuesExtracted: number;
  transcriptionCompleted: boolean;
}

// Webhook processing result
export interface WebhookProcessingResult {
  commitsProcessed: number;
  repositoryMatched: boolean;
  projectId?: string;
}
