---
name: lib-db-dist declarations must be built before api-server tsc
description: The lib/* packages (db, integrations-openai-ai-server, api-zod) are composite TS projects whose dist/schema/index.d.ts must be up-to-date for api-server imports to resolve correctly.
---

# lib/db dist must be built before api-server tsc

## The rule
Before running `tsc --noEmit` in `artifacts/api-server`, build all referenced lib packages:
```
pnpm --filter @workspace/db exec tsc --build
pnpm --filter @workspace/integrations-openai-ai-server exec tsc --build
pnpm --filter @workspace/api-zod exec tsc --build
```

**Why:** `lib/db/dist/schema/index.d.ts` was `export {};` (empty/stale), causing every table import from `@workspace/db` to report "no exported member". The api-server tsconfig uses project references (`composite: true`), so TypeScript resolves types from dist/*.d.ts — not the source .ts files directly.

**How to apply:** Any time a task touches lib/* packages or the api-server tsconfig, rebuild the lib packages first. If tsc reports all @workspace/db symbols missing, the dist is stale — build it.

## Other patterns found during this fix
- Express async route handlers with `noImplicitReturns: true`: all branches must explicitly return. Fire-and-forget code after `return res.json()` is dead code — move it before the return or restructure.
- `eventsTable.date` is a `text` column. Never pass a `Date` object to `gte()`/`lt()`/`eq()` on it — use `.toISOString().slice(0, 10)` first.
- `partnerIdFromAuth()` returns `number | null`. After a null-guard `if (!partnerId) return`, TypeScript may not narrow `partnerId` in closures passed to `.then()`. Use `partnerId!` (non-null assertion) inside such callbacks.
