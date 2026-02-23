"use client";

import { FEATURES } from "@/lib/data/data";
import { BarChart3, Layout, Settings } from "lucide-react";
import React from "react";

const Features = () => {
  return (
    <section className="py-10 sm:py-14">
      <div className="app-container mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left Section */}
        <div className="border-border bg-card flex min-h-80 flex-col justify-between rounded-lg border p-6 md:min-h-96 md:p-10">
          <div>
            <h2 className="mb-4 text-2xl md:mb-6 md:text-3xl">
              CodeSense AI for Developers
            </h2>

            <p className="text-muted-foreground text-sm font-medium md:text-base">
              <span className="text-foreground">CodeSense AI</span> helps you
              understand your codebase instantly with automatic documentation,
              intelligent search, commit summaries, and contextual insights –
              all in one place.
            </p>
          </div>

          <div className="border-border bg-muted rounded-md border p-4 font-mono text-sm md:p-6">
            <span className="text-foreground">autoDocs()</span>
            <span className="text-muted-foreground ml-2">search()</span>
            <span className="text-foreground ml-2">summaries()</span>
          </div>
        </div>

        {/* Right Section */}
        <div className="border-border bg-card flex min-h-80 flex-col justify-between rounded-lg border p-6 md:min-h-96 md:p-10">
          <div>
            <div className="mb-6 flex items-center gap-3 md:mb-8">
              <Settings className="text-muted-foreground h-5 w-5 md:h-6 md:w-6" />
              <span className="text-muted-foreground font-medium">
                Productive
              </span>
            </div>

            <h2 className="mb-4 text-2xl md:mb-6 md:text-3xl">
              Smarter Workflow for Modern Teams
            </h2>

            <p className="text-muted-foreground mb-6 text-sm md:mb-10 md:text-base">
              CodeSense AI keeps your team aligned with clean documentation,
              summarized commits, meeting transcripts, and searchable context
              directly from your codebase.
            </p>
          </div>

          {/* Two Cards */}
          <div className="space-y-4">
            <div className="border-border bg-muted hover:bg-accent rounded-md border p-4 transition md:p-6">
              <div className="flex items-start gap-4">
                <div className="border-border bg-card rounded-md border p-2">
                  <Layout className="text-muted-foreground h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold md:mb-2">
                    Understand Your Code Faster
                  </h3>
                  <p className="text-muted-foreground text-xs md:text-sm">
                    Auto-generated documentation and smart summaries help you
                    read and navigate code effortlessly.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-border bg-muted hover:bg-accent rounded-md border p-4 transition md:p-6">
              <div className="flex items-start gap-4">
                <div className="border-border bg-card rounded-md border p-2">
                  <BarChart3 className="text-muted-foreground h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold md:mb-2">
                    Insights That Save Time
                  </h3>
                  <p className="text-muted-foreground text-xs md:text-sm">
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
      <div className="app-container mb-4">
        <div className="border-border bg-muted flex items-center justify-center rounded-lg border p-4 md:p-6">
          <h1 className="text-xl md:text-2xl">Features</h1>
        </div>
      </div>

      {/* Features Grid */}
      <div className="app-container border-border grid grid-cols-1 border border-t-0 sm:grid-cols-2 md:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <div
            key={i}
            className="border-border bg-card hover:bg-muted p-4 transition sm:border-r md:p-6"
          >
            <div className="mb-2 flex items-center gap-3 md:mb-4">
              <feature.icon
                className={`h-5 w-5 md:h-6 md:w-6 ${feature.color}`}
              />

              <span className="text-sm font-semibold md:text-base">
                {feature.title}
              </span>
            </div>

            <p className="text-muted-foreground text-xs md:text-sm">
              {feature.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Features;
