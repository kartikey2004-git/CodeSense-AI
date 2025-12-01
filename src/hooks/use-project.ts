import { api } from "@/trpc/react";
import React from "react";
import { useLocalStorage } from "usehooks-ts";

const useProject = () => {
  // here we are fetching all the projects for the logged in user

  const { data: projects } = api.project.getProjects.useQuery();

  // we are using useLocalStorage hook to keep the projectId in local storage

  //  because I want to track which project I'm currently looking at and projectId should persist even after page refresh

  // usestate is not peristent and data store in memory will be lost after page refresh but local storage is persistent

  // Custom hook that uses the localStorage API to persist state across page reloads.

  const [projectId, setProjectId] = useLocalStorage("codesense-projectId", "");

  // finding the current project based on the projectId from local storage

  const project = projects?.find((project) => project.id === projectId);

  return {
    projects,
    project,
    projectId,
    setProjectId,
  };
};

export default useProject;

// this hook provides that we can access all projects for the logged in user and also manage the currently selected project using local storage

// this is cleaner architecture of dealing with state management between server and client side