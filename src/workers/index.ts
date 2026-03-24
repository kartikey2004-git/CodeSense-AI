#!/usr/bin/env node

import { getWorker, closeQueueConnections } from "../lib/queue";
import { QUEUE_NAMES } from "../lib/queue";
import {
  repoIndexingProcessor,
  meetingProcessingProcessor,
  webhookProcessingProcessor,
} from "../lib/jobs/processors";

console.log("  Starting BullMQ workers...");

// Create workers for each queue type
const repoIndexingWorker = getWorker(
  QUEUE_NAMES.REPO_INDEXING,
  repoIndexingProcessor,
  { concurrency: 2 }, // Process 2 repos concurrently
);

const meetingProcessingWorker = getWorker(
  QUEUE_NAMES.MEETING_PROCESSING,
  meetingProcessingProcessor,
  { concurrency: 3 }, // Medium concurrency for meetings
);

const webhookProcessingWorker = getWorker(
  QUEUE_NAMES.WEBHOOK_PROCESSING,
  webhookProcessingProcessor,
  { concurrency: 10 }, // High concurrency for webhooks
);

// Worker event listeners
repoIndexingWorker.on("completed", (job) => {
  console.log(` Repo indexing job completed: ${job.id}`);
});

repoIndexingWorker.on("failed", (job, err) => {
  console.error(`  Repo indexing job failed: ${job?.id}`, err);
});

meetingProcessingWorker.on("completed", (job) => {
  console.log(` Meeting processing job completed: ${job.id}`);
});

meetingProcessingWorker.on("failed", (job, err) => {
  console.error(`  Meeting processing job failed: ${job?.id}`, err);
});

webhookProcessingWorker.on("completed", (job) => {
  console.log(` Webhook processing job completed: ${job.id}`);
});

webhookProcessingWorker.on("failed", (job, err) => {
  console.error(`  Webhook processing job failed: ${job?.id}`, err);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n Shutting down workers...");
  await closeQueueConnections();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n Shutting down workers...");
  await closeQueueConnections();
  process.exit(0);
});

console.log(" All workers started successfully!");
console.log(" Workers running:");
console.log(
  `  - Repository Indexing: ${QUEUE_NAMES.REPO_INDEXING} (concurrency: 2)`,
);
console.log(
  `  - Meeting Processing: ${QUEUE_NAMES.MEETING_PROCESSING} (concurrency: 3)`,
);
console.log(
  `  - Webhook Processing: ${QUEUE_NAMES.WEBHOOK_PROCESSING} (concurrency: 10)`,
);
