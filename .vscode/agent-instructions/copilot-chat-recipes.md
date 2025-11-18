# Copilot Chat Recipes (focused)

Resume API (C#)
- "Generate a Minimal API endpoint: GET /resumes/{slug} that returns JSONB from Postgres using Npgsql. Include DI registration and a small IResumeDbService implementation."
- "Implement PUT /resumes/{slug} to upsert a JSON document into a jsonb column and update last_mod_tsp. Return 200 with the saved document."
- "Expose GET /healthz (or similar) so the web tier and smoke tests can verify the API is alive before demos."


Web (Next.js)
- "Create a server component /r/[slug] that fetches the resume JSON from RESUME_API and renders a print-friendly resume. Use Zod types from packages/shared-types."
- "Add a dev-only admin page that calls PUT /resumes/{slug} for local editing via the upsert endpoint."
- "Document a smoke test: seed infra/postgres/init.sql, export RESUME_API, run npm dev, and hit /r/main to confirm SSR works."

Infra / DX
- "Provide a docker-compose.yml service for Postgres 16 that mounts infra/postgres/init.sql into /docker-entrypoint-initdb.d/ to seed the database."
- "Add a simple Makefile target to bring up/down compose and open a psql shell into the running Postgres container."
- "Outline the dev loop: make up (DB), dotnet watch (API), npm run dev (web) so contributors start all processes in the right order."
