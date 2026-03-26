import { Queue, Worker, QueueEvents } from "bullmq";
import { getQueueRedisOptions, getWorkerRedisOptions } from "./redis";
import "./queue-lifecycle"; // Initialize graceful shutdown handlers

// Queue names
export const QUEUE_NAMES = {
  REPO_INDEXING: "repo-indexing",
  COMMIT_POLLING: "commit-polling",
  MEETING_PROCESSING: "meeting-processing",
  WEBHOOK_PROCESSING: "webhook-processing",
} as const;

// Default job options for all queues
const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: 100,
  removeOnFail: 50,
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2000 },
  delay: 0,
  jobId: undefined, // Let BullMQ handle job IDs
};

// Create queue instances with proper error handling
export const createQueue = (name: string) => {
  try {
    const queue = new Queue(name, {
      connection: getQueueRedisOptions(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });

    // Add error handler to prevent unhandled errors
    queue.on("error", (err) => {
      console.error(`Queue ${name} error:`, err);
    });

    return queue;
  } catch (error) {
    console.error(`Failed to create queue ${name}:`, error);
    throw error; // Fail fast - don't return mock
  }
};

// Create worker instances with proper configuration
export const createWorker = (
  name: string,
  processor: (job: any) => Promise<any>,
  options?: any,
) => {
  try {
    const worker = new Worker(name, processor, {
      connection: getWorkerRedisOptions(),
      concurrency: options?.concurrency || 1,
      maxStalledCount: 1,
      stalledInterval: 30000,
      ...options,
    });

    // Add error handler to prevent unhandled errors
    worker.on("error", (err) => {
      console.error(`Worker ${name} error:`, err);
    });

    return worker;
  } catch (error) {
    console.error(`Failed to create worker ${name}:`, error);
    throw error; // Fail fast - don't return mock
  }
};

// Create queue events listener with error handling
export const createQueueEvents = (name: string) => {
  try {
    const events = new QueueEvents(name, {
      connection: getQueueRedisOptions(),
    });

    // Add error handler to prevent unhandled errors
    events.on("error", (err) => {
      console.error(`QueueEvents ${name} error:`, err);
    });

    return events;
  } catch (error) {
    console.error(`Failed to create queue events ${name}:`, error);
    throw error; // Fail fast - don't return mock
  }
};

// Queue singleton instances
const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();
const queueEvents = new Map<string, QueueEvents>();

// Get or create queue - fail fast if Redis is unavailable
export const getQueue = (name: string): Queue => {
  if (!queues.has(name)) {
    const queue = createQueue(name);
    queues.set(name, queue);
  }
  return queues.get(name)!;
};

// Mock queue removed - fail fast instead to prevent silent data loss

// Get or create worker
export const getWorker = (
  name: string,
  processor: (job: any) => Promise<any>,
  options?: any,
): Worker => {
  if (!workers.has(name)) {
    const worker = createWorker(name, processor, options);
    workers.set(name, worker);
  }
  return workers.get(name)!;
};

// Get or create queue events
export const getQueueEvents = (name: string): QueueEvents => {
  if (!queueEvents.has(name)) {
    const events = createQueueEvents(name);
    queueEvents.set(name, events);
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
