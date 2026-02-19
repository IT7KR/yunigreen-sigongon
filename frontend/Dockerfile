# ──────────────────────────────────────────────────────────────
# Stage: deps — install all workspace dependencies
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --frozen-lockfile

# ──────────────────────────────────────────────────────────────
# Stage: builder — build all packages + apps
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY --from=deps /app ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ──────────────────────────────────────────────────────────────
# Stage: admin — production runner for admin app
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS admin
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /app/apps/admin/public ./apps/admin/public
EXPOSE 3033
CMD ["node", "apps/admin/server.js"]

# ──────────────────────────────────────────────────────────────
# Stage: mobile — production runner for mobile app
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS mobile
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/mobile/.next/standalone ./
COPY --from=builder /app/apps/mobile/.next/static ./apps/mobile/.next/static
COPY --from=builder /app/apps/mobile/public ./apps/mobile/public
EXPOSE 3034
CMD ["node", "apps/mobile/server.js"]

# ──────────────────────────────────────────────────────────────
# Stage: dev — local development (hot reload, mounts)
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS dev
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps ./apps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
ENV NEXT_TELEMETRY_DISABLED=1
CMD ["pnpm", "dev"]
