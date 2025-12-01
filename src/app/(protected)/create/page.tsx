"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useRefetch from "@/hooks/use-refetch";
import { api } from "@/trpc/react";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type FormInput = {
  repoUrl: string;
  projectName: string;
  githubToken?: string;
};

const CreateProject = () => {
  // The useUser() hook provides access to the current user's User object, which contains all the data for a single user in your application

  const { user } = useUser();

  // Here we react-hook-form for managing forms in our app : because of Performant, flexible and extensible forms with easy-to-use validation.

  const { register, handleSubmit, reset } = useForm<FormInput>();

  // this gives mutation function to call my backend function

  const createproject = api.project.createProject.useMutation();

  const refetch = useRefetch();

  function onSubmit(data: FormInput) {
    // console.log(JSON.stringfy(data,null,2));

    // this data refers to input we get from our form : we get here type safed object with all the input , we pass this data to backend and create the project

    createproject.mutate(
      {
        githubUrl: data.repoUrl,
        name: data.projectName,
        githubToken: data.githubToken,
      },
      {
        onSuccess: () => {
          toast.success("Project Created Successfully");
          refetch();
          reset();
        },
        onError: () => {
          toast.success("Failed to create project");
        },
      },
    );
    return true;
  }

  return (
    <div className="relative flex flex-col px-6 py-6">
      <div className="mb-8 ml-16 flex w-fit items-center gap-3 rounded-full px-5 py-2">
        <Image
          src="/kitty2.jpg"
          alt="cat"
          width={50}
          height={50}
          className="rounded-full"
        />
        <h2 className="text-2xl font-semibold">Hello {user?.firstName}!</h2>
      </div>

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 md:grid-cols-2">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-semibold">Link your repository</h1>
            <p className="text-muted-foreground text-sm">
              Enter your repository details and let CodeSense AI work its magic.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
            <Input
              {...register("projectName", {
                required: true,
              })}
              placeholder="Project Name"
              required
            />

            <Input
              {...register("repoUrl", {
                required: true,
              })}
              placeholder="Github Repository URL"
              type="url"
              required
            />

            <Input
              {...register("githubToken")}
              placeholder="Github Token (optional)"
            />

            <Button type="submit" disabled={createproject.isPending}>
              {createproject.isPending ? "Creating..." : "Create"}
            </Button>
          </form>
        </div>

        <div className="-mt-10 flex items-start justify-center">
          <div className="rounded-xl p-5">
            <Image
              src="/bg.svg"
              alt="banner"
              width={280}
              height={280}
              className="rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProject;

// now we are going to create trpc route handler to create the project

// Github token is used to help to authenticate user on the behalf of them , in case they are trying to look for private repository access

// then by check credits function is going into the repository , it's going to look at all the files that we have in our codebase and return the count of how many files are there in total

// for ex: 150 files - this is going to cost 149 credits to display the message here - but for now we are creating a row of new project within database , we actual care about credits later at end of project
