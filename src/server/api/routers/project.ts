import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { JobManager } from "@/lib/jobs/manager";
import { QUEUE_NAMES } from "@/lib/queue";
import { cache } from "@/lib/cache";
import {
  checkMigrationStatus,
  migrateProjectToChunkedEmbeddings,
  getMigrationStats,
} from "@/lib/migration";
import { JobStatusService } from "@/lib/job-status";

// create new routers and sub-routers in your tRPC API.

export const projectRouter = createTRPCRouter({
  /*

  - first zod schema to validate input data coming from frontend and then define a mutation to create a new project in our database

  - After creating the project, we want to poll the commits from the GitHub repository associated with this project.

  */

  createProject: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        githubUrl: z.string(),
        githubToken: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log(`  Creating new project:`);
      console.log(` Project name: ${input.name}`);
      console.log(` GitHub URL: ${input.githubUrl}`);
      console.log(` User ID: ${ctx.user.userId}`);
      console.log(` GitHub token provided: ${!!input.githubToken}`);

      try {
        // Use transaction for atomicity
        const result = await ctx.db.$transaction(async (tx) => {
          console.log(` Creating project in database...`);
          const project = await tx.project.create({
            data: {
              githubUrl: input.githubUrl,
              name: input.name,
              userToProjects: {
                create: {
                  userId: ctx.user.userId!,
                },
              },
            },
          });
          console.log(`Project created with ID: ${project.id}`);

          return { project };
        });

        // Create JobStatus record AFTER transaction completes
        const jobId = `repo-indexing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log(` Creating job status with ID: ${jobId}`);
        await JobStatusService.createJobStatus({
          projectId: result.project.id,
          jobId,
          queueName: "repo-indexing",
          jobType: "repo-indexing",
          metadata: { githubUrl: input.githubUrl },
        });
        console.log(`Job status created successfully`);

        // Enqueue repository indexing job with existing JobStatus
        console.log(` Enqueuing repository indexing job...`);
        await JobManager.enqueueRepoIndexing({
          projectId: result.project.id,
          githubUrl: input.githubUrl,
          githubToken: input.githubToken,
          jobId: jobId, // Pass the jobId we created
        });
        console.log(`Job enqueued successfully`);

        console.log(`Project creation completed successfully`);
        return result.project;
      } catch (error) {
        console.error(`  Failed to create project:`, error);
        console.error("Error details:", {
          projectName: input.name,
          githubUrl: input.githubUrl,
          userId: ctx.user.userId,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          errorStack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    }),

  /*
  
  - Get the list of projects associated with the logged-in user and that are not deleted 

  - also every time we fetch commits for a specific project , we are going to check there is new commit but after trigger polling of commits from GitHub for that project

  */

  getProjects: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.project.findMany({
      where: {
        userToProjects: {
          some: {
            userId: ctx.user.userId!,
          },
        },
        deletedAt: null,
      },
    });
  }),
  getCommits: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      console.log(` DEBUG: Dashboard getCommits query:`);
      console.log(`  Project ID: ${input.projectId}`);

      // Webhooks now handle commit updates - return commits ordered by latest first
      const commits = await ctx.db.commit.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
      });

      console.log(`  Found commits: ${commits.length}`);
      console.log(`  Commit details:`);
      commits.forEach((commit, index) => {
        console.log(
          `    ${index + 1}. ${commit.commitHash.substring(0, 7)} - ${commit.commitMessage.substring(0, 50)}...`,
        );
        console.log(`       Author: ${commit.commitAuthorName}`);
        console.log(`       Date: ${commit.commitDate}`);
        console.log(
          `       Summary: ${commit.summary?.substring(0, 100) || "No summary"}...`,
        );
      });

      return commits;
    }),

  saveAnswer: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        question: z.string(),
        answer: z.string(),
        filesReferences: z.any(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.question.create({
        data: {
          answer: input.answer,
          filesReferences: input.filesReferences,
          projectId: input.projectId,
          question: input.question,
          userId: ctx.user.userId!,
        },
      });
    }),

  getQuestions: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db.question.findMany({
        where: {
          projectId: input.projectId,
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }),

  uploadMeeting: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        meetingUrl: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const meeting = await ctx.db.meeting.create({
        data: {
          meetingUrl: input.meetingUrl,
          projectId: input.projectId,
          name: input.name,
          status: "PROCESSING",
        },
      });

      // Enqueue meeting processing job
      await JobManager.enqueueMeetingProcessing({
        meetingId: meeting.id,
        projectId: input.projectId,
      });

      return meeting;
    }),

  getMeetings: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.meeting.findMany({
        where: {
          projectId: input.projectId,
        },
        include: { issues: true },
      });
    }),

  deleteMeeting: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        await tx.issue.deleteMany({
          where: { meetingId: input.meetingId },
        });

        return await tx.meeting.delete({
          where: { id: input.meetingId },
        });
      });
    }),

  getMeetingById: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.meeting.findUnique({
        where: { id: input.meetingId },
        include: { issues: true },
      });
    }),

  archiveProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.project.update({
        where: { id: input.projectId },
        data: { deletedAt: new Date() },
      });
    }),

  getTeamMembers: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.userToProject.findMany({
        where: {
          projectId: input.projectId,
        },
        include: {
          user: true,
        },
      });
    }),

  getProjectStatus: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        select: { status: true },
      });
      return project?.status || "UNKNOWN";
    }),

  getQueueStats: protectedProcedure.query(async () => {
    const [repoStats, meetingStats, webhookStats] = await Promise.all([
      JobManager.getQueueStats(QUEUE_NAMES.REPO_INDEXING),
      JobManager.getQueueStats(QUEUE_NAMES.MEETING_PROCESSING),
      JobManager.getQueueStats(QUEUE_NAMES.WEBHOOK_PROCESSING),
    ]);

    return {
      repoIndexing: repoStats,
      meetingProcessing: meetingStats,
      webhookProcessing: webhookStats,
    };
  }),

  getCacheStats: protectedProcedure.query(async () => {
    return await cache.getStats();
  }),

  getCacheMetrics: protectedProcedure.query(async () => {
    return cache.getMetrics();
  }),

  resetCacheMetrics: protectedProcedure.mutation(async () => {
    cache.resetMetrics();
    return { success: true };
  }),

  invalidateProjectCache: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input }) => {
      await cache.invalidateProjectCache(input.projectId);
      return { success: true };
    }),

  cacheHealthCheck: protectedProcedure.query(async () => {
    return await cache.healthCheck();
  }),

  // Migration endpoints for backward compatibility
  checkMigrationStatus: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return await checkMigrationStatus(input.projectId);
    }),

  migrateProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        batchSize: z.number().optional().default(5),
      }),
    )
    .mutation(async ({ input }) => {
      return await migrateProjectToChunkedEmbeddings(input.projectId, {
        batchSize: input.batchSize,
      });
    }),

  getMigrationStats: protectedProcedure.query(async () => {
    return await getMigrationStats();
  }),

  getJobStatus: protectedProcedure
    .input(z.object({ jobId: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      if (input.jobId) {
        // Get specific job status
        return await JobStatusService.getJobStatus(input.jobId);
      } else {
        // Get all job statuses for user's projects
        const userProjects = await ctx.db.project.findMany({
          where: {
            userToProjects: {
              some: {
                userId: ctx.user.userId!,
              },
            },
            deletedAt: null,
          },
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
          },
        });

        // Get job statuses for each project
        const projectJobStatuses = await Promise.all(
          userProjects.map(async (project) => {
            const statuses = await JobStatusService.getProjectJobStatuses(
              project.id,
            );
            return {
              project,
              jobStatuses: statuses,
            };
          }),
        );

        return projectJobStatuses;
      }
    }),

  getActiveJobs: protectedProcedure.query(async ({ ctx }) => {
    const userProjects = await ctx.db.project.findMany({
      where: {
        userToProjects: {
          some: {
            userId: ctx.user.userId!,
          },
        },
        deletedAt: null,
      },
      select: { id: true, name: true },
    });

    const allActiveJobs = await Promise.all(
      userProjects.map(async (project) => {
        const activeJobs = await JobStatusService.getActiveJobs(project.id);
        return {
          project,
          activeJobs,
        };
      }),
    );

    return allActiveJobs;
  }),

  getJobStats: protectedProcedure.query(async ({ ctx }) => {
    const userProjects = await ctx.db.project.findMany({
      where: {
        userToProjects: {
          some: {
            userId: ctx.user.userId!,
          },
        },
        deletedAt: null,
      },
      select: { id: true, name: true },
    });

    const allJobStats = await Promise.all(
      userProjects.map(async (project) => {
        const stats = await JobStatusService.getJobStats(project.id);
        return {
          project,
          stats,
        };
      }),
    );

    return allJobStats;
  }),

  retryJob: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        jobType: z.enum([
          "repo-indexing",
          "webhook-processing",
          "meeting-processing",
        ]),
        githubUrl: z.string().optional(),
        githubToken: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // Mark existing job as failed
      const activeJobs = await JobStatusService.getActiveJobs(input.projectId);
      const existingJob = activeJobs.find(
        (job) => job.jobType === input.jobType,
      );

      if (existingJob) {
        await JobStatusService.markJobFailed(
          existingJob.id,
          "Job manually retried by user",
        );
      }

      // Enqueue new job
      switch (input.jobType) {
        case "repo-indexing":
          if (!input.githubUrl) {
            throw new Error("GitHub URL is required for repo indexing");
          }
          // Generate a new jobId for retry
          const retryJobId = `repo-indexing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          await JobManager.enqueueRepoIndexing({
            projectId: input.projectId,
            githubUrl: input.githubUrl,
            githubToken: input.githubToken,
            jobId: retryJobId,
          });
          break;

        case "webhook-processing":
          // Webhook processing doesn't have a manual enqueue option
          throw new Error("Webhook processing cannot be manually retried");

        case "meeting-processing":
          // Meeting processing requires meeting ID
          throw new Error("Meeting processing requires meeting ID");

        default:
          throw new Error(`Unknown job type: ${input.jobType}`);
      }

      return { success: true, message: "Job enqueued for retry" };
    }),

  getSystemJobStats: protectedProcedure.query(async () => {
    // This would typically be restricted to admin users
    const [repoStats, webhookStats, meetingStats, globalStats] =
      await Promise.all([
        JobManager.getQueueStats(QUEUE_NAMES.REPO_INDEXING),
        JobManager.getQueueStats(QUEUE_NAMES.WEBHOOK_PROCESSING),
        JobManager.getQueueStats(QUEUE_NAMES.MEETING_PROCESSING),
        JobStatusService.getJobStats(),
      ]);

    return {
      queues: {
        repoIndexing: repoStats,
        webhookProcessing: webhookStats,
        meetingProcessing: meetingStats,
      },
      global: globalStats,
    };
  }),
});

// trpc router is just like express router except that this trpc allows us to have a type end to end safe communication between our backend and frontend

// But with trpc , We need to integrate our kind of authentication middleware : we need to create a middleware to make sure person hitting our backend API's is authenticated and we're able to access loggedIn user data
