---
name: nostress-web CRA startup fix
description: CRA 5 + webpack-dev-server v4 + Node v24 incompatibility; serve-build.cjs is the working solution for Replit workflow.
---

## Problem

CRA 5 (`react-scripts@5`) + webpack-dev-server v4 + Node v24 causes **multiple hangs** that prevent the dev server from opening its port within Replit's 300-second workflow timeout.

**Root cause:** `path-to-regexp` v8 (pulled in by Node v24 toolchain) removed `pathRegexp()` which Express v4 (used internally by WDS v4) requires. Every `app.all()`, `app.get()`, and `app.use()` call with any path pattern silently hangs. This affects:
- `setupHostHeaderCheck()` — uses `app.all("*", handler)`
- `setupBuiltInRoutes()` — uses `app.get('/path', handler)`
- `setupMiddlewares()` — uses various `app.use()` calls

**Secondary issue:** webpack compilation blocks the Node.js event loop. Even with a warm babel-loader cache (~10–25 s locally), in the workflow context with competing workflows (API server, Expo, admin) consuming CPU, compilation reliably exceeds 300 s.

## Solution

**`artifacts/nostress-web/serve-build.cjs`** — a pure Node.js `http` module static file server that:
1. Opens port in < 1 second (no webpack)
2. Serves the production build from `artifacts/nostress-web/build/`
3. Handles `PUBLIC_URL=/nostress-web` path prefix routing
4. SPA fallback: all non-asset routes → `index.html`

The `dev` script in `package.json` now uses:
```
"dev": "cross-env HOST=0.0.0.0 PORT=25266 node ./serve-build.cjs"
```

**When the production build needs to be refreshed** (after code changes to nostress-web):
```bash
cd artifacts/nostress-web && pnpm run build:replit
# then restart the workflow
```

## What NOT to use

- `dev-server.cjs` with patched WDS: various prototype patches were tried but `setupBuiltInRoutes` always hung unless `setupDevMiddleware` (webpack) ran first — which blocks the event loop and defeats the purpose.
- `wds-hostcheck-shim.cjs` with `--require`: same underlying hang; patching only `setupHostHeaderCheck` fixes the first hang but other route registrations also hang.

**Why:**
- All `app.get/use/all()` calls hang with path-to-regexp v8 + Express v4, not just `app.all("*")`
- After `setupDevMiddleware()` (webpack) runs, the path-to-regexp issue disappears — possibly because webpack loads a compatible version into the require cache — but webpack blocks the event loop for the entire compilation duration
- SIGKILL on workflow failure corrupts the webpack filesystem cache, making each restart a cold start

## Files

- `artifacts/nostress-web/serve-build.cjs` — production-build static server (active)
- `artifacts/nostress-web/dev-server.cjs` — kept for reference; not used in dev script
- `artifacts/nostress-web/tailwind-resolve-shim.cjs` — still needed for `build:replit` script
- `artifacts/nostress-web/wds-hostcheck-shim.cjs` — kept for reference; not active
