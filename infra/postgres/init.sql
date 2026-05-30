CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  doc JSONB NOT NULL,
  created_tsp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_mod_tsp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO resumes(slug, doc)
VALUES (
  'main',
  '{
    "basics": {"name": "Your Name", "title": "Senior Software Engineer / Sub-Guild Lead"},
    "summary": "NAZ (AB InBev) sub-guild lead… polyglot microservices, observability, CI/CD.",
    "experience": [
      {"company": "Anheuser-Busch InBev (NAZ)", "role": "Senior Software Engineer", "period": "2023–Present", "highlights": [
        "Led 5 engineers; guided >10 across projects",
        "Designed event-driven microservices with observability",
        "Set standards: ADRs, QSI alignment, tracing"
      ]}
    ]
  }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Append-only version history for master resumes. Every authenticated save writes
-- the live row AND appends a snapshot here (see ResumeDbService.UpsertResumeAsync).
-- Restores re-append the chosen version's doc as a new latest version, so the
-- timeline is never rewritten.
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

-- Tailoring profiles: small JSON overlays on a master resume (referenced by
-- baseSlug). They never copy resume content; resolution happens in the web tier.
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  doc JSONB NOT NULL,
  created_tsp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_mod_tsp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Example seed (safe to keep; demonstrates the overlay shape)
INSERT INTO profiles(slug, doc)
VALUES (
  'databank-engmgr',
  '{
     "name": "Databank — Senior Engineering Manager",
     "baseSlug": "main",
     "headline": "Senior Engineering Manager — Frontend Org & Platform Modernization",
     "summary": "Engineering leader who rebuilt and led the frontend org at Anheuser-Busch InBev (NAZ)…",
     "experience": [],
     "skills": { "order": [], "hidden": [] },
     "hiddenSections": []
   }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Append-only version history for tailoring overlays. Same shape and semantics as
-- resume_versions (see ProfileDbService.UpsertProfileAsync).
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

-- Seed v1 for the rows created above so even a fresh install starts with history.
INSERT INTO resume_versions (slug, version_number, doc, created_tsp, change_summary)
SELECT r.slug, 1, r.doc, r.last_mod_tsp, 'Imported initial version'
FROM resumes r
WHERE NOT EXISTS (SELECT 1 FROM resume_versions v WHERE v.slug = r.slug);

INSERT INTO profile_versions (slug, version_number, doc, created_tsp, change_summary)
SELECT p.slug, 1, p.doc, p.last_mod_tsp, 'Imported initial version'
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM profile_versions v WHERE v.slug = p.slug);
