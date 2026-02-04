"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import WorldMap from "@/components/ui/world-map";
import { redirect } from "next/navigation";


const Hero = () => {
  return (
    <>
      {/* Light grid background */}
      <div className="absolute inset-0 opacity-15">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `
          linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)
        `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto mb-20 flex max-w-7xl flex-col items-center gap-12 bg-white px-6 py-16 pt-20 md:flex-row md:gap-8 lg:px-8 mt-32">
        {/* LEFT */}
        <div className="w-full md:w-1/2">
          <h1
            className={`mb-8 text-4xl leading-tight font-light tracking-tighter md:text-5xl`}
          >
            <span className="font-light text-black">CodeSense AI</span>
            <br />
            <span className="text-gray-800">Power tool for Developers</span>
          </h1>

          <div className="relative mb-8">
            <p className="inline-block rounded border border-gray-300 bg-white/80 px-4 py-2 text-sm text-gray-700 backdrop-blur-sm">
              Discover CodeSense AI
            </p>
          </div>

          <p className="mb-12 max-w-md text-sm leading-relaxed text-gray-700">
            CodeSense AI is a powerful platform designed to simplify developer
            collaboration that simplifies the process, streamlines code
            understanding, and enhances teamwork.
          </p>

          <div className="flex items-center gap-4">
            <Button
              className="group flex items-center gap-2 rounded-sm bg-black px-6 py-3 font-medium text-white transition-all hover:scale-105 hover:bg-gray-900 active:scale-95"
              onClick={() => redirect("/sign-in")}
            >
              Get Started
            </Button>

            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>backed by</span>
              <div className="rounded bg-orange-500 px-2 py-1 text-xs text-white">
                Peers
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex w-full justify-center md:w-1/2">
          <div className="h-80 w-full rounded-xl">
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
    </>
  );
};

export default Hero;
