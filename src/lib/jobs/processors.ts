import { Job } from "bullmq";
import { indexGithubRepo } from "../github-loader";
import { normalizeGithubUrl, pollCommits } from "../github";
import { processMeeting } from "../assembly";
import { db } from "@/server/db";
import { cache } from "../cache";
import { JobStatusService, createJobWithStatus } from "../job-status";
import { aiSummariseCommit } from "../gemini";
import { shouldProcessCommit, getFilteringStats } from "../filtering";
import type {
  RepoIndexingJobData,
  CommitPollingJobData,
  MeetingProcessingJobData,
  WebhookProcessingJobData,
  JobResult,
  RepoIndexingResult,
  CommitPollingResult,
  MeetingProcessingResult,
  WebhookProcessingResult,
} from "./types";

// Repository indexing processor
export const repoIndexingProcessor = async (
  job: Job<RepoIndexingJobData>,
): Promise<JobResult<RepoIndexingResult>> => {
  const { projectId, githubUrl, githubToken, jobId } = job.data;

  console.log(`Starting repository indexing for project ${projectId}`);
  console.log(`Repository URL: ${githubUrl}`);
  console.log(`GitHub token available: ${!!githubToken}`);
  console.log(`Job ID: ${jobId}`);

  try {
    console.log(`Creating job status tracker for job ${jobId}`);

    // Update project status to PROCESSING
    await updateProjectStatus(projectId, "PROCESSING");
    console.log(`Updated project ${projectId} status to PROCESSING`);

    // Step 1: Clone repository (10%)
    console.log(`⬇Starting repository clone for project ${projectId}`);
    await JobStatusService.updateJobStatus(jobId, {
      status: "PROCESSING",
      progress: 10,
      currentStep: "Cloning repository from GitHub",
    });

    // Perform the indexing
    console.log(`Beginning GitHub repository indexing`);
    const result = await indexGithubRepo(projectId, githubUrl, githubToken);
    console.log(
      `GitHub indexing completed: ${JSON.stringify(result, null, 2)}`,
    );

    // Step 3: Poll commits after indexing (95%)
    console.log(`Polling recent commits for project ${projectId}`);
    await JobStatusService.updateJobStatus(jobId, {
      status: "PROCESSING",
      progress: 95,
      currentStep: "Polling recent commits",
    });

    try {
      const commits = await pollCommits(projectId);
      console.log(`Polled ${commits.length} commits for project ${projectId}`);
    } catch (commitError) {
      console.warn(
        `Commit polling failed for project ${projectId}:`,
        commitError,
      );
      // Don't fail the entire job if commit polling fails
    }

    // Step 4: Processing complete (90%)
    console.log(`Finalizing indexing results for project ${projectId}`);
    await JobStatusService.updateJobStatus(jobId, {
      status: "PROCESSING",
      progress: 90,
      currentStep: "Finalizing indexing results",
    });

    // Invalidate all project-related cache since new data is available
    await cache.invalidateProjectCache(projectId);
    console.log(`Invalidated cache for project ${projectId}`);

    // Step 5: Update project to COMPLETED (100%)
    await JobStatusService.updateJobStatus(jobId, {
      status: "COMPLETED",
      progress: 100,
      currentStep: "Repository indexing completed",
    });
    console.log(`Job ${jobId} marked as completed`);

    // CRITICAL: Update project status to COMPLETED
    await updateProjectStatus(projectId, "COMPLETED");
    console.log(`Project ${projectId} status updated to COMPLETED`);

    const jobResult: JobResult<RepoIndexingResult> = {
      success: true,
      data: {
        totalFiles: result.totalFiles,
        indexedFiles: result.indexedFiles,
        skippedFiles: result.totalFiles - result.indexedFiles,
        errors: [],
        totalChunks: result.totalChunks || 0,
        skippedChunks: result.skippedChunks || 0,
      },
      metadata: {
        projectId,
        githubUrl,
        processedAt: new Date().toISOString(),
      },
    };

    console.log(
      `Repository indexing completed for project ${projectId}:`,
      jobResult,
    );
    return jobResult;
  } catch (error) {
    console.error(
      `Repository indexing failed for project ${projectId}:`,
      error,
    );
    console.error("Full error details:", {
      projectId,
      githubUrl,
      jobId: jobId,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
      errorType: typeof error,
    });

    // Mark job as failed using JobStatusService
    await JobStatusService.updateJobStatus(jobId, {
      status: "FAILED",
      progress: 0,
      currentStep: "Repository indexing failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });

    // CRITICAL: Update project status to FAILED
    await updateProjectStatus(projectId, "FAILED");
    console.log(`Project ${projectId} status updated to FAILED`);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      metadata: {
        projectId,
        githubUrl,
        failedAt: new Date().toISOString(),
      },
    };
  }
};

// Commit polling processor
export const commitPollingProcessor = async (
  job: Job<CommitPollingJobData>,
): Promise<JobResult<CommitPollingResult>> => {
  const { projectId } = job.data;

  try {
    console.log(`Starting commit polling for project ${projectId}`);

    // Get current commit count before polling
    const beforeCount = await db.commit.count({
      where: { projectId },
    });

    // Perform commit polling
    await pollCommits(projectId);

    // Get new commit count
    const afterCount = await db.commit.count({
      where: { projectId },
    });

    const newCommits = afterCount - beforeCount;

    // If new commits were found, invalidate project cache
    if (newCommits > 0) {
      await cache.invalidateProjectCache(projectId);
      console.log(
        `Invalidated cache for project ${projectId} due to ${newCommits} new commits`,
      );
    }

    const jobResult: JobResult<CommitPollingResult> = {
      success: true,
      data: {
        commitsProcessed: afterCount,
        newCommits,
      },
      metadata: {
        projectId,
        processedAt: new Date().toISOString(),
      },
    };

    console.log(
      `Commit polling completed for project ${projectId}: ${newCommits} new commits`,
    );
    return jobResult;
  } catch (error) {
    console.error(`Commit polling failed for project ${projectId}:`, error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      metadata: {
        projectId,
        failedAt: new Date().toISOString(),
      },
    };
  }
};

// Meeting processing processor
export const meetingProcessingProcessor = async (
  job: Job<MeetingProcessingJobData>,
): Promise<JobResult<MeetingProcessingResult>> => {
  const { meetingId, projectId } = job.data;

  try {
    console.log(`Starting meeting processing for meeting ${meetingId}`);

    // Update meeting status to processing
    await updateMeetingStatus(meetingId, "PROCESSING");

    // Get meeting URL from database
    const meeting = await db.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new Error(`Meeting ${meetingId} not found`);
    }

    // Process the meeting audio
    const result = await processMeeting(meeting.meetingUrl);

    if (!result) {
      throw new Error("Meeting processing returned no result");
    }

    // Save the extracted issues to database
    for (const summary of result.summaries) {
      await db.issue.create({
        data: {
          start: summary.start,
          end: summary.end,
          gist: summary.gist,
          headline: summary.headline,
          summary: summary.summary,
          meetingId: meetingId,
        },
      });
    }

    // Update meeting status to completed
    await updateMeetingStatus(meetingId, "COMPLETED");

    const jobResult: JobResult<MeetingProcessingResult> = {
      success: true,
      data: {
        issuesExtracted: result.summaries.length,
        transcriptionCompleted: true,
      },
      metadata: {
        meetingId,
        projectId,
        processedAt: new Date().toISOString(),
      },
    };

    console.log(
      `Meeting processing completed for meeting ${meetingId}:`,
      result,
    );
    return jobResult;
  } catch (error) {
    console.error(`Meeting processing failed for meeting ${meetingId}:`, error);

    // Update meeting status to failed
    await updateMeetingStatus(meetingId, "FAILED");

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      metadata: {
        meetingId,
        projectId,
        failedAt: new Date().toISOString(),
      },
    };
  }
};

