import { Queue, Worker, QueueEvents } from "bullmq";
import { getRedisConnectionOptions } from "./redis";

// Queue names
export const QUEUE_NAMES = {
  REPO_INDEXING: "repo-indexing",
  COMMIT_POLLING: "commit-polling",
  MEETING_PROCESSING: "meeting-processing",
  WEBHOOK_PROCESSING: "webhook-processing",
} as const;

// Create queue instances
export const createQueue = (name: string) => {
  return new Queue(name, {
    connection: getRedisConnectionOptions(),
    defaultJobOptions: {
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 50, // Keep last 50 failed jobs
      attempts: 3, // Retry failed jobs 3 times
      backoff: {
        type: "exponential",
        delay: 2000, // Start with 2s delay, then exponential
      },
    },
  });
};

// Create worker instances
export const createWorker = (
  name: string,
  processor: (job: any) => Promise<any>,
  options?: any,
) => {
  return new Worker(name, processor, {
    connection: getRedisConnectionOptions(),
    concurrency: options?.concurrency || 1,
    ...options,
  });
};

// Create queue events listener
export const createQueueEvents = (name: string) => {
  return new QueueEvents(name, {
    connection: getRedisConnectionOptions(),
  });
};

// Queue singleton instances
const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();
const queueEvents = new Map<string, QueueEvents>();

// Get or create queue
export const getQueue = (name: string): Queue => {
  if (!queues.has(name)) {
    queues.set(name, createQueue(name));
  }
  return queues.get(name)!;
};

// Get or create worker
export const getWorker = (
  name: string,
  processor: (job: any) => Promise<any>,
  options?: any,
): Worker => {
  if (!workers.has(name)) {
    workers.set(name, createWorker(name, processor, options));
  }
  return workers.get(name)!;
};

// Get or create queue events
export const getQueueEvents = (name: string): QueueEvents => {
  if (!queueEvents.has(name)) {
    queueEvents.set(name, createQueueEvents(name));
  }
  return queueEvents.get(name)!;
};

// Close all connections
export const closeQueueConnections = async () => {
  const closePromises: Promise<any>[] = [];

  workers.forEach((worker) => {
    closePromises.push(worker.close());
  });

  queueEvents.forEach((events) => {
    closePromises.push(events.close());
  });

  queues.forEach((queue) => {
    closePromises.push(queue.close());
  });

  await Promise.all(closePromises);
  workers.clear();
  queueEvents.clear();
  queues.clear();
};

// Job status types
export enum JobStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
}
