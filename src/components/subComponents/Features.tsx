"use client";

import {
  BarChart3,
  FileText,
  Layout,
  Mic,
  Search,
  Settings,
  Users,
  Zap,
  History,
} from "lucide-react";
import React from "react";
import { type ElementType } from "react";

export interface FeatureItem {
  icon: ElementType;
  title: string;
  text: string;
  color: string;
}

export const FEATURES: FeatureItem[] = [
  {
    icon: FileText,
    title: "Automatic Code Documentation",
    text: "Dionysus generates detailed documentation across your entire codebase, making it easier to understand structure and intent.",
    color: "text-red-600",
  },
  {
    icon: Search,
    title: "Codebase Search",
    text: "Quickly locate any function, file, or component with fast, context-aware search built for developers.",
    color: "text-blue-600",
  },
  {
    icon: Zap,
    title: "Commit Message Summaries",
    text: "AI-powered summaries keep you updated on the latest changes without digging through raw commit logs.",
    color: "text-yellow-600",
  },
  {
    icon: Mic,
    title: "Meeting Transcription",
    text: "Dionysus converts your meetings into accurate transcripts with key topics and clear summaries.",
    color: "text-green-600",
  },
  {
    icon: History,
    title: "Real-Time Meeting Search",
    text: "Instant contextual search across all past meetings so you can find answers without rewatching long recordings.",
    color: "text-purple-600",
  },
  {
    icon: Users,
    title: "Collaborative Platform",
    text: "Teams can collaborate, explore documentation, review summaries, and interact with the entire knowledge layer together.",
    color: "text-cyan-600",
  },
];

const Features = () => {
  return (
    <div className="min-h-screen bg-white p-4 text-black md:p-8">
      <div className="mx-auto mb-12 grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left Section */}
        <div className="flex min-h-100 flex-col justify-between rounded-xl border border-gray-300 bg-white p-6 md:min-h-150 md:p-12">
          <div>
            <h2 className="mb-4 text-2xl leading-tight md:mb-6 md:text-4xl">
              CodeSense AI for Developers
            </h2>

            <p className="text-base leading-tight font-medium text-gray-600 md:text-sm">
              <span className="font-semibold text-black">CodeSense AI</span>{" "}
              helps you understand your codebase instantly with automatic
              documentation, intelligent search, commit summaries, and
              contextual insights – all in one place.
            </p>
          </div>

          <div className="rounded-lg border border-gray-300 bg-gray-100 p-4 font-mono text-sm md:p-6">
            <span className="text-blue-600">autoDocs()</span>
            <span className="ml-2 text-cyan-600">search()</span>
            <span className="ml-2 text-black">summaries()</span>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex min-h-100 flex-col justify-between rounded-xl border border-gray-300 bg-white p-6 md:min-h-150 md:p-12">
          <div>
            <div className="mb-6 flex items-center gap-3 md:mb-8">
              <Settings className="h-5 w-5 text-gray-500 md:h-6 md:w-6" />
              <span className="font-medium text-gray-600">Productive</span>
            </div>

            <h2 className="mb-4 text-2xl leading-tight md:mb-6 md:text-4xl">
              Smarter Workflow for Modern Teams
            </h2>

            <p className="mb-6 text-sm leading-relaxed text-gray-600 md:mb-12 md:text-lg">
              CodeSense AI keeps your team aligned with clean documentation,
              summarized commits, meeting transcripts, and searchable context
              directly from your codebase.
            </p>
          </div>

          {/* Two Cards */}
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-300 bg-gray-100 p-4 transition hover:bg-gray-200 md:p-6">
              <div className="flex items-start gap-4">
                <div className="rounded bg-gray-200 p-2">
                  <Layout className="h-4 w-4 text-gray-700 md:h-5 md:w-5" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-black md:mb-2">
                    Understand Your Code Faster
                  </h3>
                  <p className="text-xs leading-relaxed text-gray-600 md:text-sm">
                    Auto-generated documentation and smart summaries help you
                    read and navigate code effortlessly.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-300 bg-gray-100 p-4 transition hover:bg-gray-200 md:p-6">
              <div className="flex items-start gap-4">
                <div className="rounded bg-gray-200 p-2">
                  <BarChart3 className="h-4 w-4 text-gray-700 md:h-5 md:w-5" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-black md:mb-2">
                    Insights That Save Time
                  </h3>
                  <p className="text-xs leading-relaxed text-gray-600 md:text-sm">
                    AI-powered search, commit summaries, and transcripts keep
                    your entire project context one click away.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Header */}
      <div className="mx-auto mb-4 max-w-7xl">
        <div className="flex items-center justify-center rounded-xl border border-gray-300 bg-gray-100 p-4 md:p-8">
          <h1 className="text-xl text-black md:text-2xl">Features</h1>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 border border-t-0 border-gray-300 sm:grid-cols-2 md:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <div
            key={i}
            className="border-b border-gray-300 bg-gray-50 p-4 transition hover:bg-gray-100 sm:border-r md:p-8"
          >
            <div className="mb-2 flex items-center gap-3 md:mb-4">
              <feature.icon
                className={`h-5 w-5 md:h-6 md:w-6 ${feature.color}`}
              />

              <span className="text-sm font-semibold text-black md:text-base">
                {feature.title}
              </span>
            </div>

            <p className="text-xs leading-relaxed text-gray-600 md:text-sm">
              {feature.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Features;
