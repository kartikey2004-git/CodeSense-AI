import { testimonials } from "@/lib/data/data";
import Image from "next/image";
import React from "react";

const Testimonials = () => {
  return (
    <div className="min-h-screen bg-black px-4 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <h1 className="mb-2 text-4xl md:text-3xl">What People are Saying</h1>
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
  );
};

export default Testimonials;
