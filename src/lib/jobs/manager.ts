import { getQueue } from "../queue";
import { QUEUE_NAMES } from "../queue";
import type {
  RepoIndexingJobData,
  CommitPollingJobData,
  MeetingProcessingJobData,
  WebhookProcessingJobData,
} from "./types";

// Common job configuration - follows BullMQ best practices
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 50,
};

// Job priorities - higher number = higher priority
const JOB_PRIORITIES = {
  REPO_INDEXING: 10,
  WEBHOOK_PROCESSING: 9,
  MEETING_PROCESSING: 7,
  COMMIT_POLLING: 5,
} as const;

// Job manager for enqueuing jobs with proper error handling and deduplication

export class JobManager {
  // Generic job enqueue method with deduplication support
  private static async enqueueJob<T>(
    queueName: string,
    jobName: string,
    data: T,
    options: any = {},
  ) {
    try {
      const queue = getQueue(queueName);

      // Create job options with defaults and overrides
      const jobOptions = {
        ...DEFAULT_JOB_OPTIONS,
        ...options,
      };

      // Add job deduplication if jobId is provided
      if (options.jobId) {
        jobOptions.jobId = options.jobId;
      }

      const job = await queue.add(jobName, data, jobOptions);

      // Log only in development or when explicitly enabled
      if (
        process.env.NODE_ENV === "development" ||
        process.env.VERBOSE_JOB_LOGGING === "true"
      ) {
        console.log(`Job ${jobName} enqueued successfully: ${job.id}`);
      }

      return job;
    } catch (error) {
      console.error(`Failed to enqueue ${jobName}:`, error);
      // Don't swallow errors - let them propagate for proper handling
      throw error;
    }
  }

  // Enqueue repository indexing job with high priority
  static async enqueueRepoIndexing(data: RepoIndexingJobData, options?: any) {
    return this.enqueueJob(QUEUE_NAMES.REPO_INDEXING, "repo-indexing", data, {
      priority: JOB_PRIORITIES.REPO_INDEXING,
      jobId: data.jobId, // Use explicit job ID for deduplication
      ...options,
    });
  }

  // Enqueue commit polling job with low priority
  
  static async enqueueCommitPolling(data: CommitPollingJobData, options?: any) {
    return this.enqueueJob(QUEUE_NAMES.COMMIT_POLLING, "commit-polling", data, {
      priority: JOB_PRIORITIES.COMMIT_POLLING,
      ...options,
    });
  }

  // Enqueue meeting processing job with medium priority
  static async enqueueMeetingProcessing(
    data: MeetingProcessingJobData,
    options?: any,
  ) {
    return this.enqueueJob(
      QUEUE_NAMES.MEETING_PROCESSING,
      "meeting-processing",
      data,
      {
        priority: JOB_PRIORITIES.MEETING_PROCESSING,
        ...options,
      },
    );
  }

  // Enqueue webhook processing job with high priority
  static async enqueueWebhookProcessing(
    data: WebhookProcessingJobData,
    options?: any,
  ) {
    return this.enqueueJob(
      QUEUE_NAMES.WEBHOOK_PROCESSING,
      "webhook-processing",
      data,
      {
        priority: JOB_PRIORITIES.WEBHOOK_PROCESSING,
        // Remove webhook jobs quickly after completion to save space
        removeOnComplete: 10,
        removeOnFail: 5,
        ...options,
      },
    );
  }

  // Get job status
  static async getJobStatus(queueName: string, jobId: string) {
    const queue = getQueue(queueName);
    return await queue.getJob(jobId);
  }

  // Get queue stats
  static async getQueueStats(queueName: string) {
    const queue = getQueue(queueName);
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  // Clear queue
  static async clearQueue(queueName: string) {
    const queue = getQueue(queueName);
    await queue.drain();
  }

  // Pause queue
  static async pauseQueue(queueName: string) {
    const queue = getQueue(queueName);
    await queue.pause();
  }

  // Resume queue
  static async resumeQueue(queueName: string) {
    const queue = getQueue(queueName);
    await queue.resume();
  }
}
