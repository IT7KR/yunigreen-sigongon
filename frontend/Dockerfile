FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages ./packages
COPY apps ./apps

RUN pnpm install --frozen-lockfile

ENV NEXT_TELEMETRY_DISABLED=1

CMD ["pnpm", "dev"]
