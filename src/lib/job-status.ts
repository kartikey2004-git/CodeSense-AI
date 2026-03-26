// Job status tracking service for real-time progress updates
// Uses Project model for job tracking instead of separate JobStatus model

import { db } from "@/server/db";
import { Job } from "bullmq";
import {
  validateProjectStatus,
  sanitizeProjectStatus,
} from "@/lib/db-validation";

// Job status types
export type JobStatusType = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type JobType =
  | "repo-indexing"
  | "webhook-processing"
  | "meeting-processing";

// Job status update interface
export interface JobStatusUpdate {
  status: JobStatusType;
  progress?: number;
  currentStep?: string;
  message?: string;
  metadata?: Record<string, any>;
}

// Job status creation interface
export interface CreateJobStatus {
  projectId: string;
  jobId: string;
  queueName: string;
  jobType: JobType;
  metadata?: Record<string, any>;
}

// Job status service class
export class JobStatusService {
  // Create a new job status record (updates project)
  static async createJobStatus(data: CreateJobStatus) {
    try {
      // Update project with job tracking info instead of creating separate record
      const project = await db.project.update({
        where: { id: data.projectId },
        data: {
          jobId: data.jobId,
          status: sanitizeProjectStatus("PENDING"),
          currentStep: "Queued",
          progress: 0,
          startedAt: new Date(),
          lastActivity: new Date(),
        },
      });

      console.log(
        `Created job status: ${data.jobId} for project ${data.projectId}`,
      );
      return project;
    } catch (error) {
      console.error("Failed to create job status:", error);
      throw error;
    }
  }

  // Update job status (updates project)
  static async updateJobStatus(
    jobId: string,
    update: JobStatusUpdate,
    options?: {
      updateProject?: boolean;
    },
  ) {
    try {
      // Update project directly since we're not using separate JobStatus model
      const sanitizedStatus = sanitizeProjectStatus(update.status);

      const result = await db.project.updateMany({
        where: { jobId: jobId },
        data: {
          status: sanitizedStatus,
          progress: update.progress
            ? Math.max(0, Math.min(100, update.progress))
            : undefined,
          currentStep: update.currentStep,
          errorMessage: update.status === "FAILED" ? update.message : undefined,
          startedAt: update.status === "PROCESSING" ? new Date() : undefined,
          completedAt: update.status === "COMPLETED" ? new Date() : undefined,
          lastActivity: new Date(),
        },
      });

      if (result.count === 0) {
        throw new Error(`Project with jobId ${jobId} not found`);
      }

      // Get the updated project
      const updatedProject = await db.project.findFirst({
        where: { jobId: jobId },
      });

      console.log(
        `Updated job status: ${jobId} -> ${update.status} (${update.progress || 0}%)`,
      );
      return updatedProject;
    } catch (error) {
      console.error(`Failed to update job status ${jobId}:`, error);
      throw error;
    }
  }

  // Update project status (internal method)
  static async updateProjectStatus(
    projectId: string,
    update: {
      status: string;
      jobId?: string;
      currentStep?: string;
      progress?: number;
      errorMessage?: string;
      startedAt?: Date;
      completedAt?: Date;
    },
  ) {
    try {
      const sanitizedStatus = sanitizeProjectStatus(update.status);

      const result = await db.project.updateMany({
        where: { id: projectId },
        data: {
          status: sanitizedStatus,
          jobId: update.jobId,
          currentStep: update.currentStep,
          progress: update.progress || 0,
          errorMessage: update.errorMessage,
          startedAt: update.startedAt,
          completedAt: update.completedAt,
          lastActivity: new Date(),
        },
      });

      if (result.count === 0) {
        throw new Error(`Project ${projectId} not found for status update`);
      }

      console.log(
        `Updated project status: ${projectId} -> ${update.status} (${update.progress || 0}%)`,
      );
    } catch (error) {
      console.error(`Failed to update project status ${projectId}:`, error);
      throw error;
    }
  }

