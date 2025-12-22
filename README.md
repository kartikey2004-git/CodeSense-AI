# CodeSense-AI

## Project Overview

A developer-focused Next.js application that indexes GitHub repositories, generates AI summaries for code and commits using Google Gemini, and stores semantic embeddings in a PostgreSQL database (pgvector) for retrieval. It provides a web UI and backend APIs to create projects, sync repositories, and query source-code summaries and embeddings. Target audience: developers and teams who want an AI-assisted code insight and search tool for codebases.

## Features

- Web UI built with Next.js and TypeScript.
- GitHub repository loader and indexer using LangChain's `GithubRepoLoader`.
- AI summarization of code and diffs using Google Gemini (via `@ai-sdk/google` and `ai`).
- Embedding generation and storage using pgvector in PostgreSQL through Prisma (raw SQL used to write vectors).
- Persistence models for `User`, `Project`, `Commit`, and `SourceCodeEmbedding` (see Prisma schema).
- TRPC-based backend API surface.
- Authentication integration with Clerk (`@clerk/nextjs`).
- UI components styled with Tailwind CSS and Radix UI primitives.
- Prisma migrations and Studio for DB workflows.

## Tech Stack

- Frontend: Next.js (App Router), React, TypeScript
- Backend: Node.js, TRPC, Prisma (PostgreSQL)
- AI: Google Gemini via `@ai-sdk/google` and `ai`
- Vector store: PostgreSQL with `pgvector` (used via Prisma + raw SQL)
- Auth: Clerk (`@clerk/nextjs`)
- Utilities & UI: Tailwind CSS, Radix UI, React Query (`@tanstack/react-query`)
- Dev tooling: ESLint, Prettier, TypeScript, Tailwind, Prisma CLI




## Project Structure

```php
├── package.json
├── README.md
├── prisma
│   ├── schema.prisma
│   └── migrations
│
├── public
│
├── src
│   ├── app
│   │   ├── page.tsx
│   │   ├── (protected)
│   │   ├── sign-in
│   │   └── sync-user
│   │
│   ├── components
│   │   ├── subcomponents
│   │   │   ├── CreateProjectModal.tsx
│   │   │   ├── Features.tsx
│   │   │   └── Hero.tsx
│   │   └── ui
│   │
│   ├── config
│   │   ├── aiclient.config.ts
│   │   └── google.config.ts
│   │
│   ├── lib
│   │   ├── gemini.ts
│   │   ├── github-loader.ts
│   │   ├── github.ts
│   │   └── utils.ts
│   │
│   ├── server
│   │   ├── db.ts
│   │   └── api
│   │
│   ├── trpc
│   │
│   └── styles
```


## Getting Started

Prerequisites

- Node.js (install a current LTS that supports the project TypeScript/Next version)
- npm (used as package manager; `package.json` indicates `npm@11.6.1`)
- A PostgreSQL-compatible database with the `pgvector` extension (Neon is mentioned in the Prisma schema comments)
- Google Generative AI API access (Gemini) and a key
- Clerk account/keys if using auth flows
- (Optional) GitHub personal access token to index private repositories

Install and run locally

1. Clone the repository.
2. Copy example environment file and populate secrets:
   - Create `.env` in the project root (do NOT commit it).
   - Set the environment variables listed in the Configuration section below.
3. Install dependencies:

```bash
npm install
```

4. Apply Prisma migrations or push schema:

```bash
# development: creates/migrates and generates client
npm run db:generate

# or deploy migrations to an existing DB
npm run db:migrate
```

5. Start the dev server:

```bash
npm run dev
```

6. Open http://localhost:3000 in your browser.

Notes:

- `prisma generate` runs automatically after `npm install` via `postinstall`.
- Use `npm run db:studio` to launch Prisma Studio.

## Usage

- Development server: `npm run dev`
- Build: `npm run build`
- Start (production preview): `npm run preview` or `npm run start`
- Lint: `npm run lint`; fix with `npm run lint:fix`
- Typecheck: `npm run typecheck`
- Formatting: `npm run format:check` / `npm run format:write`

Key flows implemented in code:

- Create a Project (frontend modal & backend)
- Index a GitHub repository: loader fetches files, `summariseCode` runs Gemini summarization per file, embeddings generated and stored, and `SourceCodeEmbedding` rows are updated with vector data.
- Commit summaries: diffs can be summarised via `AIService.summariseDiff`.

## Configuration

Important environment variables (set in `.env` or environment; do not commit secrets):

- `DATABASE_URL` — PostgreSQL connection URL (required). Prisma `schema.prisma` uses Postgres and references `pgvector`.
- `GOOGLE_GENERATIVE_AI_API_KEY` — API key for Google Generative AI (Gemini) used by the `AIService`.
- `GEMINI_MODEL` — optional, default `gemini-2.5-flash`.
- `GITHUB_TOKEN` — optional, GitHub token used to access private repositories during indexing.
- Clerk (auth) variables seen in repo example:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL`

Where configuration lives:

- AI: [src/config/google.config.ts](src/config/google.config.ts) and [src/config/aiclient.config.ts](src/config/aiclient.config.ts)
- Env validation/schema: [src/env.js](src/env.js)
- Prisma schema: [prisma/schema.prisma](prisma/schema.prisma)

Security note: This repository contains an example `.env` file in the tree; do not commit real credentials. Remove any leaked secrets and rotate keys if necessary.

## Development & Contribution

- Code style and checks:
  - ESLint via `next lint`
  - Prettier formatting with `prettier` and `prettier-plugin-tailwindcss`
  - Type checking: `tsc --noEmit`
- Useful commands:

```bash
npm run check         # lint + typecheck
npm run format:write  # format code
npm run lint:fix      # fix lint problems
```

- Database migration workflow uses Prisma (`prisma migrate dev`, `prisma migrate deploy`, `prisma db push`).
- There is no CONTRIBUTING.md detected in the repository; contribution guidelines are not present in the codebase.

## Support & Maintenance

- For bugs or feature requests, open an issue in this repository.
- Maintainer/team info: not found in the repository files; check repository hosting (GitHub) for contact/owner information.
- CI / deployment configs: none detected in the repository (no GitHub Actions workflows, Dockerfile, or cloud config found).

Limitations / Unknowns

- Exact Node.js engine/version required is not specified in `package.json`.
- No test suite or CI pipeline found in the repository.
- Deployment-specific instructions are not provided.

---
