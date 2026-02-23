"use client";

import { Button } from "@/components/ui/button";
import MDEditor from "@uiw/react-md-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import useProject from "@/hooks/use-project";
import Image from "next/image";
import React, { useState } from "react";
import { askQuestion } from "./action";
import { readStreamableValue } from "@ai-sdk/rsc";
import CodeReferences from "./code-references";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import type { FileReference, SearchResult } from "@/types/types";
import { detectLanguageFromFileName } from "@/lib/code-language-detector";
import useRefetch from "@/hooks/use-refetch";
import { useTheme } from "next-themes";

const mapSearchResultsToFileReferences = (
  results: SearchResult[],
): FileReference[] => {
  return results.map((file) => ({
    fileName: file.fileName,
    summary: file.summary,
    sourceCode: {
      content: file.sourceCode,
      language: detectLanguageFromFileName(file.fileName),
    },
  }));
};

const AskQuestionCard = () => {
  const { project } = useProject();
  const { resolvedTheme } = useTheme();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const [filesReferences, setFilesReferences] = useState<FileReference[]>([]);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const saveAnswer = api.project.saveAnswer.useMutation();

  const refetch = useRefetch();

  const onSaveAnswer = () => {
    if (!answer.trim()) {
      toast.error("Nothing to save");
      return;
    }

    saveAnswer.mutate(
      {
        projectId: project!.id,
        answer,
        question,
        filesReferences,
      },
      {
        onSuccess: () => {
          toast.success("Answer Saved successfully");
          refetch();
        },
        onError: () => {
          toast.error("Failed to save answer");
        },
      },
    );
    setOpen(false);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!question.trim()) return;
    if (!project?.id) return;

    try {
      setLoading(true);
      setAnswer("");
      setFilesReferences([]);

      const result = await askQuestion(question, project.id);

      // Open dialog AFTER request is successful
      setOpen(true);

      // Stream markdown answer
      for await (const chunk of readStreamableValue(result.output)) {
        if (chunk) {
          setAnswer((prev) => prev + chunk);
        }
      }

      const mappedFiles = mapSearchResultsToFileReferences(
        result.filesReferences || [],
      );

      setFilesReferences(mappedFiles);
      toast.success("Answer generated");
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(state) => !saveAnswer.isPending && setOpen(state)}
      >
        <DialogContent className="max-h-[81vh] max-w-none min-w-[85vw] overflow-y-auto p-6 sm:p-8">
          <DialogHeader>
            <div className="border-border flex items-center justify-between border-b px-6 py-4">
              {/* Left: Title / Branding */}
              <DialogTitle className="flex items-center gap-3">
                <Image
                  src="/bg.svg"
                  alt="CodeSense AI"
                  width={36}
                  height={36}
                />
                <span className="text-lg font-semibold">CodeSense AI</span>
              </DialogTitle>

              {/* Right: Action */}
              <Button
                variant="outline"
                onClick={() => onSaveAnswer()}
                disabled={saveAnswer.isPending || loading || !answer}
              >
                {saveAnswer.isPending ? "Saving..." : "Save Answer"}

                <Download className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div
            data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
            className="px-6 py-4"
          >
            <MDEditor.Markdown source={answer} className="markdown-pro" />
          </div>

          <div className="h-4"></div>

          <div className="w-full overflow-hidden">
            {filesReferences.length > 0 && (
              <div className="px-6 pb-4">
                <CodeReferences filesReferences={filesReferences} />
              </div>
            )}
          </div>

          <div className="border-border flex justify-end border-t px-6 py-4">
            <Button
              onClick={() => setOpen(false)}
              disabled={saveAnswer.isPending}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="relative col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Ask a question
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <Textarea
                placeholder="Which file should I edit to change the home page?"
                className="min-h-25 resize-none"
                onChange={(e) => setQuestion(e.target.value)}
              />

              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? "Thinking..." : "Ask CodeSense AI"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AskQuestionCard;
