"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import useRefetch from "@/hooks/use-refetch";
import { api } from "@/trpc/react";
import type { FormInput } from "@/types/types";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const CreateProjectModal = ({ isOpen, onClose }: Props) => {
  // Here we react-hook-form for managing forms in our app : because of Performant, flexible and extensible forms with easy-to-use validation.

  const { register, handleSubmit, reset } = useForm<FormInput>();

  // this gives mutation function to call my backend function

  const createProject = api.project.createProject.useMutation();

  const refetch = useRefetch();

  const onSubmit = (data: FormInput) => {
    // console.log(JSON.stringfy(data,null,2));

    // this data refers to input we get from our form : we get here type safed object with all the input , we pass this data to backend and create the project

    createProject.mutate(
      {
        githubUrl: data.repoUrl,
        name: data.projectName,
        githubToken: data.githubToken,
      },
      {
        onSuccess: () => {
          toast.success("Project created successfully");
          refetch();
          reset();
          onClose(); // close modal
        },
        onError: (err) => {
          toast.error(err.message || "Failed to create project");
        },
      },
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Project"
      description="Link your GitHub repository and let CodeSense AI analyze your code."
      showFooter={false} // form handles submit
    >
      <div>
        <div className="w-full space-y-6 text-center md:text-left">
          <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
            <Input
              {...register("projectName", { required: true })}
              placeholder="Project Name"
            />

            <Input
              {...register("repoUrl", { required: true })}
              placeholder="GitHub Repository URL"
              type="url"
            />

            <Input
              {...register("githubToken")}
              placeholder="GitHub Token (optional)"
            />

            <Button
              type="submit"
              disabled={createProject.isPending}
              className="w-full"
            >
              {createProject.isPending ? "Creating..." : "Create Project"}
            </Button>
          </form>
        </div>
      </div>
    </Modal>
  );
};

// now we are going to create trpc route handler to create the project

// Github token is used to help to authenticate user on the behalf of them , in case they are trying to look for private repository access

// then by check credits function is going into the repository , it's going to look at all the files that we have in our codebase and return the count of how many files are there in total

// for ex: 150 files - this is going to cost 149 credits to display the message here - but for now we are creating a row of new project within database , we actual care about credits later at end of project
