#!/usr/bin/env bash
set -euo pipefail

FORCE=0
if [[ "${1:-}" == "--force" ]]; then
  FORCE=1
fi

# Helpers
mkd() { mkdir -p "$1"; }
write_file() {
  local path="$1"
  local content="$2"
  if [[ -e "$path" && $FORCE -ne 1 ]]; then
    echo "skip   $path (exists; use --force to overwrite)"
  else
    printf "%s" "$content" > "$path"
    echo "write  $path"
  fi
}

echo "Scaffolding repo structure and key dotfiles..."

# ─────────────────────────────────────────────────────────────────────────────
# Directories
# ─────────────────────────────────────────────────────────────────────────────
mkd "apps/web"
mkd "apps/api-resume"
mkd "apps/svc-pdf"                # stretch service; empty for now

mkd "packages/shared-types"
mkd "packages/shared-telemetry"   # stretch; placeholder

mkd "infra/compose"
mkd "infra/postgres"
mkd "infra/otel"                  # stretch; placeholder
mkd "infra/helm"                  # stretch; placeholder

mkd "docs/series"
mkd "docs/adr"

mkd ".github/workflows"
mkd ".vscode"

mkd "ado"

# ─────────────────────────────────────────────────────────────────────────────
# Top-level files
# ─────────────────────────────────────────────────────────────────────────────
readme_content=$'\
# Resume Platform (Public Build)\n\nA lean, over-engineered (on purpose) resume + portfolio to demonstrate staff-level engineering.\n\n## Quickstart\n```bash\n# Postgres only for S1E01–S1E02\ndocker compose -f infra/compose/docker-compose.yml up -d\n```\n\n## Roadmap (Seasons/Episodes)\n- S1E01 Monorepo + scaffold\n- S1E02 Data model: JSONB + Zod\n- S1E03 Minimal API read\n- S1E04 Web SSR + print CSS\n- S1E05 Local admin editing (dev-only)\n- Stretch: PDF, OTEL, CI/CD, Helm\n\n## Backlog\nSee `ado/*.csv` for Azure DevOps import.\n'
write_file "README.md" "$readme_content"

repo_tree=$'\
resume-platform/\n\
├─ apps/\n\
│  ├─ web/                     # Next.js (React/TS)\n\
│  ├─ api-resume/              # .NET 8 Minimal API\n\
│  └─ svc-pdf/                 # (Stretch) Node PDF service\n\
├─ packages/\n\
│  ├─ shared-types/            # Zod schemas\n\
│  └─ shared-telemetry/        # (Stretch) OTEL helpers/docs\n\
├─ infra/\n\
│  ├─ compose/                 # docker-compose files\n\
│  ├─ postgres/                # init.sql\n\
│  ├─ otel/                    # (Stretch) OTEL Collector config\n\
│  └─ helm/                    # (Stretch) Helm chart\n\
├─ docs/\n\
│  ├─ series/                  # episode posts\n\
│  └─ adr/                     # ADRs (MADR style)\n\
├─ .github/\n\
│  ├─ workflows/               # (Stretch) CI\n\
│  ├─ copilot-instructions.md\n\
│  └─ copilot-chat-recipes.md\n\
├─ .vscode/\n\
│  ├─ settings.json\n\
│  └─ extensions.json\n\
├─ .editorconfig\n\
├─ .gitignore\n\
├─ Makefile\n\
└─ REPO_TREE.txt\n'
write_file "REPO_TREE.txt" "$repo_tree"

gitignore_content=$'\
# macOS\n.DS_Store\n\n# Node\nnode_modules/\n*.log\n.next/\n.out/\ncoverage/\n\n# Dotnet\nbin/\nobj/\n*.user\n*.suo\n\n# Docker\n**/.env.local\n\n# Misc\n.env\n.env.*\n'
write_file ".gitignore" "$gitignore_content"

editorconfig=$'\
root = true\n\n[*]\nend_of_line = lf\ninsert_final_newline = true\ncharset = utf-8\ntrim_trailing_whitespace = true\nindent_style = space\nindent_size = 2\n\n[*.cs]\nindent_size = 4\n'
write_file ".editorconfig" "$editorconfig"

makefile=$'\
.PHONY: up down logs ps db\n\nCOMPOSE=infra/compose/docker-compose.yml\n\nup:\n\tdocker compose -f $(COMPOSE) up -d\n\tdocker compose -f $(COMPOSE) ps\n\ne2e:\n\t# placeholder for future end-to-end script\n\nlogs:\n\tdocker compose -f $(COMPOSE) logs -f --tail=200\n\nps:\n\tdocker compose -f $(COMPOSE) ps\n\ndown:\n\tdocker compose -f $(COMPOSE) down -v\n\ndb:\n\tdocker exec -it resume-platform-postgres-1 psql -U postgres -d resume\n'
write_file "Makefile" "$makefile"

