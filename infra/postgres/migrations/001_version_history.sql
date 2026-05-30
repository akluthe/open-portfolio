-- Migration 001: append-only version history for resumes and tailoring profiles.
--
-- init.sql only runs when the Postgres data directory is empty, so existing
-- deployments (e.g. prod talaria-postgres) need this applied by hand. It is fully
-- idempotent: re-running it creates nothing twice and re-backfills nothing.
--
--   docker exec -i <pg-container> psql -U <role> -d resume -v ON_ERROR_STOP=1 \
--     < infra/postgres/migrations/001_version_history.sql
--
-- (or `make migrate` for the local stack). Apply BEFORE deploying the API image
-- that writes to these tables.

BEGIN;

CREATE TABLE IF NOT EXISTS resume_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL REFERENCES resumes(slug) ON DELETE CASCADE,
  version_number INT NOT NULL,
  doc JSONB NOT NULL,
  created_tsp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  change_summary TEXT,
  UNIQUE (slug, version_number)
);
CREATE INDEX IF NOT EXISTS idx_resume_versions_slug ON resume_versions(slug);

CREATE TABLE IF NOT EXISTS profile_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL REFERENCES profiles(slug) ON DELETE CASCADE,
  version_number INT NOT NULL,
  doc JSONB NOT NULL,
  created_tsp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  change_summary TEXT,
  UNIQUE (slug, version_number)
);
CREATE INDEX IF NOT EXISTS idx_profile_versions_slug ON profile_versions(slug);

-- Backfill: capture each existing live row as version 1 so its pre-edit state is
-- preserved (the first new save then becomes version 2). Skips slugs already seeded.
INSERT INTO resume_versions (slug, version_number, doc, created_tsp, change_summary)
SELECT r.slug, 1, r.doc, r.last_mod_tsp, 'Imported initial version'
FROM resumes r
WHERE NOT EXISTS (SELECT 1 FROM resume_versions v WHERE v.slug = r.slug);

INSERT INTO profile_versions (slug, version_number, doc, created_tsp, change_summary)
SELECT p.slug, 1, p.doc, p.last_mod_tsp, 'Imported initial version'
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM profile_versions v WHERE v.slug = p.slug);

COMMIT;
