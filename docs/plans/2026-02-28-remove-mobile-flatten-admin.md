# Remove Mobile App & Flatten Admin to Frontend Root

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `frontend/apps/mobile` 삭제, `frontend/apps/admin`을 `frontend/` 루트로 평탄화, 관련 설정 파일 정리

**Architecture:**

- `frontend/` 자체가 Next.js 앱 (admin)이 되며, `packages/`는 그대로 워크스페이스 패키지로 유지
- `pnpm-workspace.yaml`은 `packages/*`만 선언, 루트가 암묵적으로 앱이 됨
- turbo는 패키지 빌드 순서 보장 용도로만 유지 (`prebuild`에서 호출)

**Tech Stack:** pnpm workspaces, Next.js 16, Turbo, Docker multi-stage, GitHub Actions, Playwright

---

## 사전 확인

현재 구조:

```
frontend/
  package.json        ← workspace root (name: sigongcore-frontend)
  pnpm-workspace.yaml ← apps/* + packages/*
  turbo.json
  playwright.config.ts
  Dockerfile
  scripts/dev-guard.mjs
  e2e/admin/, e2e/mobile/, e2e/helpers/
  apps/
    admin/            ← Next.js 앱 (@sigongcore/admin, port 3033)
    mobile/           ← Next.js 앱 (@sigongcore/mobile, port 3034) ← 삭제 대상
  packages/           ← 공유 패키지들 (@sigongcore/api, ui, types, ...)
  lib/                ← CLAUDE.md만 있음 (admin lib와 병합)
```

목표 구조:

```
frontend/
  package.json        ← admin 앱 + workspace root 병합 (@sigongcore/admin)
  pnpm-workspace.yaml ← packages/*만
  turbo.json          ← 유지
  playwright.config.ts ← admin 프로젝트만
  Dockerfile          ← admin 스테이지만, 경로 수정
  scripts/dev-guard.mjs ← port 3033만
  e2e/admin/, e2e/helpers/  ← mobile 삭제
  app/                ← admin의 app/ 이동
  components/         ← admin의 components/ 이동
  lib/                ← admin의 lib/ 이동 (기존 CLAUDE.md 유지)
  hooks/              ← admin의 hooks/ 이동
  public/             ← admin의 public/ 이동
  middleware.ts       ← admin의 middleware.ts 이동
  next.config.ts      ← admin의 next.config.ts 이동
  capacitor.config.ts ← admin의 capacitor.config.ts 이동
  postcss.config.mjs  ← admin의 postcss.config.mjs 이동
  eslint.config.mjs   ← admin의 eslint.config.mjs 이동
  tsconfig.json       ← admin의 tsconfig.json 이동
  packages/           ← 그대로
```

---

## Task 1: `frontend/apps/mobile` 삭제

**Files:**

- Delete: `frontend/apps/mobile/` (전체 디렉토리)

**Step 1: 삭제**

```bash
rm -rf /workspace/yunigreen-dev/frontend/apps/mobile
```

**Step 2: 확인**

```bash
ls /workspace/yunigreen-dev/frontend/apps/
# 결과: admin (mobile 없음)
```

**Step 3: Commit**

```bash
cd /workspace/yunigreen-dev
git add -A frontend/apps/mobile
git commit -m "🗑️ chore: mobile 앱 제거"
```

---

## Task 2: `frontend/e2e/mobile` 삭제

**Files:**

- Delete: `frontend/e2e/mobile/` (전체 디렉토리)

**Step 1: 삭제**

```bash
rm -rf /workspace/yunigreen-dev/frontend/e2e/mobile
```

**Step 2: 확인**

```bash
ls /workspace/yunigreen-dev/frontend/e2e/
# 결과: admin  helpers (mobile 없음)
```

**Step 3: Commit**

```bash
cd /workspace/yunigreen-dev
git add -A frontend/e2e/mobile
git commit -m "🗑️ chore: mobile E2E 테스트 제거"
```

---

## Task 3: admin 앱 파일들을 frontend 루트로 이동

단순 이동 가능한 파일/디렉토리 (충돌 없음):

**Files:**

