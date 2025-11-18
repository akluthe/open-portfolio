# Project Guidance — Split responsibilities

This project is split into two primary deliverables:

- Resume API (apps/api-resume): .NET minimal API, Npgsql for Postgres JSONB storage.
- Web UI (apps/web): Next.js (App Router) server-side render pages that fetch from the API.

Keep responsibilities separate in prompts and implementations. Below are focused guidelines and prompts you can reuse.

## Resume API (C#)
- Minimal API (top-level statements) using nullable reference types.
- No ORM: use Npgsql directly and parameterized SQL. Keep data access behind a small service layer (IResumeDbService).
- Store resume documents as JSONB in Postgres; use `slug` for lookups.
- Surface simple endpoints: GET /resumes/{slug}, PUT /resumes/{slug} (upsert), and GET /healthz.

Suggested prompts for API work:
- "Create a minimal .NET Minimal API handler for GET /resumes/{slug} using Npgsql and return JSONB content or 404."
- "Implement PUT /resumes/{slug} to upsert JSONB doc and update last_mod_tsp using parameterized SQL (no ORM)."
- "Add IResumeDbService with methods GetResumeJsonBySlugAsync and UpsertResumeAsync plus basic unit tests using an in-memory or test container Postgres."

## Web UI (Next.js)
- Use App Router server components to fetch resume JSON server-side.
- Keep Zod schemas in `packages/shared-types` and reuse them in the web for validation.
- Implement a print-friendly CSS profile optimized to fit 1–2 pages.

Suggested prompts for web work:
- "Create a Next.js server component at /r/[slug] that fetches RESUME_API/resumes/{slug} server-side and renders a printable resume layout."
- "Add a small dev-only admin route that calls PUT /resumes/{slug} for local editing (feature-flagged)."

## Cross-cutting
- Prefer server rendering for the public resume to keep content SEO-friendly and reproducible for PDF.
- Reuse print CSS across web and PDF generator.

Use these focused prompts when asking the assistant to generate code to avoid mixing responsibilities.
