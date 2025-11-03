\
# Copilot Project Guidance

## Context
Polyglot monorepo (Next.js, .NET API, Node PDF). Data in Postgres JSONB.

## Coding Style
- TypeScript: strict, Zod validation at edges.
- C#: minimal API, nullable enabled.

## Preferred Patterns
- SSR fetch in server components.
- API: GET/PUT resumes by slug.
- Reuse print CSS for PDF HTML.

## Non-Goals
- No ORMs for MVP.
- No extra services unless asked.

## Comment Prompts
- “Generate a minimal API handler for GET /resumes/:slug using Npgsql.”
- “Create a Zod schema for ResumeDoc with basics, skills, experience.”
- “Build a Next.js server component that fetches JSON from RESUME_API.”
