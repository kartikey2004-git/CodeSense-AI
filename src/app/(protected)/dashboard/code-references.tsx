"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import React, { useState } from "react";


export type SourceCode = {
  language: string;
  content: string;
};

export type FileReference = {
  fileName: string;
  sourceCode: SourceCode;
  summary: string;
};

type Props = {
  filesReferences: FileReference[];
};

const CodeReferences = ({ filesReferences }: Props) => {
  const [tab, setTab] = useState<string | undefined>(
    filesReferences?.[0]?.fileName,
  );

  if (!filesReferences || filesReferences.length === 0) return null;

  return (
    <div className="w-full overflow-hidden">
      <div className="max-w-full">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="bg-muted scrollbar-thin flex gap-2 overflow-x-auto overflow-y-hidden rounded-md p-1">
            {filesReferences.map((file) => (
              <Button
                key={file.fileName}
                variant="ghost"
                onClick={() => setTab(file.fileName)}
                className={cn(
                  "text-md rounded-md px-3 py-1.5 font-normal whitespace-nowrap transition-colors",
                  tab === file.fileName
                    ? "bg-black text-white hover:bg-black hover:text-white"
                    : "bg-white text-black",
                )}
              >
                {file.fileName}
              </Button>
            ))}
          </div>

          {filesReferences.map((file) => {

            return (
              <TabsContent
                key={file.fileName}
                value={file.fileName}
                className="mt-3 max-h-[70vh] min-w-[83vw] overflow-auto border"
              >
                <SyntaxHighlighter
                  language={file.sourceCode.language}
                  style={vscDarkPlus}
                  customStyle={{
                    background: "#0d1117",
                    margin: 0,
                    padding: "1rem",
                    borderRadius: "0.75rem",
                    fontSize: "16px",
                    lineHeight: "1.6",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    },
                  }}
                >
                  {file.sourceCode.content}
                </SyntaxHighlighter>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
};

export default CodeReferences;
