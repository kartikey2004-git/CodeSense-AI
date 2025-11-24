import { SidebarProvider } from "@/components/ui/sidebar";
import { UserButton } from "@clerk/nextjs";
import React from "react";
import { AppSideBar } from "./app-sidebar";

type Props = {
  children: React.ReactNode;
};

const SidebarLayout = ({ children }: Props) => {
  return (
    <SidebarProvider>
      <AppSideBar />
      <main className="mr-2 w-full">
        <div className="border-sidebar-border bg-sidebae flex items-center gap-2 rounded-sm border p-2 px-4 mt-2 shadow">
          {/* <SearchBar /> */}
          <div className="ml-auto"></div>
          <UserButton />
        </div>

        <div className="h-4">
          {/* main content */}
          <div className="border-sidebar-border bg-sidebar h-[calc(100vh-4.5rem)] overflow-y-scroll rounded-sm border p-4 mt-2 shadow">
            {children}
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
};

export default SidebarLayout;
