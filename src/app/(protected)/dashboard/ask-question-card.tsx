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

const AskQuestionCard = () => {
  const { project } = useProject();
  const [question, setQuestion] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [filesReferences, setFilesReferences] = useState<
    { fileName: string; sourceCode: string; summary: string }[]
  >([]);

  const [answer, setAnswer] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setAnswer("");
    setFilesReferences([]);
    e.preventDefault();

    if (!project?.id) return;
    setLoading(true);

    const { filesReferences, output } = await askQuestion(question, project.id);

    setOpen(true);
    setFilesReferences(filesReferences);

    for await (const delta of readStreamableValue(output)) {
      if (delta) {
        setAnswer((ans) => ans + delta);
      }
    }
    setLoading(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[81vh] max-w-none min-w-[85vw] overflow-y-auto p-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <Image src="/bg.svg" alt="CodeSense AI" width={36} height={36} />
              <h2 className="text-lg font-semibold">CodeSense AI</h2>
            </div>
          </div>

          {/* Content */}
          <MDEditor.Markdown
            source={answer}
            className="prose min-h-[60vh] max-w-none px-6 py-4"
          />

          {/* Footer */}
          <div className="flex justify-end border-t px-6 py-4">
            <Button onClick={() => setOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="relative col-span-1 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Ask a question</CardTitle>
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
    </>
  );
};

export default AskQuestionCard;
