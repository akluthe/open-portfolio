# Deploying (self-hosted Docker)

The whole platform runs as one Docker Compose stack behind
[Caddy](https://caddyserver.com) (automatic HTTPS). Suitable for a single host —
a Proxmox VM, a Hetzner box, or any Docker-capable Linux machine.

```
        :80/:443                internal network: resume-net
client ──────────▶ Caddy ──▶ web (Next.js :3000) ──▶ api (.NET :8080) ──▶ postgres :5432
                   (TLS)
```

Only Caddy publishes ports to the host. `web`, `api`, and `postgres` are reachable
only on the internal network.

## Prerequisites

- A host with Docker + Docker Compose v2.
- A DNS **A/AAAA record** for your domain pointing at the host's public IP
  (Caddy needs this to obtain a Let's Encrypt cert).
- Ports **80** and **443** open to the internet.
- A Clerk application with production keys ([AUTH.md](AUTH.md)).

## 1. Configure

```bash
cd infra/compose
cp .env.template .env
# Edit .env: DOMAIN, SSL_EMAIL, POSTGRES_PASSWORD, Clerk keys, admin usernames.
```

## 2. Build & start

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

Caddy provisions a TLS cert on first request to `DOMAIN`. The web image bakes
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` at build time (from `CLERK_PUBLISHABLE_KEY`),
so **rebuild `web` whenever that key changes**.

## 3. Seed resume data

The schema is created automatically by `infra/postgres/init.sql` on the **first**
boot of a fresh `pgdata` volume. Resume content is **not** in the repo (it's real
PII; `infra/seed/` is gitignored). Load it onto the server's DB directly:

```bash
# From the repo on the host, with your seed JSON present at infra/seed/resume-main.json:
PG=$(docker compose -f infra/compose/docker-compose.prod.yml ps -q postgres)
DOC=$(cat infra/seed/resume-main.json)
docker exec -i "$PG" psql -U postgres -d resume <<SQL
SET client_encoding TO 'UTF8';
INSERT INTO resumes(slug, doc, last_mod_tsp)
VALUES ('main', \$doc\$${DOC}\$doc\$::jsonb, NOW())
ON CONFLICT (slug) DO UPDATE SET doc = EXCLUDED.doc, last_mod_tsp = NOW();
SQL
```

Then `https://yourdomain/r/main` serves it. Admins can also edit live at
`/admin/main` once signed in.

### Tailoring overlays

`init.sql` seeds only a **bare example** overlay for `databank-engmgr` (headline +
summary, nothing hidden/reordered). The real, fully-tailored overlays live in the
gitignored `infra/seed/` and must be loaded the same way as the master — otherwise
`/t/<slug>` renders barely tailored. Overlays are **index-based against the master**,
so seed the master first.

```bash
DOC=$(cat infra/seed/databank-tailoring.json)
docker exec -i "$PG" psql -U postgres -d resume <<SQL
SET client_encoding TO 'UTF8';
INSERT INTO profiles(slug, doc)
VALUES ('databank-engmgr', \$doc\$${DOC}\$doc\$::jsonb)
ON CONFLICT (slug) DO UPDATE SET doc = EXCLUDED.doc, last_mod_tsp = NOW();
SQL
```

(`make seed-profile` does the same against the local dev DB.)

## Operations

```bash
# Logs
docker compose -f docker-compose.prod.yml logs -f --tail=200

# Update to latest code
git pull && docker compose -f docker-compose.prod.yml up -d --build

# Back up Postgres
docker exec "$PG" pg_dump -U postgres resume | gzip > resume-$(date +%F).sql.gz
```

### Schema changes / migrations

`init.sql` only runs on a fresh volume, so an existing deployment needs migrations
applied by hand. Each file in `infra/postgres/migrations/` is idempotent
(`CREATE ... IF NOT EXISTS` + guarded backfills), so re-running is safe.

Apply them in order, as the **owning role** (on the live `talaria-postgres` that is
the resume DB owner, not `postgres`):

```bash
PG=<postgres-container>   # e.g. talaria-postgres
ROLE=<db-owner-role>      # e.g. talaria
for f in infra/postgres/migrations/*.sql; do
  echo "Applying $f ..."
  docker exec -i "$PG" psql -U "$ROLE" -d resume -v ON_ERROR_STOP=1 < "$f"
done
```

(Locally: `make migrate`.) Apply migrations **before** rolling the new API image —
the version-history write path references the `*_versions` tables. Deploy order:
**migrate → API → web**.

> **Version history** (migration `001`) makes every authenticated resume/tailoring
> save append an immutable snapshot. The backfill captures each existing row as
> version 1, so nothing is lost on the first edit after deploying. Restores are
> append-only (they add a new latest version; they never rewrite the timeline).

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Caddy can't get a cert | DNS not pointing at the host yet, or 80/443 blocked. Check `docker compose logs caddy`. |
| Web shows 500 on admin | Clerk keys missing/mismatched between `web` and `api`; rebuild `web` after changing the publishable key. |
| API unhealthy | Bad `POSTGRES_PASSWORD` or Postgres still starting; `api` waits on the Postgres healthcheck. |
| Empty resume page | Data not seeded yet — see step 3. |
