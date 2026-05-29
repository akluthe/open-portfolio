\
# Resume Platform (Public Build)

A lean, over-engineered (on purpose) resume + portfolio to demonstrate staff-level engineering.

## Quickstart
```bash
# Postgres only for S1E01–S1E02
docker compose -f infra/compose/docker-compose.yml up -d
```

## Roadmap (Seasons/Episodes)
- S1E01 Monorepo + scaffold
- S1E02 Data model: JSONB + Zod
- S1E03 Minimal API read
- S1E04 Web SSR + print CSS
- S1E05 Local admin editing (dev-only)
- S1E06 Typst + PDF download routes
- S1E07 Resume tailoring (master + overlay)
- Stretch: PDF, OTEL, CI/CD, Helm

## Local development & verification
> Full runbook (Rancher Desktop, Testcontainers, local auth, smoke checks): [`docs/LOCAL_DEV.md`](docs/LOCAL_DEV.md).

```bash
make up     # Postgres (creates schema + seeds on a FRESH volume via init.sql)
make dev    # Postgres + API (:5152) + web (:3000)
make seed   # load the local (gitignored) master resume into slug 'main'
```

**Migration caveat:** `infra/postgres/init.sql` runs only on a *fresh* Postgres
volume (it's mounted into `/docker-entrypoint-initdb.d/`). After changing the
schema (e.g. the `profiles` table), an existing volume will **not** pick it up.
Either recreate the volume with `make down && make up` (drops data via `-v`) or
apply the change manually with `make db`.

**Tests:**
```bash
npm run test --prefix apps/web          # vitest (resolver, typst, view, api)
npm run typecheck --prefix apps/web     # tsc --noEmit
make test                               # web + .NET (.NET uses Testcontainers)
```
The .NET integration tests need a Docker daemon. With **Rancher Desktop** (no
Docker Desktop), export these first so Testcontainers can reach the engine and
skip the Ryuk reaper (which can't bind the Rancher socket):
```bash
export DOCKER_HOST="unix://$HOME/.rd/docker.sock"
export TESTCONTAINERS_RYUK_DISABLED=true
```

## Backlog
See `ado/*.csv` for Azure DevOps import.