// Helper functions for status updates
async function updateProjectStatus(projectId: string, status: string) {
  await db.project.update({
    where: { id: projectId },
    data: { status },
  });
}

async function updateMeetingStatus(
  meetingId: string,
  status: "PROCESSING" | "COMPLETED" | "FAILED",
) {
  await db.meeting.update({
    where: { id: meetingId },
    data: { status },
  });
}

// Webhook processing processor
export const webhookProcessingProcessor = async (
  job: Job<WebhookProcessingJobData>,
): Promise<JobResult<WebhookProcessingResult>> => {
  const { deliveryId, event, repository, ref, before, after, commits, pusher } =
    job.data;

  console.log(
    `STARTING webhook processing: ${deliveryId} for ${repository.full_name} with ${commits.length} commits`,
  );

  // CRITICAL: Check for duplicate delivery to ensure idempotency
  // Since we're no longer using JobStatus model, we'll use a simple in-memory check
  // or implement a separate deduplication mechanism if needed
  const deliveryKey = `webhook-${deliveryId}`;
  console.log(`Processing webhook delivery: ${deliveryKey}`);

  // Log each commit
  console.log(`DEBUG: Commits to process:`);
  commits.forEach((commit, index) => {
    console.log(
      `  Commit ${index + 1}: ${commit.id.substring(0, 7)} - ${commit.message}`,
    );
    console.log(`    Author: ${commit.author.name} <${commit.author.email}>`);
    console.log(`    Added: ${commit.added.join(", ") || "None"}`);
    console.log(`    Modified: ${commit.modified.join(", ") || "None"}`);
    console.log(`    Removed: ${commit.removed.join(", ") || "None"}`);
  });

  try {
    // Step 3.6: Repository matching - find project by GitHub URL
    const githubUrl = repository.clone_url;
    const normalizedGithubUrl = normalizeGithubUrl(githubUrl);

    // More precise matching - try exact match first, then contains
    let project = await db.project.findFirst({
      where: {
        githubUrl: normalizedGithubUrl,
        deletedAt: null,
      },
    });

    // If no exact match, try contains as fallback
    if (!project) {
      project = await db.project.findFirst({
        where: {
          githubUrl: {
            contains: normalizedGithubUrl,
          },
          deletedAt: null,
        },
      });
    }

    if (!project) {
      console.log(`No project found for repository: ${repository.full_name}`);
      return {
        success: true,
        data: {
          commitsProcessed: 0,
          repositoryMatched: false,
        },
        metadata: {
          deliveryId,
          repository: repository.full_name,
          reason: "No matching project found",
        },
      };
    }

    console.log(
      `Found project ${project.id} for repository ${repository.full_name}`,
    );

    // Process commits
    let processedCommits = 0;

    for (const commit of commits) {
      try {
        console.log(
          `Processing commit: ${commit.id.substring(0, 7)} - ${commit.message.substring(0, 50)}...`,
        );

        // Combine all files from this commit
        const allFiles = [
          ...commit.added,
          ...commit.modified,
          ...commit.removed,
        ];

        // Apply filtering logic BEFORE expensive AI operations
        const shouldProcess = shouldProcessCommit(commit.message, allFiles);

        if (!shouldProcess) {
          const stats = getFilteringStats(allFiles);
          console.log(
            ` Skipping irrelevant commit: ${commit.id.substring(0, 7)} (${stats.relevant}/${stats.total} relevant files)`,
          );

          // Still record the commit but without AI processing
          await db.commit.upsert({
            where: {
              projectId_commitHash: {
                projectId: project.id,
                commitHash: commit.id,
              },
            },
            update: {
              summary: `Commit by ${commit.author.name}: ${commit.message} (auto-skipped: no relevant changes)`,
            },
            create: {
              projectId: project.id,
              commitMessage: commit.message,
              commitHash: commit.id,
              commitAuthorName: commit.author.name,
              commitAuthorAvatar: `https://github.com/${commit.author.username}.png`,
              commitDate: new Date(), // Use current date since webhook doesn't provide timestamp
              summary: `Commit by ${commit.author.name}: ${commit.message} (auto-skipped: no relevant changes)`,
            },
          });

          processedCommits++;
        } else {
          // Generate AI summary for the commit (only for relevant commits)
          let aiSummary: string;
          try {
            console.log(
              ` Generating AI summary for commit ${commit.id.substring(0, 7)}...`,
            );

            // Create a summary of changes from the commit data
            const changesSummary = [
              `Commit: ${commit.message}`,
              `Added files: ${commit.added.length > 0 ? commit.added.join(", ") : "None"}`,
              `Modified files: ${commit.modified.length > 0 ? commit.modified.join(", ") : "None"}`,
              `Removed files: ${commit.removed.length > 0 ? commit.removed.join(", ") : "None"}`,
            ].join("\n");

            // Generate AI summary using Gemini
            aiSummary = await aiSummariseCommit(changesSummary);

            if (!aiSummary) {
              console.log(
                `AI summary returned null, using fallback for commit ${commit.id.substring(0, 7)}`,
              );
              aiSummary = `Commit by ${commit.author.name}: ${commit.message}`;
            }

            console.log(
              ` AI summary generated for commit ${commit.id.substring(0, 7)}`,
            );
          } catch (summaryError) {
            console.warn(
              ` Failed to generate AI summary for commit ${commit.id.substring(0, 7)}:`,
              summaryError,
            );
            // Fallback to simple summary
            aiSummary = `Commit by ${commit.author.name}: ${commit.message.substring(0, 100)}...`;
          }

          // Use upsert for idempotency (atomic create-or-update)
          console.log(
            ` Saving commit ${commit.id.substring(0, 7)} to database...`,
          );

          const upsertData = {
            where: {
              projectId_commitHash: {
                projectId: project.id,
                commitHash: commit.id,
              },
            },
            update: {
              summary: aiSummary, // Update the summary when commit already exists
            },
            create: {
              projectId: project.id,
              commitMessage: commit.message,
              commitHash: commit.id,
              commitAuthorName: commit.author.name,
              commitAuthorAvatar: `https://github.com/${commit.author.username}.png`,
              commitDate: new Date(), // Use current date since webhook doesn't provide timestamp
              summary: aiSummary,
            },
          };

          const result = await db.commit.upsert(upsertData);
          console.log(
            ` Successfully saved commit ${commit.id.substring(0, 7)} to database`,
          );
          console.log(` DEBUG: Database result:`, {
            id: result.id,
            projectId: result.projectId,
            commitHash: result.commitHash,
            createdAt: result.createdAt,
            summaryLength: result.summary?.length || 0,
          });

          processedCommits++;
          console.log(
            ` Successfully processed commit: ${commit.id.substring(0, 7)} - ${commit.message.substring(0, 50)}...`,
          );
        }
      } catch (error) {
        console.error(` Failed to process commit ${commit.id}:`, error);
        console.error("Error details:", {
          commitId: commit.id,
          projectId: project.id,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          errorStack: error instanceof Error ? error.stack : undefined,
        });
      }
    }

    // Invalidate cache for this project since new commits were added
    if (processedCommits > 0) {
      await cache.invalidateProjectCache(project.id);
      console.log(
        `Invalidated cache for project ${project.id} due to ${processedCommits} new commits`,
      );
    }

    const jobResult: JobResult<WebhookProcessingResult> = {
      success: true,
      data: {
        commitsProcessed: processedCommits,
        repositoryMatched: true,
        projectId: project.id,
      },
      metadata: {
        deliveryId,
        repository: repository.full_name,
        ref,
        before,
        after,
        processedAt: new Date().toISOString(),
      },
    };

    console.log(
      `Webhook processing completed: ${processedCommits} commits processed`,
    );
    return jobResult;
  } catch (error) {
    console.error(`Webhook processing failed for ${deliveryId}:`, error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      metadata: {
        deliveryId,
        repository: repository.full_name,
        failedAt: new Date().toISOString(),
      },
    };
  }
};
