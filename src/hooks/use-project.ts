import { api } from "@/trpc/react";
import React, { useState } from "react";
import { useLocalStorage } from "usehooks-ts";

const useProject = () => {
  const { data: projects } = api.project.getProjects.useQuery();

  const [projectId, setProjectId] = useLocalStorage("codesense-projectId", "");

  const project = projects?.find((project) => project.id === projectId);

  return {
    projects,
    project,
    projectId,
    setProjectId
  };
};

export default useProject;

// we also want to keep the track of which current project I'm looking right now

// so in our app , we can see that , if we click any of these project , I'm selecting it , so we need to keep a local storage state key to make sure that when we refresh the page we can see that my selected project id is always intact
