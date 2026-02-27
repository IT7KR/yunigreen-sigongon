# ──────────────────────────────────────────────────────────────
# Stage: deps — install all workspace dependencies
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
RUN pnpm install --frozen-lockfile

# ──────────────────────────────────────────────────────────────
# Stage: builder — build all packages + app
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY --from=deps /app ./
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY hooks ./hooks
COPY public ./public
COPY middleware.ts next.config.ts capacitor.config.ts ./
COPY postcss.config.mjs eslint.config.mjs tsconfig.json next-env.d.ts ./
COPY scripts ./scripts
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ──────────────────────────────────────────────────────────────
# Stage: admin — production runner
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS admin
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3033
CMD ["node", "server.js"]

# ──────────────────────────────────────────────────────────────
# Stage: dev — local development (hot reload, mounts)
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS dev
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
ENV NEXT_TELEMETRY_DISABLED=1
CMD ["pnpm", "dev"]
