"use client"

import React from 'react'

const SeeInAction = () => {
  return (
    <div className="min-h-screen bg-white px-4 py-16 text-black">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h1 className="mb-2 text-4xl md:text-3xl">See It In Action</h1>
          <p className="text-sm leading-tight font-medium text-neutral-700 md:text-sm">
            See how <span className="font-bold">CodeSense AI works: </span>{" "}
            developer-friendly collaboration platform.
          </p>
        </div>

        <div className="flex items-center justify-center">
          {/* Your demo/video component goes here */}
        </div>
      </div>
    </div>
  );
}

export default SeeInAction