# ─────────────────────────────────────────────────────────────────────────────
# VS Code settings
# ─────────────────────────────────────────────────────────────────────────────
vscode_settings=$'\
{\n  "editor.formatOnSave": true,\n  "files.eol": "\\n",\n  "typescript.tsdk": "node_modules/typescript/lib",\n  "editor.defaultFormatter": "esbenp.prettier-vscode",\n  "[csharp]": { "editor.defaultFormatter": "ms-dotnettools.csharp" },\n  "eslint.validate": ["javascript", "typescript", "typescriptreact"],\n  "prettier.requireConfig": true\n}\n'
write_file ".vscode/settings.json" "$vscode_settings"

vscode_extensions=$'\
{\n  "recommendations": [\n    "ms-vscode.vscode-typescript-next",\n    "esbenp.prettier-vscode",\n    "dbaeumer.vscode-eslint",\n    "ms-dotnettools.csharp",\n    "bierner.markdown-preview-github-styles"\n  ]\n}\n'
write_file ".vscode/extensions.json" "$vscode_extensions"

# ─────────────────────────────────────────────────────────────────────────────
# GitHub Copilot guidance
# ─────────────────────────────────────────────────────────────────────────────
copilot_instructions=$'\
# Copilot Project Guidance\n\n## Context\nPolyglot monorepo (Next.js, .NET API, Node PDF). Data in Postgres JSONB.\n\n## Coding Style\n- TypeScript: strict, Zod validation at edges.\n- C#: minimal API, nullable enabled.\n\n## Preferred Patterns\n- SSR fetch in server components.\n- API: GET/PUT resumes by slug.\n- Reuse print CSS for PDF HTML.\n\n## Non-Goals\n- No ORMs for MVP.\n- No extra services unless asked.\n\n## Comment Prompts\n- “Generate a minimal API handler for GET /resumes/:slug using Npgsql.”\n- “Create a Zod schema for ResumeDoc with basics, skills, experience.”\n- “Build a Next.js server component that fetches JSON from RESUME_API.”\n'
write_file ".github/copilot-instructions.md" "$copilot_instructions"

copilot_recipes=$'\
# Copilot Chat Recipes\n\n- “Write a docker-compose service for Postgres 16 with init.sql mount.”\n- “Add @media print CSS that fits resume to 1–2 pages.”\n- “Implement PUT /resumes/:slug upsert using JSONB.”\n- “Create a simple admin form using React that binds to ResumeDoc.”\n- “Instrument .NET Minimal API with OpenTelemetry and Npgsql instrumentation.”\n- “Create a Helm Deployment + Service + Ingress for web with values.”\n'
write_file ".github/copilot-chat-recipes.md" "$copilot_recipes"

# ─────────────────────────────────────────────────────────────────────────────
# Docs: Episode templates and initial posts
# ─────────────────────────────────────────────────────────────────────────────
episode_template=$'\
# S{Season}E{Episode} — {Concise Achievement}\n\n**Why this matters (hiring manager lens):**  \n{1–2 sentences.}\n\n## What we built\n- {bullet}\n- {bullet}\n\n## Key decisions\n- {Decision → ADR link}\n- {Decision → ADR link}\n- {Decision → ADR link}\n\n## How to run it\n```bash\nmake up\n```\n\n## Demo script (3–5 min)\n1) {Step}\n2) {Step}\n3) {Step}\n\n## What’s next\n- {Next episode teaser}\n'
write_file "docs/series/_template.md" "$episode_template"

s1e01=$'\
# S1E01 — Monorepo + Baseline Web/API/DB Scaffold\n\n**Why this matters:** Clean foundation shows engineering hygiene and accelerates delivery.\n\n## What we built\n- Monorepo structure (`apps`, `packages`, `infra`, `docs`)\n- Next.js app (web)\n- .NET API skeleton\n- Postgres via docker-compose\n- Makefile for DX\n\n## Key decisions\n- Monorepo (ADR-001)\n- Next.js for SSR (ADR-003)\n- Postgres JSONB (ADR-004)\n\n## How to run it\n```bash\nmake up   # starts postgres for now\n```\n\n## Demo script\n1) Show repo tree.\n2) Explain intended contracts.\n3) Confirm Postgres container is healthy.\n\n## What’s next\n- Seed data + Zod schema (S1E02)\n'
write_file "docs/series/S1E01.md" "$s1e01"

