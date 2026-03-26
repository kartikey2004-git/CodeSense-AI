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

// create new routers and sub-routers in your tRPC API.

export const projectRouter = createTRPCRouter({
  /*

  - first zod schema to validate input data coming from frontend and then define a mutation to create a new project in our database

  - After creating the project, we want to poll the commits from the GitHub repository associated with this project.

  */

  createProject: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        githubUrl: z
          .string()
          .url()
          .refine((url) => {
            return url.includes("github.com");
          }, "Must be a valid GitHub URL"),
        githubToken: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const projectId = crypto.randomUUID();
        const jobId = `repo-indexing-${projectId}-${Date.now()}`;

        // Single transaction for project creation and job tracking
        const project = await ctx.db.$transaction(async (tx) => {
          const newProject = await tx.project.create({
            data: {
              id: projectId,
              githubUrl: input.githubUrl,
              name: input.name,
              status: "PENDING",
              userToProjects: {
                create: { userId: ctx.user.userId! },
              },
            },
          });

          // Update project with job tracking info
          await tx.project.update({
            where: { id: projectId },
            data: {
              jobId,
              status: "PROCESSING",
              startedAt: new Date(),
              lastActivity: new Date(),
            },
          });

          return newProject;
        });

        // Enqueue job with proper error handling
        try {
          await JobManager.enqueueRepoIndexing({
            projectId: project.id,
            githubUrl: input.githubUrl,
            githubToken: input.githubToken,
            jobId,
          });
        } catch (jobError) {
          // Mark project as failed if job enqueue fails
          await ctx.db.project.update({
            where: { id: project.id },
            data: {
              status: "FAILED",
              errorMessage: `Failed to enqueue job: ${jobError instanceof Error ? jobError.message : "Unknown error"}`,
              completedAt: new Date(),
            },
          });
          throw new Error(
            `Failed to enqueue repository indexing job: ${jobError instanceof Error ? jobError.message : "Unknown error"}`,
          );
        }

        return project;
      } catch (error) {
        throw new Error(
          `Failed to create project: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
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
      // Webhooks now handle commit updates - return commits ordered by latest first

      const commits = await ctx.db.commit.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
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
    return { connected: await cache.healthCheck() };
  }),

  getCacheMetrics: protectedProcedure.query(async () => {
    return { message: "Metrics removed in simplified cache" };
  }),

  resetCacheMetrics: protectedProcedure.mutation(async () => {
    return { message: "Metrics removed in simplified cache" };
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
        // Get specific job status by jobId
        const project = await ctx.db.project.findFirst({
          where: {
            jobId: input.jobId,
            userToProjects: {
              some: {
                userId: ctx.user.userId!,
              },
            },
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
        return project;
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

        // Return projects with their job status
        const projectJobStatuses = userProjects.map((project) => ({
          project,
          jobStatuses: project.jobId ? [project] : [], // Return project as job status if it has a jobId
        }));

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
        status: "PROCESSING", // Only return projects that are currently processing
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
        lastActivity: true,
      },
    });

    const allActiveJobs = userProjects.map((project) => ({
      project,
      activeJobs: project.jobId ? [project] : [], // Return project as active job if it has a jobId
    }));

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
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    const allJobStats = userProjects.map((project) => ({
      project,
      stats: {
        total: 1,
        pending: project.status === "PENDING" ? 1 : 0,
        processing: project.status === "PROCESSING" ? 1 : 0,
        completed: project.status === "COMPLETED" ? 1 : 0,
        failed: project.status === "FAILED" ? 1 : 0,
      },
    }));

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
    .mutation(async ({ input, ctx }) => {
      // Check if project exists and user has access
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
          userToProjects: {
            some: {
              userId: ctx.user.userId!,
            },
          },
        },
      });

      if (!project) {
        throw new Error("Project not found or access denied");
      }

      // Mark existing job as failed by updating project status
      if (project.status === "PROCESSING") {
        await ctx.db.project.update({
          where: { id: input.projectId },
          data: {
            status: "FAILED",
            errorMessage: "Job manually retried by user",
            completedAt: new Date(),
          },
        });
      }

      // Enqueue new job
      switch (input.jobType) {
        case "repo-indexing":
          if (!input.githubUrl) {
            throw new Error("GitHub URL is required for repo indexing");
          }
          // Generate a new jobId for retry
          const retryJobId = `repo-indexing-${Date.now()}-${crypto.randomUUID()}`;

          // Update project with new job tracking info
          await ctx.db.project.update({
            where: { id: input.projectId },
            data: {
              jobId: retryJobId,
              status: "PROCESSING",
              startedAt: new Date(),
              lastActivity: new Date(),
              errorMessage: null, // Clear previous error
            },
          });

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
    const [repoStats, webhookStats, meetingStats] = await Promise.all([
      JobManager.getQueueStats(QUEUE_NAMES.REPO_INDEXING),
      JobManager.getQueueStats(QUEUE_NAMES.WEBHOOK_PROCESSING),
      JobManager.getQueueStats(QUEUE_NAMES.MEETING_PROCESSING),
    ]);

    return {
      queues: {
        repoIndexing: repoStats,
        webhookProcessing: webhookStats,
        meetingProcessing: meetingStats,
      },
      globalStats: {
        total:
          repoStats.waiting +
          repoStats.active +
          webhookStats.waiting +
          webhookStats.active +
          meetingStats.waiting +
          meetingStats.active,
        waiting:
          repoStats.waiting + webhookStats.waiting + meetingStats.waiting,
        active: repoStats.active + webhookStats.active + meetingStats.active,
      },
    };
  }),
});

// trpc router is just like express router except that this trpc allows us to have a type end to end safe communication between our backend and frontend

// But with trpc , We need to integrate our kind of authentication middleware : we need to create a middleware to make sure person hitting our backend API's is authenticated and we're able to access loggedIn user data
