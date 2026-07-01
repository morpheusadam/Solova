# ---- deps: install node_modules with the lockfile ----
FROM node:22-slim AS deps
RUN corepack enable pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# ---- build: prisma client + next standalone ----
FROM node:22-slim AS build
RUN corepack enable pnpm
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 CI=true SKIP_ENV_VALIDATION=1
RUN pnpm prisma generate && pnpm build

# ---- runtime ----
# Migrations run in a one-shot compose service built from the `build` stage
# (full node_modules); this stage stays minimal (standalone output only).
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
RUN mkdir -p /data/uploads
EXPOSE 3000
CMD ["node", "server.js"]