s1e02=$'\
# S1E02 — Data Model: JSONB + Zod\n\n**Why this matters:** Flexible schema supports iteration without heavy migrations.\n\n## What we built\n- `ResumeDoc` Zod schema\n- `resumes` JSONB table & seed row (`slug=main`)\n\n## Key decisions\n- JSONB over relational schema (ADR-004)\n- Shared types package (ADR-013)\n\n## Run\n```bash\ndocker compose -f infra/compose/docker-compose.yml up -d postgres\n```\n\n## Demo script\n1) Show `init.sql`.\n2) `SELECT` the seeded row.\n3) Walk through `ResumeDoc`.\n\n## Next\n- Minimal API read endpoint (S1E03)\n'
write_file "docs/series/S1E02.md" "$s1e02"

s1e03=$'\
# S1E03 — Minimal API Read: GET /resumes/:slug\n\n**Why this matters:** A crisp boundary exposes a stable contract to the web.\n\n## Built\n- .NET Minimal API with `GET /resumes/:slug` + `healthz`\n- Integration smoke test\n\n## Decisions\n- .NET 8 LTS baseline (ADR-002)\n- Minimal API over full MVC (ADR-005)\n\n## Run\n```bash\ndotnet run --project apps/api-resume\ncurl http://localhost:8080/resumes/main\n```\n\n## Demo\n1) Health check.\n2) GET main returns JSON.\n3) Small refactor without breaking contract.\n\n## Next\n- SSR web view that consumes API (S1E04)\n'
write_file "docs/series/S1E03.md" "$s1e03"

s1e04=$'\
# S1E04 — Web SSR from API + Print CSS\n\n**Why this matters:** Fast, SEO-friendly rendering and a clean print layout for recruiters.\n\n## Built\n- `/r/main` server component fetch\n- Print stylesheet (`@media print`)\n\n## Decisions\n- SSR via Next.js App Router (ADR-003)\n- Print-first PDF strategy (ADR-015)\n\n## Run\n```bash\nRESUME_API=http://localhost:8080 npm run dev --prefix apps/web\n```\n\n## Demo\n1) Change seed JSON; refresh `/r/main`.\n2) Print preview shows a tight 1–2 page resume.\n\n## Next\n- Local admin editing (S1E05)\n'
write_file "docs/series/S1E04.md" "$s1e04"

s1e05=$'\
# S1E05 — Local Admin Editing (Dev-Only)\n\n**Why this matters:** Let the platform live and evolve without manual DB edits.\n\n## Built\n- `/admin/main` form for basics/experience\n- `PUT /resumes/:slug` upsert\n- Dev-only feature flag\n\n## Decisions\n- Dev-only first to reduce auth friction (ADR-011)\n\n## Run\n```bash\nmake up\nnpm run dev --prefix apps/web\ndotnet run --project apps/api-resume\n```\n\n## Demo\n1) Edit headline; save.\n2) Refresh public `/r/main` to see change.\n3) Toggle dev-only flag off/on.\n\n## Next\n- (Stretch) GitHub OAuth, PDF, OTEL, CI/CD\n'
write_file "docs/series/S1E05.md" "$s1e05"

# ─────────────────────────────────────────────────────────────────────────────
# ADRs (short MADR-style starters)
# ─────────────────────────────────────────────────────────────────────────────
adr1=$'\
# ADR-001 Monorepo\n\n## Status\nAccepted\n\n## Context\nPolyglot services; shared types.\n\n## Decision\nSingle monorepo with `apps/`, `packages/`, `infra/`, `docs/`.\n\n## Consequences\nSimple local DX; clear boundaries; future Nx/Turborepo optional.\n'
write_file "docs/adr/adr-001-monorepo.md" "$adr1"

adr2=$'\
# ADR-002 .NET LTS\n\n## Status\nAccepted\n\n## Decision\nUse **.NET 8 (LTS)** for API. Track .NET 10 LTS later.\n\n## Consequences\nStable support window; avoids STS churn.\n'
write_file "docs/adr/adr-002-dotnet-lts.md" "$adr2"

adr3=$'\
# ADR-003 Frontend Framework\n\n## Status\nAccepted\n\n## Decision\nUse Next.js (App Router) for SSR/SEO and print-friendly output.\n\n## Consequences\nGreat DX; universal rendering; simple hosting.\n'
write_file "docs/adr/adr-003-frontend-nextjs.md" "$adr3"

