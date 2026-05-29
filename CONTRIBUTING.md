# Contributing

This is primarily a personal portfolio project, but it's public as a reference
for how I structure things — issues and PRs are welcome.

## Ground rules

- **Discuss non-trivial changes first** via an issue before opening a large PR.
- **Keep the architecture intact.** The API stays a dumb JSON store; resolution
  and rendering logic live in the TypeScript tier (`packages/shared-types` +
  `apps/web`). See [`docs/adr/`](docs/adr) for the reasoning.
- **No PII.** Real resume content is local-only and gitignored
  (`infra/seed/`). Don't commit personal data or secrets.

## Development

See [docs/LOCAL_DEV.md](docs/LOCAL_DEV.md) to run the stack and
[docs/AUTH.md](docs/AUTH.md) for auth setup.

```bash
make dev                               # Postgres + API + web
npm run test --prefix apps/web         # web tests
npm run typecheck --prefix apps/web    # type check
make test                              # web + .NET (needs a Docker daemon)
```

## Pull requests

- Branch off `main`; keep PRs focused and small.
- CI (`.github/workflows/ci.yml`) must pass: it type-checks and tests the web app
  and builds + tests the .NET API.
- Update or add tests for behavior changes, and an ADR for architectural ones.
- Follow the existing code style (`.editorconfig`, ESLint, `dotnet format`).