- Move: `frontend/apps/admin/app/` → `frontend/app/`
- Move: `frontend/apps/admin/components/` → `frontend/components/`
- Move: `frontend/apps/admin/hooks/` → `frontend/hooks/`
- Move: `frontend/apps/admin/public/` → `frontend/public/`
- Move: `frontend/apps/admin/middleware.ts` → `frontend/middleware.ts`
- Move: `frontend/apps/admin/next.config.ts` → `frontend/next.config.ts`
- Move: `frontend/apps/admin/capacitor.config.ts` → `frontend/capacitor.config.ts`
- Move: `frontend/apps/admin/postcss.config.mjs` → `frontend/postcss.config.mjs`
- Move: `frontend/apps/admin/eslint.config.mjs` → `frontend/eslint.config.mjs`
- Move: `frontend/apps/admin/tsconfig.json` → `frontend/tsconfig.json`
- Move: `frontend/apps/admin/next-env.d.ts` → `frontend/next-env.d.ts`
- Move: `frontend/apps/admin/CAPACITOR_SETUP.md` → `frontend/CAPACITOR_SETUP.md`

**Step 1: 파일 이동**

```bash
cd /workspace/yunigreen-dev/frontend
mv apps/admin/app .
mv apps/admin/components .
mv apps/admin/hooks .
mv apps/admin/public .
mv apps/admin/middleware.ts .
mv apps/admin/next.config.ts .
mv apps/admin/capacitor.config.ts .
mv apps/admin/postcss.config.mjs .
mv apps/admin/eslint.config.mjs .
mv apps/admin/tsconfig.json .
mv apps/admin/next-env.d.ts .
mv apps/admin/CAPACITOR_SETUP.md .
```

**Step 2: `lib/` 이동 (충돌 주의 - 기존 lib/CLAUDE.md 보존)**

```bash
cd /workspace/yunigreen-dev/frontend
# admin의 lib/ 내용을 루트 lib/로 병합
cp -r apps/admin/lib/. lib/
rm -rf apps/admin/lib
```

**Step 3: `.env` 파일 이동**

```bash
cd /workspace/yunigreen-dev/frontend
# .gitignore된 파일이라 git에는 없지만 로컬에 있다면 이동
[ -f apps/admin/.env.local ] && mv apps/admin/.env.local .
[ -f apps/admin/.env.production.example ] && mv apps/admin/.env.production.example .
```

**Step 4: apps/admin의 남은 파일 확인 후 정리**

```bash
ls /workspace/yunigreen-dev/frontend/apps/admin/
# node_modules, .next, .turbo, .gitignore, CLAUDE.md 정도만 남아야 함
# CLAUDE.md는 이동
mv apps/admin/CLAUDE.md CLAUDE.md.admin  # 기존 CLAUDE.md와 충돌 방지, 필요시 수동 병합
```

**Step 5: apps/ 디렉토리 제거**

```bash
rm -rf /workspace/yunigreen-dev/frontend/apps
```

**Step 6: 이동 확인**

```bash
ls /workspace/yunigreen-dev/frontend/
# 결과: app, components, hooks, lib, public, packages, scripts, e2e,
#        middleware.ts, next.config.ts, capacitor.config.ts, tsconfig.json,
#        package.json, pnpm-workspace.yaml, turbo.json, playwright.config.ts, Dockerfile, ...
```

**Step 7: Commit**

```bash
cd /workspace/yunigreen-dev
git add -A
git commit -m "🔄 refactor: admin 앱을 frontend 루트로 평탄화"
```

---

## Task 4: `frontend/package.json` 병합

workspace root의 `package.json`을 admin 앱의 의존성과 병합.

**Files:**

- Modify: `frontend/package.json`

**Step 1: 새 `frontend/package.json` 작성**

