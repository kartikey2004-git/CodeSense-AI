import { NextRequest, NextResponse } from "next/server";
import {
  verifyGithubSignature,
  getGithubWebhookSecret,
  parseGithubPayload,
  type GithubPushEvent,
} from "@/lib/github-webhooks";
import { cache } from "@/lib/cache";
import { JobManager } from "@/lib/jobs/manager";
import type { WebhookProcessingJobData } from "@/lib/jobs/types";
import { getRedisClient } from "@/lib/redis";

// Supported GitHub events

const SUPPORTED_EVENTS = ["push"] as const;
type SupportedEvent = (typeof SUPPORTED_EVENTS)[number];

// Rate limiting: Max 10 webhooks per minute per IP

const RATE_LIMIT_PER_MINUTE = 10;
const RATE_LIMIT_WINDOW = 60; // seconds

// Redis-based rate limiting

async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    const key = `webhook:rate-limit:${ip}`;

    const current = await redis.incr(key);

    if (current === 1) {
      // Set expiration on first request
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }

    return current <= RATE_LIMIT_PER_MINUTE;
  } catch (error) {
    console.error("Rate limiting error, allowing request:", error);
    // Fail open - allow request if Redis is down
    return true;
  }
}

// Get client IP

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Webhook handler function

export async function POST(request: NextRequest) {
  try {
    // Get client IP

    const clientIP = getClientIP(request);
    console.log(`GitHub webhook received from IP: ${clientIP}`);

    if (!checkRateLimit(clientIP)) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    // This is required for signature verification

    const rawBody = await request.text();

    // Get GitHub webhook headers
    const githubEvent = request.headers.get("x-github-event");

    const githubSignature = request.headers.get("x-hub-signature-256");

    const githubDelivery = request.headers.get("x-github-delivery");

    console.log("Webhook headers:", {
      event: githubEvent,
      delivery: githubDelivery,
      hasSignature: !!githubSignature,
    });

    // Validate required headers

    if (!githubEvent || !githubSignature || !githubDelivery) {
      console.error("Missing required GitHub webhook headers");
      return NextResponse.json(
        { error: "Missing required headers" },
        { status: 400 },
      );
    }

    // Validate supported event type

    if (!SUPPORTED_EVENTS.includes(githubEvent as SupportedEvent)) {
      console.log(`Unsupported event type: ${githubEvent}`);
      return NextResponse.json(
        { error: `Unsupported event: ${githubEvent}` },
        { status: 200 }, // Return 200 to avoid GitHub retrying
      );
    }

    //  Verify signature
    const webhookSecret = getGithubWebhookSecret();
    if (!webhookSecret) {
      console.error("  GitHub webhook secret not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 },
      );
    }

    const isValidSignature = verifyGithubSignature(
      rawBody,
      githubSignature,
      webhookSecret,
    );
    if (!isValidSignature) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    console.log("Signature verified successfully");

    // Parse and validate payload

    const payload = parseGithubPayload<GithubPushEvent>(rawBody);

    if (!payload) {
      console.error("Failed to parse webhook payload");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    console.log("Parsed payload:", {
      repository: payload.repository.full_name,
      ref: payload.ref,
      commits: payload.commits.length,
      before: payload.before,
      after: payload.after,
    });

    // DEBUG: Log commit details
    console.log("DEBUG: Commit details:");
    payload.commits.forEach((commit, index) => {
      console.log(
        `  Commit ${index + 1}: ${commit.id.substring(0, 7)} - ${commit.message}`,
      );
      console.log(`    Added: ${commit.added.join(", ") || "None"}`);
      console.log(`    Modified: ${commit.modified.join(", ") || "None"}`);
      console.log(`    Removed: ${commit.removed.join(", ") || "None"}`);
    });

    // Check idempotency using GitHub delivery ID

    const idempotencyKey = `webhook:${githubDelivery}`;
    const alreadyProcessed = await cache.get(idempotencyKey);

    if (alreadyProcessed) {
      console.log(`Duplicate webhook detected: ${githubDelivery}`);
      return NextResponse.json({
        received: true,
        duplicate: true,
        event: githubEvent,
        delivery: githubDelivery,
      });
    }

    // Mark this webhook as processed (5 minute TTL)
    await cache.set(
      idempotencyKey,
      {
        processed: true,
        timestamp: new Date().toISOString(),
        event: githubEvent,
        repository: payload.repository.full_name,
      },
      300,
    ); // 5 minutes

    console.log(`Webhook marked as processed: ${githubDelivery}`);

    // Enqueue webhook processing job

    const webhookJobData: WebhookProcessingJobData = {
      deliveryId: githubDelivery,
      event: githubEvent,
      repository: {
        id: payload.repository.id,
        name: payload.repository.name,
        full_name: payload.repository.full_name,
        html_url: payload.repository.html_url,
        clone_url: payload.repository.clone_url,
        default_branch: payload.repository.default_branch,
      },
      ref: payload.ref,
      before: payload.before,
      after: payload.after,
      commits: payload.commits.map((commit) => ({
        id: commit.id,
        message: commit.message,
        url: commit.url,
        author: {
          name: commit.author.name,
          email: commit.author.email,
          username: commit.author.username,
        },
        added: commit.added,
        removed: commit.removed,
        modified: commit.modified,
      })),
      pusher: {
        name: payload.pusher.name,
        email: payload.pusher.email,
      },
    };

    console.log(
      `Preparing to enqueue webhook job with ${webhookJobData.commits.length} commits`,
    );
    console.log(`  DEBUG: Queue job data:`);
    console.log(`  Delivery ID: ${webhookJobData.deliveryId}`);
    console.log(`  Event: ${webhookJobData.event}`);
    console.log(`  Repository: ${webhookJobData.repository.full_name}`);
    console.log(`  Commits: ${webhookJobData.commits.length}`);

    const job = await JobManager.enqueueWebhookProcessing(webhookJobData);
    console.log(` Enqueued webhook processing job: ${job.id}`);
    console.log(` DEBUG: Job successfully queued with ID: ${job.id}`);

    return NextResponse.json({
      received: true,
      event: githubEvent,
      delivery: githubDelivery,
      repository: payload.repository.full_name,
      commits: payload.commits.length,
      jobId: job.id,
    });
  } catch (error) {
    console.error(" Webhook processing error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GitHub webhook validation endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "GitHub webhook endpoint",
    supportedEvents: SUPPORTED_EVENTS,
    timestamp: new Date().toISOString(),
  });
}
