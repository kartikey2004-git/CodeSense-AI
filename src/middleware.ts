// This middleware file is used to protect routes with Clerk authentication.

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// our public routes that don't require authentication which is sign-in page here

const isPublicRoute = createRouteMatcher(["/sign-in(.*)","/"]); 

// The clerkMiddleware helper enables authentication and is where you'll configure your protected routes.

export default clerkMiddleware(async (auth, req) => {

  // Create a check to see if the user's current route is a public route.  If it is not a public route, use auth.protect() to protect the route.

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

// By default, clerkMiddleware() will not protect any routes. All routes are public and you must opt-in to protection for routes.
