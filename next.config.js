/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 */

/** @type {import("next").NextConfig} */
const config = {
  images: {
    remotePatterns: [
      {
        hostname: "avatars.githubusercontent.com",
      },
      {
        hostname: "images.unsplash.com",
      },
      {
        hostname: "img.clerk.com",
      },
      {
        hostname: "github.com",
      },
    ],
  },
};

// Only validate env in development
if (process.env.NODE_ENV !== "production") {
  try {
    await import("./src/env.js");
  } catch (error) {
    console.warn(
      "Env validation skipped:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export default config;