```json
{
  "name": "@sigongcore/admin",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@10.14.0",
  "scripts": {
    "predev": "node scripts/dev-guard.mjs",
    "dev": "next dev --port 3033",
    "start": "next start --port 3033",
    "prebuild": "turbo build --filter='@sigongcore/*'",
    "build": "next build",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test:e2e": "playwright test",
    "test:e2e:admin": "playwright test --project=admin",
    "test:e2e:ui": "playwright test --ui"
  },
  "dependencies": {
    "@capacitor-firebase/messaging": "^7.3.0",
    "@capacitor/camera": "^7.0.0",
    "@capacitor/core": "^7.0.0",
    "@sigongcore/api": "workspace:*",
    "@sigongcore/features": "workspace:*",
    "@sigongcore/mocks": "workspace:*",
    "@sigongcore/platform": "workspace:*",
    "@sigongcore/types": "workspace:*",
    "@sigongcore/ui": "workspace:*",
    "@tanstack/react-query": "^5.90.16",
    "@tosspayments/payment-widget-sdk": "^0.12.1",
    "exceljs": "^4.4.0",
    "file-saver": "^2.0.5",
    "firebase": "^11.0.0",
    "framer-motion": "^12.0.5",
    "lucide-react": "^0.562.0",
    "next": "16.1.1",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@capacitor/android": "^7.0.0",
    "@capacitor/assets": "^3.0.0",
    "@capacitor/cli": "^7.0.0",
    "@capacitor/ios": "^7.0.0",
    "@playwright/test": "^1.57.0",
    "@tailwindcss/postcss": "^4",
    "@types/file-saver": "^2.0.7",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.1",
    "tailwindcss": "^4",
    "turbo": "^2.5.4",
    "typescript": "^5"
  }
}
```

---

## Task 5: `pnpm-workspace.yaml` 업데이트

**Files:**

- Modify: `frontend/pnpm-workspace.yaml`

**Step 1: 수정**

```yaml
packages:
  - "packages/*"
```

(`apps/*` 제거 — 루트 자체가 앱이므로 불필요)

---

## Task 6: `turbo.json` 확인 및 업데이트

**Files:**

- Modify: `frontend/turbo.json`

현재 turbo.json은 모든 워크스페이스 패키지에 적용. 루트가 앱이 된 후에도 `turbo build --filter='@sigongcore/*'`는 정상 작동함. turbo.json 자체는 변경 불필요.

단, `ui` 키가 `tui`로 설정되어 있으면 터미널 출력 관련 이슈가 있을 수 있음. 확인 후 유지.

**Step 1: 확인만**

```bash
cat /workspace/yunigreen-dev/frontend/turbo.json
```

---

## Task 7: `scripts/dev-guard.mjs` 업데이트

port 3034 (mobile) 참조 제거.

**Files:**

- Modify: `frontend/scripts/dev-guard.mjs`

**Step 1: 수정**

```diff
- const DEV_PORTS = [3033, 3034]; // admin, mobile
+ const DEV_PORTS = [3033]; // admin
```

**Step 2: 커밋에 포함 (Task 8과 함께)**

---

## Task 8: `playwright.config.ts` 업데이트

mobile 프로젝트 및 webServer 제거.

**Files:**

- Modify: `frontend/playwright.config.ts`

