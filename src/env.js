import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import "dotenv/config";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string(),
    GEMINI_MODEL: z.string().default("gemini-3-flash-preview"),
    GITHUB_WEBHOOK_SECRET: z.string(),
    ASSEMBLYAI_API_KEY: z.string().min(1, "AssemblyAI API key is required"),
    GITHUB_TOKEN: z.string().optional(),
    REDIS_HOST: z.string().default("localhost"),
    REDIS_PORT: z
      .string()
      .transform(Number)
      .pipe(z.number().positive())
      .default("6379"),
    REDIS_PASSWORD: z.string().optional().default(""),
    CACHE_BYPASS: z.string().optional().default("false"),
    AWS_ACCESS_KEY_ID: z.string().optional().default(""),
    AWS_SECRET_ACCESS_KEY: z.string().optional().default(""),
    AWS_REGION: z.string().default("us-east-1"),
    AWS_S3_BUCKET: z.string().optional().default(""),
    CLERK_SECRET_KEY: z.string().min(1, "Clerk secret key is required"),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
      .string()
      .min(1, "Clerk publishable key is required"),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: z
      .string()
      .default("/dashboard"),
    NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL: z
      .string()
      .default("/dashboard"),
  },
  experimental__runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: false,
});