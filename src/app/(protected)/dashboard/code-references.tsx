"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import React, { useState } from "react";
import type { FileReference } from "@/types/types";
import dynamic from "next/dynamic";
import { detectLanguageFromFileName } from "@/lib/code-language-detector";
import { useTheme } from "next-themes";

const SyntaxHighlighter = dynamic(
  () => import("react-syntax-highlighter").then((mod) => mod.Prism),
  { ssr: false },
);

type Props = {
  filesReferences: FileReference[];
};

const CodeReferences = ({ filesReferences }: Props) => {
  const { resolvedTheme } = useTheme();
  const [tab, setTab] = useState<string | undefined>(
    filesReferences?.[0]?.fileName,
  );

  if (!filesReferences || filesReferences.length === 0) return null;

  return (
    <div className="w-full overflow-hidden">
      <div className="border-border bg-card max-w-full rounded-xl border p-2">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="bg-muted scrollbar-thin flex gap-2 overflow-x-auto overflow-y-hidden rounded-lg p-1.5">
            {filesReferences.map((file) => (
              <Button
                key={file.fileName}
                variant="ghost"
                onClick={() => setTab(file.fileName)}
                className={cn(
                  "text-md border-border rounded-md border px-3 py-1.5 font-normal whitespace-nowrap transition-colors",
                  tab === file.fileName
                    ? "bg-primary text-primary-foreground hover:bg-primary"
                    : "bg-background text-foreground hover:bg-accent",
                )}
              >
                {file.fileName}
              </Button>
            ))}
          </div>

          {/* CODE VIEW */}
          {filesReferences.map((file) => {
            const code =
              typeof file.sourceCode?.content === "string"
                ? file.sourceCode.content
                : JSON.stringify(file.sourceCode?.content, null, 2);

            const language = detectLanguageFromFileName(
              file.fileName || "text",
            );

            return (
              <TabsContent
                key={file.fileName}
                value={file.fileName}
                className="border-border bg-muted/35 mt-3 max-h-[70vh] min-w-[83vw] overflow-auto rounded-lg border"
              >
                <SyntaxHighlighter
                  language={language}
                  style={resolvedTheme === "dark" ? oneDark : oneLight}
                  customStyle={{
                    background: "transparent",
                    margin: 0,
                    padding: "1rem",
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
                  {code}
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