**Step 1: 수정 후 내용**

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: [
    {
      name: "admin",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3033",
      },
      testMatch: /admin\/.*.spec.ts/,
    },
  ],

  webServer: [
    {
      command: "pnpm dev",
      url: "http://localhost:3033",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
```

주의: `webServer.command`를 `pnpm --filter @sigongcore/admin dev`에서 `pnpm dev`로 변경 (루트에서 직접 실행).

---

## Task 9: `Dockerfile` 업데이트

mobile 스테이지 제거, admin 스테이지 경로 수정 (apps/admin → 루트).

**Files:**

- Modify: `frontend/Dockerfile`

**Step 1: 수정 후 내용**

```dockerfile
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
# 앱 소스 복사 (apps/ 없이 루트에서 직접)
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY hooks ./hooks
COPY public ./public
COPY middleware.ts next.config.ts capacitor.config.ts ./
COPY postcss.config.mjs eslint.config.mjs tsconfig.json next-env.d.ts ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ──────────────────────────────────────────────────────────────
# Stage: admin — production runner
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS admin
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# standalone 출력이 루트 기준으로 생성됨
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
```

주의:

- `COPY apps ./apps` → 제거 (앱이 루트이므로)
- admin 스테이지: `apps/admin/.next/standalone` → `.next/standalone`
- `CMD ["node", "apps/admin/server.js"]` → `CMD ["node", "server.js"]`

---

## Task 10: `docker-compose.yml` 업데이트

`frontend-mobile` 서비스 제거, `NEXT_PUBLIC_MOBILE_APP_URL` env 제거.

**Files:**

- Modify: `docker-compose.yml` (repo root)

**Step 1: `frontend-mobile` 서비스 전체 제거**

`frontend-mobile:` 블록 전체 삭제.

**Step 2: `frontend-admin` 서비스에서 `NEXT_PUBLIC_MOBILE_APP_URL` 제거**

```diff
  frontend-admin:
    build:
      context: ./frontend
      target: admin
    container_name: sigongcore-admin
    ports:
      - "3133:3033"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000/api/v1
      - NEXT_PUBLIC_USE_MOCKS=false
      - NEXT_PUBLIC_REAL_DOMAINS=
-     - NEXT_PUBLIC_MOBILE_APP_URL=http://localhost:3134
      - NEXT_PUBLIC_TOSS_CLIENT_KEY=${NEXT_PUBLIC_TOSS_CLIENT_KEY:-test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq}
    depends_on:
      - backend
```

---

## Task 11: `.github/workflows/ci.yml` 업데이트

`NEXT_PUBLIC_MOBILE_APP_URL` env 제거.

**Files:**

- Modify: `.github/workflows/ci.yml`

**Step 1: 해당 env 제거**

```diff
        env:
          NEXT_TELEMETRY_DISABLED: "1"
          NEXT_PUBLIC_USE_MOCKS: "true"
          NEXT_PUBLIC_API_URL: "http://localhost:8000/api/v1"
          NEXT_PUBLIC_TOSS_CLIENT_KEY: "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq"
-         NEXT_PUBLIC_MOBILE_APP_URL: "http://localhost:3034"
          NEXT_PUBLIC_REAL_DOMAINS: ""
```

---

## Task 12: `pnpm install` — lock 파일 재생성

워크스페이스 구조 변경으로 `pnpm-lock.yaml` 재생성 필요.

**Step 1: 설치**

```bash
cd /workspace/yunigreen-dev/frontend
pnpm install
```

Expected: lock 파일 업데이트, 오류 없음.

**Step 2: Commit**

```bash
cd /workspace/yunigreen-dev
git add frontend/pnpm-lock.yaml frontend/package.json frontend/pnpm-workspace.yaml \
  frontend/turbo.json frontend/scripts/dev-guard.mjs frontend/playwright.config.ts \
  frontend/Dockerfile docker-compose.yml .github/workflows/ci.yml
git commit -m "🔧 chore: mobile 제거 및 admin 평탄화에 따른 설정 파일 정리"
```

---

## Task 13: 빌드 검증

**Step 1: 타입체크**

```bash
cd /workspace/yunigreen-dev/frontend
pnpm typecheck
```

Expected: 오류 없음

**Step 2: 빌드**

```bash
cd /workspace/yunigreen-dev/frontend
pnpm build
```

Expected: admin 앱 빌드 성공

**Step 3: 개발서버 확인**

```bash
cd /workspace/yunigreen-dev/frontend
pnpm dev
# http://localhost:3033 접속 확인
```

---

## 주요 주의사항

1. **tsconfig.json `paths`**: admin의 tsconfig는 `"@/*": ["./*"]`로 설정. 루트로 이동 후에도 동일하게 유지되므로 변경 불필요.

2. **Next.js standalone output 경로**: admin이 워크스페이스 서브패키지일 때 `.next/standalone/apps/admin/server.js`로 생성되었으나, 루트로 이동 후 `.next/standalone/server.js`로 생성됨. Dockerfile의 CMD를 반드시 수정해야 함.

3. **`next.config.ts`의 `outputFileTracingRoot`**: admin의 next.config.ts에서 standalone output path를 명시적으로 설정한 경우 확인 필요. 제거하거나 `"."` 으로 수정.

4. **`apps/admin` 내부 .gitignore**: admin의 `.gitignore`가 있다면 내용을 루트 `.gitignore`에 병합.

5. **`NEXT_PUBLIC_MOBILE_APP_URL` 코드 참조**: admin 소스 코드 내에서 이 변수를 사용하는 코드가 있다면 제거 필요. 이동 전 확인:
   ```bash
   grep -r "MOBILE_APP_URL" frontend/apps/admin/
   ```
