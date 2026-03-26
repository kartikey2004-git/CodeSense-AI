declare module "*.css";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      NODE_ENV: "development" | "test" | "production";
      GOOGLE_GENERATIVE_AI_API_KEY: string;
      GEMINI_MODEL: string;
      GITHUB_WEBHOOK_SECRET: string;
      ASSEMBLYAI_API_KEY: string;
      GITHUB_TOKEN?: string;
      REDIS_HOST: string;
      REDIS_PORT: string;
      REDIS_PASSWORD?: string;
      CACHE_BYPASS?: string;
      AWS_ACCESS_KEY_ID?: string;
      AWS_SECRET_ACCESS_KEY?: string;
      AWS_REGION: string;
      AWS_S3_BUCKET?: string;
      CLERK_SECRET_KEY: string;
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: string;
      NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: string;
      NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL: string;
      SKIP_ENV_VALIDATION?: string;
    }
  }
}

export {};
