import Image from "next/image";
import React from "react";

const Testimonials = () => {
  const testimonials = [
    {
      id: 1,
      name: "Manu Arora",
      handle: "@mannupaaji",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
      text: "CodeSense AI legit saved me hours. The auto-docs are clearer than most docs I've written myself.",
      date: "FEBRUARY 12, 2025",
      verified: true,
    },
    {
      id: 2,
      name: "Gruz",
      handle: "@GruzGruz",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
      text: "The codebase search is insane. Found a function buried 6 folders deep instantly.",
      date: "MARCH 03, 2025",
      verified: true,
    },
    {
      id: 3,
      name: "Divy",
      handle: "@11_darv",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face",
      text: "Commit summaries are stupidly accurate. Haven't opened raw commit logs in days.",
      date: "JANUARY 27, 2025",
      verified: false,
    },
    {
      id: 4,
      name: "BEEJ",
      handle: "@oodanny",
      avatar:
        "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=40&h=40&fit=crop&crop=face",
      text: "Meeting transcripts + contextual search? Bro… finally stopped taking notes in standups.",
      date: "FEBRUARY 25, 2025",
      verified: true,
    },
    {
      id: 5,
      name: "Tobi",
      handle: "@tobiashof",
      avatar:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=40&h=40&fit=crop&crop=face",
      text: "Didn’t expect the meeting search to work this well. It digs up the exact timestamp every time.",
      date: "APRIL 10, 2025",
      verified: false,
    },
    {
      id: 6,
      name: "Bikash",
      handle: "@bikash1376",
      avatar:
        "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=40&h=40&fit=crop&crop=face",
      text: "Honestly the first dev tool this year that actually reduces cognitive load.",
      date: "MARCH 22, 2025",
      verified: false,
    },
    {
      id: 7,
      name: "Rahul Roy Chowdhury",
      handle: "@RahulStark4",
      avatar:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face",
      text: "Our onboarding time dropped massively. New devs understand the codebase in a day.",
      date: "FEBRUARY 09, 2025",
      verified: false,
    },
    {
      id: 8,
      name: "Aditya A.",
      handle: "@iamAdityaAriana",
      avatar:
        "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=40&h=40&fit=crop&crop=face",
      text: "Threw a messy repo at CodeSense AI and the auto-docs were cleaner than my own documentation.",
      date: "APRIL 02, 2025",
      verified: true,
    },
    {
      id: 9,
      name: "disha",
      handle: "@madishaahoon",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
      text: "Everything feels organized now. The whole project finally feels… understandable.",
      date: "MARCH 15, 2025",
      verified: true,
    },
  ];

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
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="h-10 w-10 rounded-full"
                    height={40}
                    width={40}
                  />
                  <div>
                    <div className="flex items-center space-x-1">
                      <span className="font-semibold text-white">
                        {testimonial.name}
                      </span>
                      {testimonial.verified && (
                        <svg
                          className="h-4 w-4 text-blue-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-gray-400">
                      {testimonial.handle}
                    </span>
                  </div>
                </div>

                {/* Three dots menu */}
                <button className="text-gray-500 hover:text-gray-400">
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
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
