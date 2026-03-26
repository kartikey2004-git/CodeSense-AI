"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import useRefetch from "@/hooks/use-refetch";
import { api } from "@/trpc/react";
import type { FormInput } from "@/types/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

// Zod schema for form validation
const formSchema = z.object({
  projectName: z
    .string()
    .min(1, "Project name is required")
    .max(50, "Project name must be less than 50 characters")
    .regex(
      /^[a-zA-Z0-9\s-_]+$/,
      "Project name can only contain letters, numbers, spaces, hyphens, and underscores",
    ),
  repoUrl: z
    .string()
    .min(1, "Repository URL is required")
    .url("Please enter a valid URL")
    .regex(
      /^https?:\/\/(www\.)?github\.com\/.+\/.*$/,
      "Please enter a valid GitHub repository URL",
    ),
  githubToken: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const CreateProjectModal = ({ isOpen, onClose }: Props) => {
  // Using react-hook-form with Zod validation for type-safe form handling
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: "",
      repoUrl: "",
      githubToken: "",
    },
  });

  const createProject = api.project.createProject.useMutation();
  const refetch = useRefetch();

  const onSubmit = async (data: FormData) => {
    try {
      await createProject.mutateAsync({
        githubUrl: data.repoUrl,
        name: data.projectName,
        githubToken: data.githubToken || undefined,
      });

      toast.success("Project created successfully");
      refetch();
      reset();
      onClose();
    } catch (error) {
      // Error is already handled by the mutation's onError callback
      console.error("Failed to create project:", error);
    }
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
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="w-full space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Input
                {...register("projectName")}
                placeholder="Project Name"
                aria-invalid={errors.projectName ? "true" : "false"}
                aria-describedby={
                  errors.projectName ? "projectName-error" : undefined
                }
              />
              {errors.projectName && (
                <p
                  id="projectName-error"
                  className="text-destructive text-sm"
                  role="alert"
                >
                  {errors.projectName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Input
                {...register("repoUrl")}
                placeholder="GitHub Repository URL"
                type="url"
                aria-invalid={errors.repoUrl ? "true" : "false"}
                aria-describedby={errors.repoUrl ? "repoUrl-error" : undefined}
              />
              {errors.repoUrl && (
                <p
                  id="repoUrl-error"
                  className="text-destructive text-sm"
                  role="alert"
                >
                  {errors.repoUrl.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Input
                {...register("githubToken")}
                placeholder="GitHub Token (optional for private repos)"
                type="password"
                aria-describedby="githubToken-help"
              />
              <p
                id="githubToken-help"
                className="text-muted-foreground text-xs"
              >
                Optional: Only required for private repositories
              </p>
            </div>

            <Button
              type="submit"
              disabled={createProject.isPending || isSubmitting}
              className="w-full"
              aria-describedby={
                createProject.error ? "submit-error" : undefined
              }
            >
              {createProject.isPending || isSubmitting
                ? "Creating..."
                : "Create Project"}
            </Button>

            {createProject.error && (
              <p
                id="submit-error"
                className="text-destructive text-center text-sm"
                role="alert"
              >
                {createProject.error.message}
              </p>
            )}
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