# ─────────────────────────────────────────────────────────────────────────────
# Infra: docker-compose (postgres-only for early episodes) & init.sql
# ─────────────────────────────────────────────────────────────────────────────
compose=$'\
version: "3.9"\nservices:\n  postgres:\n    image: postgres:16\n    container_name: resume-platform-postgres-1\n    environment:\n      POSTGRES_PASSWORD: postgres\n      POSTGRES_DB: resume\n    ports:\n      - "5432:5432"\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n      - ../postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro\nvolumes:\n  pgdata:\n'
write_file "infra/compose/docker-compose.yml" "$compose"

init_sql=$'\
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n\nCREATE TABLE IF NOT EXISTS resumes (\n  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n  slug TEXT UNIQUE NOT NULL,\n  doc JSONB NOT NULL,\n  created_tsp TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n  last_mod_tsp TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);\n\nINSERT INTO resumes(slug, doc)\nVALUES (\n  \'main\',\n  \'{\n    \"basics\": {\"name\": \"Your Name\", \"title\": \"Senior Software Engineer / Sub-Guild Lead\"},\n    \"summary\": \"NAZ (AB InBev) sub-guild lead… polyglot microservices, observability, CI/CD.\",\n    \"experience\": [\n      {\"company\": \"Anheuser-Busch InBev (NAZ)\", \"role\": \"Senior Software Engineer\", \"period\": \"2023–Present\", \"highlights\": [\n        \"Led 5 engineers; guided >10 across projects\",\n        \"Designed event-driven microservices with observability\",\n        \"Set standards: ADRs, QSI alignment, tracing\"\n      ]}\n    ]\n  }\'::jsonb\n)\nON CONFLICT (slug) DO NOTHING;\n'
write_file "infra/postgres/init.sql" "$init_sql"

# ─────────────────────────────────────────────────────────────────────────────
# Azure DevOps CSVs
# ─────────────────────────────────────────────────────────────────────────────
epics_features_csv=$'\
Work Item Type,Title,Description,Area Path,Iteration Path,Parent\n\
Epic,EPIC A — Platform Foundation,"Repo, infra, DB, baseline API, baseline web render.","ResumePlatform","\\Sprint 1",\n\
Epic,EPIC B — Resume Editing,"Local admin editing, then auth.","ResumePlatform","\\Sprint 2",\n\
Epic,EPIC C — Polish & Extras,"PDF export, observability, CI/CD & deploy.","ResumePlatform","\\Sprint 3",\n\
\n\
Feature,FEAT A1 — Codebase + Local Dev,"Monorepo; Next.js; .NET API skeleton; Postgres docker-compose; Makefile.","ResumePlatform","\\Sprint 1","EPIC A — Platform Foundation"\n\
Feature,FEAT A2 — Data Schema + Seed,"Zod ResumeDoc; Postgres JSONB table; seed `main`.","ResumePlatform","\\Sprint 1","EPIC A — Platform Foundation"\n\
Feature,FEAT A3 — Minimal API (Read),"GET /resumes/:slug; health endpoint.","ResumePlatform","\\Sprint 1","EPIC A — Platform Foundation"\n\
Feature,FEAT A4 — Public Resume View,"Next.js `/r/main` SSR from API; print CSS.","ResumePlatform","\\Sprint 1","EPIC A — Platform Foundation"\n\
\n\
Feature,FEAT B1 — Admin Editing (Local),"`/admin/main` form; Zod validation; PUT upsert; dev-only flag.","ResumePlatform","\\Sprint 2","EPIC B — Resume Editing"\n\
Feature,FEAT B2 — Auth for Admin,"GitHub OAuth; protect admin routes.","ResumePlatform","\\Sprint 2","EPIC B — Resume Editing"\n\
\n\
Feature,FEAT C1 — PDF Export,"Node+Playwright microservice; ‘Download PDF’.","ResumePlatform","\\Sprint 3","EPIC C — Polish & Extras"\n\
Feature,FEAT C2 — Observability,"OpenTelemetry web→api; OTEL Collector; trace ID surfaced.","ResumePlatform","\\Sprint 3","EPIC C — Polish & Extras"\n\
Feature,FEAT C3 — CI/CD & Deploy,"Dockerfiles; GH Actions; Helm chart; ingress.","ResumePlatform","\\Sprint 3","EPIC C — Polish & Extras"\n'
write_file "ado/01_epics_features.csv" "$epics_features_csv"

