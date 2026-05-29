# Local development & testing runbook

How to start the stack locally and run the test suites, including the non-obvious
bits (Rancher Desktop, Testcontainers, local auth). Verified 2026-05-28.

## Stack shape

| Piece | How it runs | Address |
|---|---|---|
| Postgres | container (`resume-platform-postgres-1`) via `make up` | `localhost:5432` |
| .NET API | host process (`dotnet watch`) via `make api` | `http://localhost:5152` |
| Next.js web | host process (`next dev`) via `make web` | `http://localhost:3000` |

`make dev` = `make up` then API + web together. The web app reads `RESUME_API`
(default `http://localhost:5152`) to reach the API server-side.

## Container runtime

There's **no Docker Desktop** on this machine — use **Rancher Desktop**. Its
CLIs live in `~/.rd/bin` (`docker`, `docker-compose`, `nerdctl`, `rdctl`).

Start it headlessly (no GUI needed) and wait for the daemon:
```bash
~/.rd/bin/rdctl start                      # boots the lima VM + dockerd
export PATH="$HOME/.rd/bin:$PATH"
until docker info >/dev/null 2>&1; do sleep 5; done   # first boot ~10–90s
```
Active context becomes `rancher-desktop`, socket `~/.rd/docker.sock`.

## Bring the stack up
```bash
make up      # Postgres only (pulls postgres:16 on first run)
make dev     # Postgres + API + web
make db      # psql shell into the running DB
make logs    # follow Postgres logs
make down    # stop + DROP the volume (-v)
```

### Database seeding & the fresh-volume caveat
`infra/postgres/init.sql` runs **only on a fresh Postgres volume** (mounted into
`/docker-entrypoint-initdb.d/`). After a schema change (e.g. adding the
`profiles` table) an existing volume will **not** pick it up. Either:
- `make down && make up` to recreate the volume from `init.sql` (drops data), or
- apply the change manually via `make db`.

`init.sql` seeds a **placeholder** `main` resume + the `databank-engmgr` profile.
The real master resume is local-only (gitignored `infra/seed/resume-main.json`,
contains PII). Load it with:
```bash
make seed    # idempotent upsert of infra/seed/resume-main.json into slug 'main'
```

## Tests

```bash
npm run test --prefix apps/web        # vitest (the npm script is already `vitest run`)
npm run typecheck --prefix apps/web   # tsc --noEmit
make test                             # web + .NET
```

### .NET integration tests need Docker + Rancher tweaks
`apps/api-resume.tests` uses **Testcontainers** (spins up its own ephemeral
Postgres). On Rancher Desktop the default socket isn't found and the Ryuk reaper
can't bind, so **every test fails after ~60s** unless you export:
```bash
export DOCKER_HOST="unix://$HOME/.rd/docker.sock"
export TESTCONTAINERS_RYUK_DISABLED=true
dotnet test apps/api-resume.tests/api-resume.tests.csproj
```

## Local auth (testing authenticated endpoints)

`apps/api-resume/appsettings.json` ships placeholder Clerk keys, so the API runs
in Clerk mode by default and public `GET` endpoints work without a token. To
exercise the `[Authorize]` writes (`PUT`/`DELETE`) locally **without** Clerk,
start the API in symmetric-secret mode and mint an HS256 token:
```bash
CLERK_PUBLISHABLE_KEY="" CLERK_SECRET_KEY="" CLERK_INSTANCE_ID="" \
  JWT_SECRET="dev-local-secret-please-rotate-0123456789" \
  ASPNETCORE_URLS="http://localhost:5152" \
  dotnet run --project apps/api-resume/api-resume.csproj

# token (exp +1h), signed with the same secret; issuer/audience are not validated:
TOKEN=$(node -e 'const c=require("crypto");const s=process.argv[1];const b=o=>Buffer.from(JSON.stringify(o)).toString("base64url");const h=b({alg:"HS256",typ:"JWT"});const n=Math.floor(Date.now()/1000);const p=b({sub:"dev",iat:n,exp:n+3600});process.stdout.write(h+"."+p+"."+c.createHmac("sha256",s).update(h+"."+p).digest("base64url"))' "$JWT_SECRET")
curl -X PUT http://localhost:5152/profiles/itest -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"x","baseSlug":"main"}'
```
The **web** admin routes (`/admin/*`) are Clerk-gated by middleware and return
`404` when unauthenticated (`apps/web/.env.local` holds the real Clerk keys for
browser sign-in).

## Smoke checks
```bash
curl -s localhost:5152/profiles                                  # [] or list
curl -s localhost:5152/resumes/main | head -c 80                 # master JSON
curl -so/dev/null -w '%{http_code}\n' localhost:3000/t/databank-engmgr      # 200
curl -so/dev/null -w '%{http_code}\n' localhost:3000/api/profiles/databank-engmgr/pdf  # 200 (PDF)
```
PDF rendering depends on `@myriaddreamin/typst-ts-renderer` being installed
(Turbopack pulls it into `typst.ts`'s module graph); it's a dependency in
`apps/web/package.json`.
