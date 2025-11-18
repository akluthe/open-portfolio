# Resume Web

Next.js App Router project that server-renders resume pages by calling the Resume API. Pages live under `/r/[slug]` and are designed to print cleanly.

## Prerequisites
- Node 18+
- `RESUME_API` environment variable pointing at the running .NET API (e.g. `http://localhost:8080`).

## Install & Run

```bash
cd apps/web
npm install
RESUME_API=http://localhost:8080 npm run dev
```

Then visit http://localhost:3000/r/main to load the seeded resume from Postgres.

## Commands
- `npm run dev` – Next dev server with hot reload.
- `npm run build` – Production build.
- `npm run start` – Run the compiled server.
- `npm run lint` – ESLint via `next lint`.
- `npm run typecheck` – Standalone TypeScript check.
