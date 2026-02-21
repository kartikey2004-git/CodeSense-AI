"use client";

import useProject from "@/hooks/use-project";
import { api } from "@/trpc/react";
import React from "react";
import Uploader from "../dashboard/uploader";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useRefetch from "@/hooks/use-refetch";
import { Loader2, Trash2 } from "lucide-react";

const MeetingsPage = () => {
  const { projectId } = useProject();
  const refetch = useRefetch();

  if (!projectId) return null;

  const { data: meetings, isLoading } = api.project.getMeetings.useQuery(
    {
      projectId: projectId,
    },
    { refetchInterval: 4000 },
  );

  const deleteMeeting = api.project.deleteMeeting.useMutation();

  return (
    <>
      <Uploader />
      <div className="h-6"></div>
      <h1 className="text-xl font-semibold">Meetings</h1>
      {meetings && meetings.length === 0 && <div>No meetings found</div>}
      {isLoading && <div>Loading...</div>}
      <ul className="divide-y divide-gray-200">
        {meetings?.map((meeting) => {
          return (
            <li
              key={meeting.id}
              className="flex items-center justify-between gap-x-6 py-5"
            >
              <div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/meetings/${meeting.id}`}
                      className="text-sm font-semibold"
                    >
                      {meeting.name}
                    </Link>

                    {meeting.status === "PROCESSING" && (
                      <Badge className="bg-yellow-500">Processing...</Badge>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-x-2 text-xs text-gray-500">
                  <p className="whitespace-nowrap">
                    {meeting.createdAt.toLocaleDateString()}
                  </p>
                  <p className="truncate">{meeting.issues.length} issues</p>
                </div>
              </div>

              <div className="flex flex-none items-center gap-x-4">
                <Link href={`/meetings/${meeting.id}`}>
                  <Button variant={"outline"} size="sm">
                    View Meeting
                  </Button>
                </Link>
                <Button
                  disabled={deleteMeeting.isPending}
                  size="sm"
                  onClick={() => {
                    deleteMeeting.mutate(
                      { meetingId: meeting.id },
                      {
                        onSuccess: () => {
                          toast.success("Meeting deleted successfully");
                          refetch();
                        },
                      },
                    );
                  }}
                  variant={"destructive"}
                >
                  {deleteMeeting.isPending ? (
                    <div className="flex items-center space-x-1">
                      Deleting... <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <>
                      Delete <Trash2 className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
};

export default MeetingsPage;
