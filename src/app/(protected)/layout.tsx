import { SidebarProvider } from "@/components/ui/sidebar";
import { UserButton } from "@clerk/nextjs";
import React from "react";
import { AppSideBar } from "./app-sidebar";
// import { StickyBanner } from "@/components/ui/sticky-banner";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

type Props = {
  children: React.ReactNode;
};

const SidebarLayout = async ({ children }: Props) => {
  const { sessionId } = await auth();
  if (!sessionId) redirect("/sign-in");

  return (
    <SidebarProvider>
      <AppSideBar />
      <main className="mr-2 flex min-h-[calc(100dvh-1rem)] w-full flex-col">
        <div className="border-sidebar-border bg-sidebar mt-2 flex items-center gap-2 rounded-md border px-4 py-2 shadow-sm">
          {/* <StickyBanner className="rounded-md bg-black">
            <p className="mx-0 max-w-[90%] text-sm text-white drop-shadow-md">
              Currently on CodeSense AI v1.0.—{" "}
              <span className="cursor-pointer transition duration-200 hover:underline">
                New tools dropping soon
              </span>
            </p>
          </StickyBanner> */}

          {/* <SearchBar /> */}
          <div className="ml-auto"></div>
          <ThemeToggle />
          <UserButton />
        </div>

        <div className="mt-2 flex-1">
          {/* main content */}
          <div className="border-sidebar-border bg-sidebar h-full overflow-y-auto rounded-md border p-4 shadow-sm">
            {children}
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
};

export default SidebarLayout;

// route segment is purely a semantic way of seperating folders - we put our protected routes here

// so we need to be authenticated to access these protected routes - this power we got from layout files in nextjs app router