pbis_csv=$'\
Work Item Type,Title,Description,Area Path,Iteration Path,Parent\n\
Product Backlog Item,Monorepo & folders,"Create repo; apps/, packages/, infra/, docs/; README skeleton.","ResumePlatform","\\Sprint 1",{{ID:FEAT_A1}}\n\
Product Backlog Item,Next.js init,"Create web app; basic route; type tooling.","ResumePlatform","\\Sprint 1",{{ID:FEAT_A1}}\n\
Product Backlog Item,.NET API scaffold,"Minimal API project; solution files; healthz.","ResumePlatform","\\Sprint 1",{{ID:FEAT_A1}}\n\
Product Backlog Item,Docker Compose (Postgres),"Compose file for Postgres; volume; init script mount.","ResumePlatform","\\Sprint 1",{{ID:FEAT_A1}}\n\
Product Backlog Item,Makefile tasks,"make up/down/logs; local DX.","ResumePlatform","\\Sprint 1",{{ID:FEAT_A1}}\n\
\n\
Product Backlog Item,ResumeDoc schema (Zod),"Define JSON structure; shared-types package.","ResumePlatform","\\Sprint 1",{{ID:FEAT_A2}}\n\
Product Backlog Item,JSONB table + seed,"Create `resumes` table + seed `main`.","ResumePlatform","\\Sprint 1",{{ID:FEAT_A2}}\n\
\n\
Product Backlog Item,GET /resumes/:slug,"Query by slug; return JSON; error handling.","ResumePlatform","\\Sprint 1",{{ID:FEAT_A3}}\n\
Product Backlog Item,API integration test,"Smoke test for GET main.","ResumePlatform","\\Sprint 1",{{ID:FEAT_A3}}\n\
\n\
Product Backlog Item,SSR fetch from API,"Server component fetch; ENV `RESUME_API`.","ResumePlatform","\\Sprint 1",{{ID:FEAT_A4}}\n\
Product Backlog Item,Print CSS,"`@media print` styles for 1–2 page output.","ResumePlatform","\\Sprint 1",{{ID:FEAT_A4}}\n\
\n\
Product Backlog Item,PUT /resumes/:slug,"Upsert resume JSON; timestamps; validation.","ResumePlatform","\\Sprint 2",{{ID:FEAT_B1}}\n\
Product Backlog Item,Admin editor (dev-only),"Form for basics/experience; feature-flag dev.","ResumePlatform","\\Sprint 2",{{ID:FEAT_B1}}\n\
\n\
Product Backlog Item,GitHub OAuth,"Auth.js/NextAuth; restrict to your account.","ResumePlatform","\\Sprint 2",{{ID:FEAT_B2}}\n\
Product Backlog Item,Protect /admin routes,"Middleware; 403 for non-authorized.","ResumePlatform","\\Sprint 2",{{ID:FEAT_B2}}\n\
\n\
Product Backlog Item,PDF microservice,"Node+Playwright; POST /render accepts HTML.","ResumePlatform","\\Sprint 3",{{ID:FEAT_C1}}\n\
Product Backlog Item,PDF button + integration,"Web posts rendered HTML; stream download.","ResumePlatform","\\Sprint 3",{{ID:FEAT_C1}}\n\
\n\
Product Backlog Item,OTEL instrumentation,"API + web client spans; request IDs.","ResumePlatform","\\Sprint 3",{{ID:FEAT_C2}}\n\
Product Backlog Item,Local Collector,"Add OTEL Collector to compose; docs.","ResumePlatform","\\Sprint 3",{{ID:FEAT_C2}}\n\
Product Backlog Item,Trace ID in footer,"Expose last trace/span in UI.","ResumePlatform","\\Sprint 3",{{ID:FEAT_C2}}\n\
\n\
Product Backlog Item,Dockerfiles per app,"Web/API/PDF images with small base.","ResumePlatform","\\Sprint 3",{{ID:FEAT_C3}}\n\
Product Backlog Item,GH Actions CI,"Build/test; push images to GHCR.","ResumePlatform","\\Sprint 3",{{ID:FEAT_C3}}\n\
Product Backlog Item,Helm chart & ingress,"Single chart; values per component; TLS-ready.","ResumePlatform","\\Sprint 3",{{ID:FEAT_C3}}\n'
write_file "ado/02_pbis.csv" "$pbis_csv"

echo "Done. Next steps:"
echo "1) git init && git add . && git commit -m 'chore: scaffold repo structure'"
echo "2) docker compose -f infra/compose/docker-compose.yml up -d   # start Postgres"
echo "3) Open docs/series/S1E01.md and start your first post/video."