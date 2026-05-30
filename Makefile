.PHONY: up down logs ps db api web api-test web-test test dev seed seed-profile migrate

COMPOSE=infra/compose/docker-compose.yml
API_PROJECT=apps/api-resume/api-resume.csproj
API_TEST_PROJECT=apps/api-resume.tests/api-resume.tests.csproj
WEB_DIR=apps/web
RESUME_API ?= http://localhost:5152
FEATURE_ADMIN_EDITING=true
PG_CONTAINER=resume-platform-postgres-1
SEED_FILE=infra/seed/resume-main.json
PROFILE_SLUG ?= databank-engmgr
PROFILE_FILE ?= infra/seed/databank-tailoring.json

up:
	docker compose -f $(COMPOSE) up -d
	docker compose -f $(COMPOSE) ps

e2e:
	# placeholder for future end-to-end script

dev: up
	$(MAKE) -j2 api web

logs:
	docker compose -f $(COMPOSE) logs -f --tail=200

ps:
	docker compose -f $(COMPOSE) ps

down:
	docker compose -f $(COMPOSE) down -v

db:
	docker exec -it $(PG_CONTAINER) psql -U postgres -d resume

# Apply schema migrations to the local stack in order. Each file is idempotent
# (CREATE ... IF NOT EXISTS + guarded backfills), so re-running is safe. For prod,
# run the same files against the live container as the owning role (see docs/DEPLOY.md).
migrate:
	@for f in infra/postgres/migrations/*.sql; do \
	  echo "Applying $$f ..."; \
	  docker exec -i $(PG_CONTAINER) psql -U postgres -d resume -v ON_ERROR_STOP=1 < $$f || exit 1; \
	done
	@echo "Migrations applied."

# Load the local (gitignored) master resume into the 'main' slug. Idempotent upsert.
# The seed file is local-only (real PII) and not committed; see infra/seed/README.md.
seed:
	@test -f $(SEED_FILE) || { echo "Missing $(SEED_FILE) — local-only seed, not in git."; exit 1; }
	@{ printf "SET client_encoding TO 'UTF8';\nINSERT INTO resumes(slug, doc, last_mod_tsp) VALUES ('main', \$$seed\$$"; \
	   cat $(SEED_FILE); \
	   printf "\$$seed\$$::jsonb, NOW()) ON CONFLICT (slug) DO UPDATE SET doc = EXCLUDED.doc, last_mod_tsp = NOW();\n"; \
	 } | docker exec -i $(PG_CONTAINER) psql -U postgres -d resume -v ON_ERROR_STOP=1
	@echo "Seeded 'main' from $(SEED_FILE)."

# Load a local (gitignored) tailoring overlay into the profiles table. Idempotent
# upsert. Override PROFILE_SLUG / PROFILE_FILE for other tailorings. The committed
# init.sql only seeds a bare example overlay; the real, fully-tailored overlay is
# local-only and must be loaded this way (or it shows up barely tailored).
seed-profile:
	@test -f $(PROFILE_FILE) || { echo "Missing $(PROFILE_FILE) — local-only seed, not in git."; exit 1; }
	@{ printf "SET client_encoding TO 'UTF8';\nINSERT INTO profiles(slug, doc) VALUES ('$(PROFILE_SLUG)', \$$seed\$$"; \
	   cat $(PROFILE_FILE); \
	   printf "\$$seed\$$::jsonb) ON CONFLICT (slug) DO UPDATE SET doc = EXCLUDED.doc, last_mod_tsp = NOW();\n"; \
	 } | docker exec -i $(PG_CONTAINER) psql -U postgres -d resume -v ON_ERROR_STOP=1
	@echo "Seeded profile '$(PROFILE_SLUG)' from $(PROFILE_FILE)."

api:
	dotnet watch run --project $(API_PROJECT)

web:
	RESUME_API=$(RESUME_API) FEATURE_ADMIN_EDITING=$(FEATURE_ADMIN_EDITING) npm run dev --prefix $(WEB_DIR)

api-test:
	dotnet test $(API_TEST_PROJECT)

web-test:
	RESUME_API=$(RESUME_API) npm run test --prefix $(WEB_DIR)

test: api-test web-test
