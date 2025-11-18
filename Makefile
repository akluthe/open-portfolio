\
.PHONY: up down logs ps db api web api-test web-test test dev

COMPOSE=infra/compose/docker-compose.yml
API_PROJECT=apps/api-resume/api-resume.csproj
API_TEST_PROJECT=apps/api-resume.tests/api-resume.tests.csproj
WEB_DIR=apps/web
RESUME_API ?= http://localhost:5152
FEATURE_ADMIN_EDITING=true

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
	docker exec -it resume-platform-postgres-1 psql -U postgres -d resume

api:
	dotnet watch run --project $(API_PROJECT)

web:
	RESUME_API=$(RESUME_API) FEATURE_ADMIN_EDITING=$(FEATURE_ADMIN_EDITING) npm run dev --prefix $(WEB_DIR)

api-test:
	dotnet test $(API_TEST_PROJECT)

web-test:
	RESUME_API=$(RESUME_API) npm run test --prefix $(WEB_DIR)

test: api-test web-test
