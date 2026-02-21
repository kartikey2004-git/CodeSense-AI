"use client";

import { CreateProjectModal } from "@/components/subcomponents/CreateProjectModal";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import useProject from "@/hooks/use-project";
import { cn } from "@/lib/utils";
import {
  Bot,
  CreditCard,
  LayoutDashboard,
  Plus,
  Presentation,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Q&A",
    url: "/qa",
    icon: Bot,
  },
  {
    title: "Meetings",
    url: "/meetings",
    icon: Presentation,
  },
  {
    title: "Billing",
    url: "/billing",
    icon: CreditCard,
  },
];

export function AppSideBar() {
  const [isOpen, setIsOpen] = useState(false);

  // A Client Component hook that lets you read the current URL's pathname.

  const pathname = usePathname();

  // The useSidebar hook is used to control the sidebar

  const { open } = useSidebar();

  const { projects, projectId, setProjectId } = useProject();

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader>
        <div className="flex items-center">
          {open && (
            <h1 className="text-primary mt-2 text-xl font-semibold">
              CodeSense AI
            </h1>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      href={item.url}
                      className={cn({
                        "bg-primary! text-white!": pathname === item.url,
                      })}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Your projects</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {projects?.map((project, idx) => (
                <SidebarMenuItem key={idx} className="cursor-pointer">
                  <SidebarMenuButton asChild>
                    <div
                      onClick={() => {
                        setProjectId(project.id);
                      }}
                    >
                      <div
                        className={cn(
                          "text-primary flex size-6 items-center justify-center rounded-sm border bg-white p-2 text-sm",
                          {
                            "bg-primary text-white": project.id === projectId,
                          },
                        )}
                      >
                        {project.name[0]}
                      </div>
                      <span>{project.name}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <div className="h-2"></div>

              {open && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Button
                      className="flex items-center gap-2 border border-white/30 bg-white px-3 py-2 text-black shadow-md transition hover:bg-gray-100"
                      onClick={() => setIsOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create Project</span>
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <CreateProjectModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

// But when we creating a project it does not refetches the projects from database - issue
