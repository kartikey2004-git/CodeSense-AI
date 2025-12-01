import { SidebarProvider } from "@/components/ui/sidebar";
import { UserButton } from "@clerk/nextjs";
import React from "react";
import { AppSideBar } from "./app-sidebar";
import { StickyBanner } from "@/components/ui/sticky-banner";

type Props = {
  children: React.ReactNode;
};

const SidebarLayout = ({ children }: Props) => {
  return (
    <SidebarProvider>
      <AppSideBar />
      <main className="mr-2 w-full">
        <div className="border-sidebar-border bg-sidebae mt-2 flex items-center gap-2 rounded-sm border p-2 px-4 shadow">
          <StickyBanner className="bg-black rounded-md">
            <p className="mx-0 max-w-[90%] text-white drop-shadow-md text-sm">
              Currently on CodeSense AI v1.0.—{" "}
              <span className="cursor-pointer transition duration-200 hover:underline">
                New tools dropping soon
              </span>
            </p>
          </StickyBanner>
          {/* <SearchBar /> */}
          <div className="ml-auto"></div>
          <UserButton />
        </div>

        <div className="h-4">
          {/* main content */}
          <div className="border-sidebar-border bg-sidebar mt-2 h-[calc(100vh-4.5rem)] overflow-y-scroll rounded-sm border p-4 shadow">
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
