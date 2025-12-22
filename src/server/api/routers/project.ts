import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { pollCommits } from "@/lib/github";
import { indexGithubRepo } from "@/lib/github-loader"

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
      const project = await ctx.db.project.create({
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

      await indexGithubRepo(project.id, input.githubUrl, input.githubToken);

      await pollCommits(project.id);
      return project;
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
      await pollCommits(input.projectId).then().catch(console.error);
      return await ctx.db.commit.findMany({
        where: { projectId: input.projectId },
      });
    }),
});

// trpc router is just like express router except that this trpc allows us to have a type end to end safe communication between our backend and frontend

// But with trpc , We need to integrate our kind of authentication middleware : we need to create a middleware to make sure person hitting our backend API's is authenticated and we're able to access loggedIn user data
