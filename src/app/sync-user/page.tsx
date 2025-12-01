"use server";

import React from "react";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";

const SyncUser = async () => {
  // The auth() helper returns the Auth object of the currently active user.

  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not found");
  }

  // Constructs a BAPI client that accesses request data within the runtime.

  const ClerkClient = await clerkClient();

  // get the user from clerkClient on basis of userId

  const user = await ClerkClient.users.getUser(userId);

  if (!user.emailAddresses[0]?.emailAddress) {
    return notFound();
  }

  // create the new user with given information into database or if user exists then update the data
  
  await db.user.upsert({
    where: {
      emailAddress: user.emailAddresses[0]?.emailAddress ?? "",
    },
    update: {
      imageUrl: user.imageUrl,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    create: {
      id: userId,
      emailAddress: user.emailAddresses[0]?.emailAddress ?? "",
      imageUrl: user.imageUrl,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });

  return redirect("/dashboard");
};

export default SyncUser;

/*

  - Clerk handles its own user storage, but our app also needs a copy of the user in our Postgres (Neon) database.

    - After a user signs in with Clerk, they only exist inside Clerk's system.
    
    - To keep our local database in sync, we redirect them to /sync-user immediately after authentication.

    - The /sync-user route creates (or updates) the user's record in Postgres, ensuring Clerk and our internal database stay aligned.

*/
