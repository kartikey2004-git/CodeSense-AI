import { getQueue } from "../queue";
import { QUEUE_NAMES } from "../queue";
import type {
  RepoIndexingJobData,
  CommitPollingJobData,
  MeetingProcessingJobData,
  WebhookProcessingJobData,
} from "./types";

// Job manager for enqueuing jobs
export class JobManager {
  // Enqueue repository indexing job
  static async enqueueRepoIndexing(data: RepoIndexingJobData, options?: any) {

    console.log(`Enqueuing repository indexing job:`);
    console.log(`Project ID: ${data.projectId}`);
    console.log(`GitHub URL: ${data.githubUrl}`);
    console.log(`Job ID: ${data.jobId}`);
    console.log(`Token provided: ${!!data.githubToken}`);

    try {
      const queue = getQueue(QUEUE_NAMES.REPO_INDEXING);
      const job = await queue.add("repo-indexing", data, {
        ...options,
        // High priority for repo indexing
        priority: 10,
      });

      console.log(
        `Repository indexing job enqueued successfully: ${job.id}`,
      );
      return job;
    } catch (error) {
      console.error(`Failed to enqueue repository indexing job:`, error);
      console.error("Error details:", {
        projectId: data.projectId,
        jobId: data.jobId,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  // Enqueue commit polling job
  static async enqueueCommitPolling(data: CommitPollingJobData, options?: any) {
    const queue = getQueue(QUEUE_NAMES.COMMIT_POLLING);
    return await queue.add("commit-polling", data, {
      ...options,
      // Lower priority for commit polling
      priority: 5,
    });
  }

  // Enqueue meeting processing job
  static async enqueueMeetingProcessing(
    data: MeetingProcessingJobData,
    options?: any,
  ) {
    const queue = getQueue(QUEUE_NAMES.MEETING_PROCESSING);
    return await queue.add("meeting-processing", data, {
      ...options,
      // Medium priority for meeting processing
      priority: 7,
    });
  }

  // Enqueue webhook processing job
  static async enqueueWebhookProcessing(
    data: WebhookProcessingJobData,
    options?: any,
  ) {
    const queue = getQueue(QUEUE_NAMES.WEBHOOK_PROCESSING);
    return await queue.add("webhook-processing", data, {
      ...options,
      // High priority for webhook processing
      priority: 9,
      // Remove job quickly after completion
      removeOnComplete: 10,
      removeOnFail: 5,
    });
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
