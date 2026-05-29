\
.PHONY: up down logs ps db api web api-test web-test test dev seed

COMPOSE=infra/compose/docker-compose.yml
API_PROJECT=apps/api-resume/api-resume.csproj
API_TEST_PROJECT=apps/api-resume.tests/api-resume.tests.csproj
WEB_DIR=apps/web
RESUME_API ?= http://localhost:5152
FEATURE_ADMIN_EDITING=true
PG_CONTAINER=resume-platform-postgres-1
SEED_FILE=infra/seed/resume-main.json

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

# Load the local (gitignored) master resume into the 'main' slug. Idempotent upsert.
# The seed file is local-only (real PII) and not committed; see infra/seed/README.md.
seed:
	@test -f $(SEED_FILE) || { echo "Missing $(SEED_FILE) — local-only seed, not in git."; exit 1; }
	@{ printf "SET client_encoding TO 'UTF8';\nINSERT INTO resumes(slug, doc, last_mod_tsp) VALUES ('main', \$$seed\$$"; \
	   cat $(SEED_FILE); \
	   printf "\$$seed\$$::jsonb, NOW()) ON CONFLICT (slug) DO UPDATE SET doc = EXCLUDED.doc, last_mod_tsp = NOW();\n"; \
	 } | docker exec -i $(PG_CONTAINER) psql -U postgres -d resume -v ON_ERROR_STOP=1
	@echo "Seeded 'main' from $(SEED_FILE)."

api:
	dotnet watch run --project $(API_PROJECT)

web:
	RESUME_API=$(RESUME_API) FEATURE_ADMIN_EDITING=$(FEATURE_ADMIN_EDITING) npm run dev --prefix $(WEB_DIR)

api-test:
	dotnet test $(API_TEST_PROJECT)

web-test:
	RESUME_API=$(RESUME_API) npm run test --prefix $(WEB_DIR)

test: api-test web-test
