import { createHmac } from "crypto";

console.log("Webhook received");

// GitHub webhook signature verification
export function verifyGithubSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  try {
    if (!secret) {
      console.error("  GitHub webhook secret not configured");
      return false;
    }

    if (!signature) {
      console.error("  Missing x-hub-signature-256 header");
      return false;
    }

    // GitHub signature format: "sha256=<hex>"
    if (!signature.startsWith("sha256=")) {
      console.error("  Invalid signature format");
      return false;
    }

    const receivedSignature = signature.slice(7); // Remove "sha256=" prefix

    // Compute expected signature
    const hmac = createHmac("sha256", secret);
    hmac.update(rawBody, "utf8");
    const expectedSignature = hmac.digest("hex");

    // Constant-time comparison to prevent timing attacks
    const signaturesMatch = constantTimeCompare(
      receivedSignature,
      expectedSignature,
    );

    if (!signaturesMatch) {
      console.error("  Signature verification failed");
      console.log(`Expected: sha256=${expectedSignature}`);
      console.log(`Received: ${signature}`);
    }

    return signaturesMatch;
  } catch (error) {
    console.error("  Signature verification error:", error);
    return false;
  }
}

// Constant-time comparison to prevent timing attacks
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// Simplified constant-time compare using built-in method
function constantTimeCompare(a: string, b: string): boolean {
  try {
    // Use crypto.timingSafeEqual if available (Node.js >= 15.6.0)
    const crypto = require("crypto");
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    // Fallback to manual implementation
    return constantTimeEqual(a, b);
  }
}

// Get webhook secret from environment
export function getGithubWebhookSecret(): string {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    console.warn("    GITHUB_WEBHOOK_SECRET not set in environment variables");
  }

  return secret || "";
}

// Parse GitHub webhook payload safely
export function parseGithubPayload<T>(rawBody: string): T | null {
  try {
    return JSON.parse(rawBody) as T;
  } catch (error) {
    console.error("  Failed to parse GitHub webhook payload:", error);
    return null;
  }
}

// GitHub webhook event types
export interface GithubPushEvent {
  zen: string;
  hook_id: number;
  hook: {
    type: string;
    id: number;
    name: string;
    active: boolean;
    events: string[];
    config: {
      content_type: string;
      insecure_ssl: string;
      url: string;
    };
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      id: number;
    };
    private: boolean;
    html_url: string;
    description: string | null;
    fork: boolean;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    git_url: string;
    ssh_url: string;
    clone_url: string;
    svn_url: string;
    homepage: string | null;
    size: number;
    stargazers_count: number;
    watchers_count: number;
    language: string;
    forks_count: number;
    open_issues_count: number;
    master_branch: string;
    default_branch: string;
    topics: string[];
    has_issues: boolean;
    has_projects: boolean;
    has_wiki: boolean;
    has_pages: boolean;
    has_downloads: boolean;
    archived: boolean;
    disabled: boolean;
    visibility: string;
    permissions: {
      admin: boolean;
      push: boolean;
      pull: boolean;
    };
    allow_rebase_merge: boolean;
    allow_update_branch: boolean;
    delete_branch_on_merge: boolean;
    allow_merge_commit: boolean;
    subscribers_count: number;
    network_count: number;
    license: {
      key: string;
      name: string;
      spdx_id: string;
      url: string;
      node_id: string;
    };
    forks: number;
    open_issues: number;
    watchers: number;
    stargazers: number;
  };
  pusher: {
    name: string;
    email: string;
  };
  sender: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
  };
  ref: string;
  before: string;
  after: string;
  created: boolean;
  deleted: boolean;
  forced: boolean;
  base_ref: string | null;
  compare: string;
  commits: Array<{
    id: string;
    tree_id: string;
    distinct: boolean;
    message: string;
    timestamp: string;
    url: string;
    author: {
      name: string;
      email: string;
      username: string;
    };
    committer: {
      name: string;
      email: string;
      username: string;
    };
    added: string[];
    removed: string[];
    modified: string[];
  }>;
  head_commit: {
    id: string;
    tree_id: string;
    distinct: boolean;
    message: string;
    timestamp: string;
    url: string;
    author: {
      name: string;
      email: string;
      username: string;
    };
    committer: {
      name: string;
      email: string;
      username: string;
    };
    added: string[];
    removed: string[];
    modified: string[];
  };
}
