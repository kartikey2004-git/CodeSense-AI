"use client";

import React, { useState } from "react";
import { ExternalLink, Github } from "lucide-react";
import Link from "next/link";
import CommitLog from "./commit-log";
import { Button } from "@/components/ui/button";
import AskQuestionCard from "./ask-question-card";
import Uploader from "./uploader";
import ArchiveButton from "./archive-button";
import InviteButton from "./invite-button";
import TeamMembers from "./team-members";
import useProject from "@/hooks/use-project";
import { CreateProjectModal } from "@/components/createProjectModal";

const Dashboard = () => {
  const { project } = useProject();

  const [isOpen, setIsOpen] = useState(false);

  if (!project) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <h2 className="text-foreground text-2xl font-semibold tracking-tight">
            No projects yet
          </h2>

          <p className="text-muted-foreground mx-auto max-w-sm text-sm">
            You haven’t created any projects yet. Start by creating your first
            project to unlock insights and analysis.
          </p>

          <Button
            className="bg-primary text-primary-foreground inline-flex items-center justify-center rounded-sm px-5 py-2.5 text-sm font-medium transition hover:opacity-90"
            onClick={() => setIsOpen(true)}
          >
            Create Project
          </Button>

          <CreateProjectModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-y-4">
        {/* Github Link */}
        <div className="bg-primary w-fit rounded-md px-4 py-3">
          <div className="flex items-center">
            <Github className="size-5 text-white" />
            <div className="ml-2">
              <p className="text-sm font-medium text-white">
                This project is linked to {""}
                <Link
                  href={project?.githubUrl ?? ""}
                  className="inline-flex items-center text-white/80 hover:underline"
                >
                  {project?.githubUrl}
                  <ExternalLink className="ml-1 size-4" />
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="h-4"></div>

        <div className="flex items-center gap-4">
          <TeamMembers />
          <InviteButton />
          <ArchiveButton />
        </div>
      </div>

      <div className="mt-4">
        <div className="grid grid-cols-2 gap-4">
          <AskQuestionCard />
          <Uploader />
        </div>
      </div>
      <div className="mt-8"></div>
      <CommitLog />
    </div>
  );
};

export default Dashboard;

// now we create relations within our database to link projects and questions with this user

// this allows us to actually to be more flexible with our relational data modelling
