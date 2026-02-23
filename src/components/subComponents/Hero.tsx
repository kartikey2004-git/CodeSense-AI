"use client";

import React from "react";
import WorldMap from "@/components/ui/world-map";
import Link from "next/link";

const Hero = () => {
  return (
    <section className="relative overflow-hidden pb-10">
      <div className="app-container relative z-10 flex flex-col items-center gap-10 pt-10 pb-12 md:flex-row md:gap-8 md:pt-16">
        <div className="w-full md:w-1/2">
          <h1 className="mb-6 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl md:text-5xl">
            <span>CodeSense AI</span>
            <br />
            <span className="text-muted-foreground">
              Power tool for Developers
            </span>
          </h1>

          <div className="relative mb-8">
            <p className="border-border bg-card/80 text-muted-foreground inline-block rounded-md border px-4 py-2 text-sm backdrop-blur-sm">
              Discover CodeSense AI
            </p>
          </div>

          <p className="text-muted-foreground mb-10 max-w-md text-sm sm:text-base">
            CodeSense AI is a powerful platform designed to simplify developer
            collaboration that simplifies the process, streamlines code
            understanding, and enhances teamwork.
          </p>

          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-medium transition hover:opacity-90"
            >
              Get Started
            </Link>

            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <span>backed by</span>
              <div className="border-border bg-card text-foreground rounded-md border px-2 py-1 text-xs">
                Peers
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full justify-center md:w-1/2">
          <div className="h-72 w-full rounded-lg sm:h-80">
            <WorldMap
              dots={[
                {
                  start: { lat: 64.2008, lng: -149.4937 },
                  end: { lat: 34.0522, lng: -118.2437 },
                },
                {
                  start: { lat: 64.2008, lng: -149.4937 },
                  end: { lat: -15.7975, lng: -47.8919 },
                },
                {
                  start: { lat: -15.7975, lng: -47.8919 },
                  end: { lat: 38.7223, lng: -9.1393 },
                },
                {
                  start: { lat: 51.5074, lng: -0.1278 },
                  end: { lat: 28.6139, lng: 77.209 },
                },
                {
                  start: { lat: 28.6139, lng: 77.209 },
                  end: { lat: 43.1332, lng: 131.9113 },
                },
                {
                  start: { lat: 28.6139, lng: 77.209 },
                  end: { lat: -1.2921, lng: 36.8219 },
                },
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
