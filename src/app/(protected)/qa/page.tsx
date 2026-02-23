"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import useProject from "@/hooks/use-project";
import { api } from "@/trpc/react";
import React, { Fragment, useState } from "react";
import AskQuestionCard from "../dashboard/ask-question-card";
import Image from "next/image";
import MDEditor from "@uiw/react-md-editor";
import CodeReferences from "../dashboard/code-references";
import type { FileReference } from "@/types/types";
import { useTheme } from "next-themes";

const QA = () => {
  const { projectId } = useProject();
  const { resolvedTheme } = useTheme();
  const { data: questions } = api.project.getQuestions.useQuery({ projectId });

  // console.log(questions)

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const activeQuestion = activeIndex !== null ? questions?.[activeIndex] : null;

  const filesReferences =
    (activeQuestion?.filesReferences as FileReference[]) ?? [];

  /**
   * IMPORTANT:
   * Prisma returns JSON as unknown (JsonValue)
   * We normalize it ONCE here before sending to UI
   */

  return (
    <Sheet>
      <AskQuestionCard />
      <div className="h-4"></div>
      <h1 className="text-xl font-semibold">Saved Questions</h1>
      <div className="h-2"></div>

      {/* Questions List */}
      <div className="flex flex-col gap-2">
        {questions?.map((question, index) => {
          return (
            <Fragment key={question.id}>
              <SheetTrigger onClick={() => setActiveIndex(index)}>
                <div className="hover:bg-muted border-border bg-card flex items-center gap-4 rounded-lg border p-4 shadow-sm transition">
                  <Image
                    className="rounded-full"
                    height={30}
                    width={30}
                    alt="user-image"
                    src={question.user.imageUrl ?? ""}
                  />

                  <div className="flex w-full flex-col text-left">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-foreground line-clamp-1 text-lg font-medium">
                        {question.question}
                      </p>

                      <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(question.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {question.answer}
                    </p>
                  </div>
                </div>
              </SheetTrigger>
            </Fragment>
          );
        })}
      </div>

      {/* Right Sheet Panel */}
      {activeQuestion && (
        <SheetContent className="overflow-y-auto sm:max-w-[80vw]">
          <SheetHeader className="space-y-4">
            <SheetTitle className="text-foreground line-clamp-1 text-lg font-medium">
              Q. {activeQuestion.question}
            </SheetTitle>
            <div data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}>
              <MDEditor.Markdown
                source={activeQuestion.answer}
                className="markdown-pro"
              />
            </div>

            {/* Code References */}
            {filesReferences.length > 0 && (
              <CodeReferences filesReferences={filesReferences} />
            )}
          </SheetHeader>
        </SheetContent>
      )}
    </Sheet>
  );
};

export default QA;
