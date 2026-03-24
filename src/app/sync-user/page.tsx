import { auth, clerkClient } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";

export default async function SyncUserPage() {
  try {
    // The auth() helper returns the Auth object of the currently active user.
    const { userId } = await auth();

    if (!userId) {
      console.log("No userId found, redirecting to sign-in");
      redirect("/sign-in");
    }

    // Check if user already exists in our database
    const existingUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (existingUser) {
      console.log(`User ${userId} already exists, redirecting to dashboard`);
      redirect("/dashboard");
    }

    // Constructs a BAPI client that accesses request data within the runtime.
    const ClerkClient = await clerkClient();

    // get the user from clerkClient on basis of userId
    const user = await ClerkClient.users.getUser(userId);

    if (!user.emailAddresses[0]?.emailAddress) {
      console.error("No email address found for user:", userId);
      return notFound();
    }

    // create the new user with given information into database
    console.log(`Creating user ${userId} in database`);

    await db.user.create({
      data: {
        id: userId,
        emailAddress: user.emailAddresses[0]?.emailAddress ?? "",
        imageUrl: user.imageUrl,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });

    console.log(`User ${userId} synchronized successfully`);
    return redirect("/dashboard");
  } catch (error) {
    // Handle Next.js redirect errors - these are expected behavior

    if (error instanceof Error && error.message === "NEXT_REDIRECT") {    
      throw error; 
    }

    console.error("Failed to sync user:", error);

    // If it's a Prisma unique constraint error, user might exist, redirect to dashboard

    if (error instanceof Error && error.message.includes("Unique constraint")) {
      console.log(
        `User likely exists due to constraint error, redirecting to dashboard`,
      );
      return redirect("/dashboard");
    }

    // For Clerk API errors, try to continue to dashboard
    
    if (error instanceof Error && error.message.includes("Clerk")) {
      console.log(`Clerk API error, attempting to continue to dashboard`);
      return redirect("/dashboard");
    }

    // For other errors, show not found page
    console.error("Unexpected error in sync-user:", error);
    return notFound();
  }
}

/*

  - Clerk handles its own user storage, but our app also needs a copy of the user in our Postgres (Neon) database.

    - After a user signs in with Clerk, they only exist inside Clerk's system.
    
    - To keep our local database in sync, we redirect them to /sync-user immediately after authentication.

    - The /sync-user route creates (or updates) the user's record in Postgres, ensuring Clerk and our internal database stay aligned.

*/