  // Get job status by job ID (returns project)
  static async getJobStatus(jobId: string) {
    try {
      console.log(`Fetching job status for jobId: ${jobId}`);
      const result = await db.project.findFirst({
        where: { jobId: jobId },
        select: {
          id: true,
          name: true,
          status: true,
          progress: true,
          currentStep: true,
          errorMessage: true,
          startedAt: true,
          completedAt: true,
          lastActivity: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      console.log(`Successfully fetched job status for ${jobId}:`, {
        found: !!result,
        status: result?.status,
        progress: result?.progress,
        projectName: result?.name,
      });
      return result;
    } catch (error) {
      console.error(`  Failed to get job status ${jobId}:`, error);
      console.error("Error details:", {
        jobId,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  // Get all job statuses for a project (returns project history)
  static async getProjectJobStatuses(projectId: string) {
    try {
      // Since we're using project model, return current project status
      // For historical data, we'd need to implement a separate audit trail
      const project = await db.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          name: true,
          status: true,
          progress: true,
          currentStep: true,
          errorMessage: true,
          jobId: true,
          startedAt: true,
          completedAt: true,
          lastActivity: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return project ? [project] : [];
    } catch (error) {
      console.error(`Failed to get project job statuses ${projectId}:`, error);
      throw error;
    }
  }

  // Get active jobs for a project
  static async getActiveJobs(projectId: string) {
    try {
      return await db.project.findMany({
        where: {
          id: projectId,
          status: {
            in: ["PENDING", "PROCESSING"],
          },
          jobId: { not: null },
        },
        select: {
          id: true,
          name: true,
          status: true,
          progress: true,
          currentStep: true,
          jobId: true,
          startedAt: true,
          lastActivity: true,
        },
      });
    } catch (error) {
      console.error(`Failed to get active jobs ${projectId}:`, error);
      throw error;
    }
  }

  // Mark job as failed
  static async markJobFailed(
    jobId: string,
    error: Error | string,
    options?: {
      updateProject?: boolean;
    },
  ) {
    const errorMessage = typeof error === "string" ? error : error.message;

    return await this.updateJobStatus(
      jobId,
      {
        status: "FAILED",
        message: errorMessage,
        progress: 0,
      },
      options,
    );
  }

  // Mark job as completed
  static async markJobCompleted(
    jobId: string,
    message?: string,
    options?: {
      updateProject?: boolean;
    },
  ) {
    return await this.updateJobStatus(
      jobId,
      {
        status: "COMPLETED",
        progress: 100,
        currentStep: "Completed",
        message: message || "Job completed successfully",
      },
      options,
    );
  }

  // Update job progress
  static async updateJobProgress(
    jobId: string,
    progress: number,
    currentStep: string,
    options?: {
      updateProject?: boolean;
      status?: JobStatusType;
    },
  ) {
    return await this.updateJobStatus(
      jobId,
      {
        status: options?.status || "PROCESSING",
        progress: Math.max(0, Math.min(100, progress)),
        currentStep,
      },
      options,
    );
  }

  // Clean up old job statuses (maintenance)
  static async cleanupOldJobs(daysOld: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Since we're using project model, update old completed/failed projects
      // to remove job tracking info rather than deleting
      const updated = await db.project.updateMany({
        where: {
          lastActivity: {
            lt: cutoffDate,
          },
          status: {
            in: ["COMPLETED", "FAILED"],
          },
          jobId: { not: null },
        },
        data: {
          jobId: null,
          currentStep: null,
          errorMessage: null,
        },
      });

      console.log(`Cleaned up job tracking for ${updated.count} old projects`);
      return updated.count;
    } catch (error) {
      console.error("Failed to cleanup old job statuses:", error);
      throw error;
    }
  }

  // Get job statistics
  static async getJobStats(projectId?: string) {
    try {
      const where = projectId
        ? { id: projectId, jobId: { not: null } }
        : { jobId: { not: null } };

      const [pending, processing, completed, failed] = await Promise.all([
        db.project.count({ where: { ...where, status: "PENDING" } }),
        db.project.count({ where: { ...where, status: "PROCESSING" } }),
        db.project.count({ where: { ...where, status: "COMPLETED" } }),
        db.project.count({ where: { ...where, status: "FAILED" } }),
      ]);

      return {
        pending,
        processing,
        completed,
        failed,
        total: pending + processing + completed + failed,
      };
    } catch (error) {
      console.error("Failed to get job stats:", error);
      throw error;
    }
  }

  // Check for stuck jobs (jobs in processing for too long)
  static async findStuckJobs(maxAgeMinutes: number = 30) {
    try {
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - maxAgeMinutes);

      const stuckJobs = await db.project.findMany({
        where: {
          status: "PROCESSING",
          startedAt: {
            lt: cutoffTime,
          },
          jobId: { not: null },
        },
        select: {
          id: true,
          name: true,
          status: true,
          jobId: true,
          startedAt: true,
          lastActivity: true,
        },
      });

      return stuckJobs;
    } catch (error) {
      console.error("Failed to find stuck jobs:", error);
      throw error;
    }
  }

  // Mark stuck jobs as failed
  static async handleStuckJobs(maxAgeMinutes: number = 30) {
    try {
      const stuckJobs = await this.findStuckJobs(maxAgeMinutes);

      for (const job of stuckJobs) {
        if (job.jobId) {
          await this.markJobFailed(
            job.jobId,
            `Job stuck in processing for >${maxAgeMinutes} minutes`,
            { updateProject: true },
          );
        }
      }

      console.log(`Handled ${stuckJobs.length} stuck jobs`);
      return stuckJobs.length;
    } catch (error) {
      console.error("Failed to handle stuck jobs:", error);
      throw error;
    }
  }
}

// BullMQ job extension with status tracking
export class JobWithStatus<T = any> {
  private job: Job<T>;
  private projectId: string;
  private queueName: string;
  private jobType: JobType;

  constructor(
    job: Job<T>,
    projectId: string,
    queueName: string,
    jobType: JobType,
  ) {
    this.job = job;
    this.projectId = projectId;
    this.queueName = queueName;
    this.jobType = jobType;
  }

  get id(): string {
    return this.job.id || "";
  }

  get data(): T {
    return this.job.data;
  }

  // Initialize job status
  async initStatus(metadata?: Record<string, any>) {
    const jobId = this.job.id;
    if (!jobId) {
      throw new Error("Job ID is required for status tracking");
    }

    return await JobStatusService.createJobStatus({
      projectId: this.projectId,
      jobId,
      queueName: this.queueName,
      jobType: this.jobType,
      metadata,
    });
  }

  // Update progress
  async updateProgress(progress: number, currentStep: string) {
    const jobId = this.job.id;
    if (!jobId) {
      throw new Error("Job ID is required for progress updates");
    }

    return await JobStatusService.updateJobProgress(
      jobId,
      progress,
      currentStep,
      { updateProject: true },
    );
  }

  // Mark as processing
  async markProcessing(message?: string) {
    const jobId = this.job.id;
    if (!jobId) {
      throw new Error("Job ID is required for status updates");
    }

    return await JobStatusService.updateJobStatus(
      jobId,
      {
        status: "PROCESSING",
        currentStep: message || "Processing",
        progress: 0,
      },
      { updateProject: true },
    );
  }

  // Mark as completed
  async markCompleted(message?: string) {
    const jobId = this.job.id;
    if (!jobId) {
      throw new Error("Job ID is required for status updates");
    }

    return await JobStatusService.markJobCompleted(jobId, message, {
      updateProject: true,
    });
  }

  // Mark as failed
  async markFailed(error: Error | string) {
    const jobId = this.job.id;
    if (!jobId) {
      throw new Error("Job ID is required for status updates");
    }

    return await JobStatusService.markJobFailed(jobId, error, {
      updateProject: true,
    });
  }
}

// Helper to create job with status tracking
export function createJobWithStatus<T = any>(
  job: Job<T>,
  projectId: string,
  queueName: string,
  jobType: JobType,
): JobWithStatus<T> {
  return new JobWithStatus(job, projectId, queueName, jobType);
}
