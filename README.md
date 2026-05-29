# Resume Platform

A small, deliberately well-engineered resume + portfolio CMS — built as a public,
governed example of how I structure a polyglot full-stack project.

One canonical résumé (the **master**), with named **tailorings** — per-application
overlays that show/hide entries, bullets, skills, and sections without forking the
content. Every view (HTML, Typst source, PDF) renders from the same resolver, so a
tailored cut never drifts from the master.

## Architecture

```
Caddy ──▶ Next.js web (apps/web) ──▶ .NET 9 API (apps/api-resume) ──▶ Postgres
          React 18 · SSR · Clerk      minimal API · JWT (Clerk JWKS)   JSONB docs
          Typst → PDF export          dumb JSON store
```

- **`apps/web`** — Next.js (App Router). Public views `/r/[slug]` (master) and
  `/t/[slug]` (tailored); dev/admin editing under `/admin/**`; PDF + Typst export
  routes. The overlay resolver and Typst pipeline live here.
- **`apps/api-resume`** — .NET 9 minimal API. Stores resume + tailoring JSON in
  Postgres; validates Clerk JWTs on write endpoints.
- **`packages/shared-types`** — Zod schemas (`ResumeDocument`, tailoring profiles)
  shared as the single source of truth for shape and validation.
- **`infra/`** — Postgres `init.sql`, local + production Compose stacks, Caddy.
- **`docs/`** — runbooks and ADRs ([docs/README.md](docs/README.md)).

## Quickstart (local)

```bash
make up      # Postgres (creates schema + seeds on a FRESH volume via init.sql)
make dev     # Postgres + API (:5152) + web (:3000)
make seed    # load the local (gitignored) master resume into slug 'main'
```

Full runbook — Rancher Desktop, Testcontainers, auth: **[docs/LOCAL_DEV.md](docs/LOCAL_DEV.md)**.
Auth setup (Clerk + GitHub OAuth): **[docs/AUTH.md](docs/AUTH.md)**.

> `infra/postgres/init.sql` runs **only on a fresh Postgres volume**. After a
> schema change, recreate the volume (`make down && make up`, which drops data)
> or apply the change manually with `make db`.

## Tests

```bash
npm run test --prefix apps/web        # vitest (resolver, typst, view, api)
npm run typecheck --prefix apps/web   # tsc --noEmit
make test                             # web + .NET (Testcontainers; needs a Docker daemon)
```

## Deploy

Self-hosted, one Docker Compose stack behind Caddy (auto-HTTPS):
**[docs/DEPLOY.md](docs/DEPLOY.md)**.

```bash
cd infra/compose && cp .env.template .env   # fill in domain + Clerk keys
docker compose -f docker-compose.prod.yml up -d --build
```

## Governance

- **ADRs** — architecture decisions in [`docs/adr/`](docs/adr).
- **CI** — `.github/workflows/ci.yml` builds and tests web + API on every PR.
- **Contributing** — [CONTRIBUTING.md](CONTRIBUTING.md).
- **License** — [MIT](LICENSE).
