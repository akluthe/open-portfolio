# syntax=docker/dockerfile:1
# Next.js web app — multi-stage build producing a lean standalone server.
# Build context MUST be the repo root (the app depends on packages/shared-types
# via a file: path and next.config sets outputFileTracingRoot to the repo root):
#   docker build -f apps/web/Dockerfile -t resume-web .

FROM node:20-bookworm-slim AS builder
WORKDIR /repo
ENV NEXT_TELEMETRY_DISABLED=1
# shared-types is a file: dependency whose REAL source (.ts files) must be present
# before install so the node_modules symlink resolves to actual files — install in
# this stage rather than copying node_modules across stages (the symlink doesn't
# survive that cleanly with transpilePackages + Turbopack).
COPY packages/shared-types ./packages/shared-types
# shared-types imports zod; it must resolve from the package's own node_modules
# (Turbopack resolves the file: symlink to its realpath, /repo/packages/shared-types).
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefix packages/shared-types
# Manifests first so the web `npm ci` is cached unless deps change.
COPY apps/web/package.json apps/web/package-lock.json ./apps/web/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefix apps/web
# App source (node_modules excluded via .dockerignore, so the install above survives).
COPY apps/web ./apps/web
# Clerk's publishable key is inlined into the client bundle at build time, so it
# must be present now (not just at runtime). Pass with --build-arg.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
RUN npm run build --prefix apps/web

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs
# Standalone output bundles only the traced server + node_modules.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
# The Typst PDF pipeline reads these at runtime from process.cwd() (= /app), so
# they are NOT captured by Next's static output tracing — copy them explicitly.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/fonts ./fonts
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/templates ./templates
USER nextjs
EXPOSE 3000
# server.js is launched from /app, so process.cwd() resolves /app/fonts + /app/templates.
CMD ["node", "apps/web/server.js"]
