\
.PHONY: up down logs ps db

COMPOSE=infra/compose/docker-compose.yml

up:
	docker compose -f $(COMPOSE) up -d
	docker compose -f $(COMPOSE) ps

e2e:
	# placeholder for future end-to-end script

logs:
	docker compose -f $(COMPOSE) logs -f --tail=200

ps:
	docker compose -f $(COMPOSE) ps

down:
	docker compose -f $(COMPOSE) down -v

db:
	docker exec -it resume-platform-postgres-1 psql -U postgres -d resume
