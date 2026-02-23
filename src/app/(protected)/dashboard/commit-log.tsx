"use client";

import useProject from "@/hooks/use-project";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const CommitLog = () => {
  // Get projectId and project details using custom hook

  const { projectId, project } = useProject();

  // Fetch commits for the specific project using tRPC query

  const { data: commits } = api.project.getCommits.useQuery({ projectId });

  return (
    <>
      <ul className="space-y-6">
        {commits?.map((commit, commitIdx) => {
          return (
            <li key={commit.id} className="relative flex gap-x-4">
              <div
                className={cn(
                  commitIdx === commits.length - 1 ? "h-6" : "-bottom-6",
                  "absolute top-0 left-0 flex w-6 justify-center",
                )}
              >
                <div className="bg-border w-px translate-x-1"></div>
              </div>

              <>
                <Image
                  src={commit.commitAuthorAvatar}
                  alt="commit avatar"
                  className="bg-muted relative mt-4 size-8 flex-none rounded-full"
                  width={40}
                  height={40}
                />

                <div className="ring-border bg-card flex-auto rounded-md p-3 ring-1 ring-inset">
                  <div className="flex justify-between gap-x-4">
                    <Link
                      target="_blank"
                      href={`${project?.githubUrl}/commits/${commit.commitHash}`}
                      className="text-muted-foreground py-0.5 text-xs leading-5"
                    >
                      <span className="text-foreground font-medium">
                        {commit.commitAuthorName}
                      </span>{" "}
                      <span className="inline-flex items-center">
                        commited
                        <ExternalLink className="ml-1 size-4" />
                      </span>
                    </Link>
                  </div>
                  <span className="font-semibold">{commit.commitMessage}</span>
                  <pre className="text-muted-foreground mt-2 text-sm leading-6 whitespace-pre-wrap">
                    {commit.summary}
                  </pre>
                </div>
              </>
            </li>
          );
        })}
      </ul>
    </>
  );
};

export default CommitLog;
