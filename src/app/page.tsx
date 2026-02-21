import React from "react";
import WorldMap from "@/components/ui/world-map";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FEATURES, testimonials } from "@/lib/data/data";
import { BarChart3, Layout, Settings } from "lucide-react";

const Home = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-black">
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

        <div className="relative z-10 mx-auto mt-32 mb-20 flex max-w-7xl flex-col items-center gap-12 bg-white px-6 py-16 pt-20 md:flex-row md:gap-8 lg:px-8">
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
              <Link
                href="/sign-in"
                className="group flex items-center gap-2 rounded-sm bg-black px-6 py-3 font-medium text-white transition-all hover:scale-105 hover:bg-gray-900 active:scale-95"
              >
                Get Started
              </Link>

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

      <div className="mb-10 min-h-screen bg-white p-4 text-black md:p-8">
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

      <div className="min-h-screen bg-black px-4 py-16 text-white">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-16 text-center">
            <h1 className="mb-2 text-4xl md:text-3xl">
              What People are Saying
            </h1>
            <p className="text-base leading-tight font-medium text-neutral-400 md:text-xs">
              Real feedback from real developers
              <br />
              see what the community is saying about Ossean.
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                className="border border-gray-200/10 p-6 transition-colors duration-200"
              >
                {/* Header with avatar and user info */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div>
                      <div className="flex items-center space-x-1">
                        <span className="font-semibold text-white">
                          {testimonial.name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-400">
                        {testimonial.handle}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Testimonial text */}
                <p className="mb-4 text-base leading-relaxed text-white">
                  {testimonial.text}
                </p>

                {/* Date */}
                <p className="text-xs font-medium text-gray-500">
                  {testimonial.date}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
