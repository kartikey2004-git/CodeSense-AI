"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import useProject from "@/hooks/use-project";
import { api } from "@/trpc/react";
import React from "react";

const TeamMembers = () => {
  const { projectId } = useProject();

  const { data: members } = api.project.getTeamMembers.useQuery({ projectId });

  return (
    <div className="flex items-center gap-2">
      {members?.map((member) => (
        <div key={member.id}>
          <Avatar>
            <AvatarImage
              src={member.user.imageUrl!}
              alt={member.user.firstName!}
            />
            <AvatarFallback>
              {member.user.firstName?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
        </div>
      ))}
    </div>
  );
};

export default TeamMembers;
