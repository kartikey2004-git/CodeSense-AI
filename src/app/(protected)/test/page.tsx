"use client";

import useProject from "@/hooks/use-project";
import { api } from "@/trpc/react";
import React from "react";

const Page = () => {
  const { projectId } = useProject();
  const { data: questions } = api.project.getQuestions.useQuery({ projectId });

  return (
    <div>
      <pre>{JSON.stringify(questions, null, 2)}</pre>
    </div>
  );
};

export default Page;
