import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { projectRouter } from "./routers/project";

// This is the primary router for your server.

// All routers added in /api/routers should be manually added here. 

// Within trpc router we can have multiple sub routers like user , project : here we have project router to handle all project related api calls

export const appRouter = createTRPCRouter({
  project: projectRouter,
});

export type AppRouter = typeof appRouter;

// Create a server-side caller for the tRPC API.

export const createCaller = createCallerFactory(appRouter);
