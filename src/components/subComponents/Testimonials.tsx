import { testimonials } from "@/lib/data/data";
import React from "react";

const Testimonials = () => {
  return (
    <section className="py-12 sm:py-16">
      <div className="app-container">
        <div className="mb-16 text-center">
          <h1 className="mb-2 text-3xl md:text-4xl">What People are Saying</h1>
          <p className="text-muted-foreground text-sm font-medium md:text-base">
            Real feedback from real developers
            <br />
            see what the community is saying about Ossean.
          </p>
        </div>

        <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="border-border bg-card rounded-lg border p-6 transition-colors duration-200"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div>
                    <div className="flex items-center space-x-1">
                      <span className="text-foreground font-semibold">
                        {testimonial.name}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-sm">
                      {testimonial.handle}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-foreground mb-4 text-base">
                {testimonial.text}
              </p>

              <p className="text-muted-foreground text-xs font-medium">
                {testimonial.date}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
