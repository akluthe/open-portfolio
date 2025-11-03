\
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
