# KOL BOOKING — KNOWLEDGE BASE

**Generated:** 2026-08-01
**Commit:** 2d090a2
**Branch:** main

## OVERVIEW
Creator Service Marketplace MVP (SRS-CM-MVP-1.0) — direct booking between local brands and nano/micro/UGC creators. npm-workspaces monorepo: `client/` (React 19 + Vite + TS) + `server/` (Express 5 + TS REST API `/api/v1`). ~104 files / ~9k LOC. Comments, tests, and README are written in **Vietnamese**; requirement codes (`AUTH-xxx`, `CRE-xxx`, `SEC-xxx`, `SRCH-xxx`) cite the SRS spec.

## STRUCTURE
```
kolbooking/
├── package.json       # npm workspaces: [client, server]; concurrently dev
├── README.md          # authoritative architecture doc (Vietnamese) — read it first
├── client/            # React 19 SPA — see client/AGENTS.md
│   └── src/           #   main.tsx → app/ → pages/ → features/<feature>/ → shared/
└── server/            # Express 5 REST API — see server/AGENTS.md
    ├── src/           #   index.ts → app.ts → routes/v1.ts → modules/<domain>/
    └── tests/         #   centralized API/unit tests (outside src/)
```

## WHERE TO LOOK
| Task | Location |
|------|----------|
| Architecture/roadmap (Epic E0–E7) | `README.md` |
| Server entry / DI composition (swap repos for PostgreSQL) | `server/src/index.ts` |
| Express wiring (helmet, CORS, rate limit) | `server/src/app.ts` |
| Mount a new module (add 1 line) | `server/src/routes/v1.ts` |
| Reference module — copy this structure | `server/src/modules/creators/` |
| New module template — creators đã mở rộng (userId, review queue, portfolio/avatar + FileStorage, audit) | `server/src/modules/creators/`, `server/src/shared/storage/file-storage.ts` |
| Client entry / provider+router composition | `client/src/main.tsx`, `client/src/app/App.tsx` |
| Route definitions | `client/src/app/routes.tsx` |
| Axios client + auth session (refresh on 401) | `client/src/shared/api/` |
| API envelope + error types | `server/src/shared/http/api-response.ts`, `client/src/shared/api/api-types.ts` |

## CONVENTIONS
- **ESM everywhere** (`"type": "module"` in both workspaces). Server imports MUST use `.js` extensions (NodeNext); client uses extensionless (bundler).
- **Response envelope** everywhere: `{ success, data, error, meta? }`; stable `error.code`; `error.details[]` on validation failure.
- **Request flow**: `routes → validate (Zod) → controller → service → repository`; errors flow through shared error-handler; `ApiError` factories (`badRequest/unauthorized/...`) in `server/src/shared/errors/api-error.ts`.
- **Repository pattern**: interfaces (`*.repository.ts`) + in-memory impls (`*.repository.memory.ts`). PostgreSQL impls = planned swap point. Creators module now also wires `FileStorage` (uploads) + `AuditRepository` (admin actions) via DI in `server/src/index.ts` — new modules needing files/audit copy that composition.
- **Server TS is strict** (+ `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); **client TS is NOT strict** (but `verbatimModuleSyntax` + `erasableSyntaxOnly` — no enums, `import type` required). Don't "fix" the asymmetry.
- **Files/folders kebab-case**; server module files `domain.layer.ts` (`creator.repository.memory.ts`); factory exports `createXxxRouter`; constants `SCREAMING_SNAKE`.
- **Auth**: access token JWT in memory (client) — NEVER localStorage; opaque refresh token in httpOnly cookie, rotated per refresh; scrypt passwords; RBAC `requireAuth` + `requireRole(...)`.
- Filter/search state on URL (`useSearchParams`) — shareable links (SRCH-003).
- Lint = oxlint, **client only**. Server relies on `typecheck` (no lint config).
- **Dev processes chạy background**: luôn chạy `npm run dev` / server / client dưới dạng **background process** (ví dụ `Start-Process cmd.exe -ArgumentList '/c','npm run dev'` với stdout/stderr redirect ra file log trong temp, hoặc `Start-Job`) — KHÔNG chạy foreground vì sẽ block luồng chat. Logs ghi ra file (ví dụ `C:\Users\Thanh\AppData\Local\Temp\opencode\kolbooking-dev\dev4-{out,err}.log`) để đọc sau.

## ANTI-PATTERNS (THIS PROJECT)
- **NEVER leak `passwordHash`, internal `status`, or PII** in DTOs/mappers (CRE-009). Mappers exist precisely to strip these.
- **NEVER store access tokens in localStorage** (XSS — AUTH-006).
- **NEVER mutate source data** — repositories return copies (immutability).
- **NEVER hardcode password hashes** in seed source; compute at boot.
- **NEVER reveal whether an email exists** in auth errors — uniform messages.
- **NEVER add interceptors to the bare refresh client** (infinite loop).
- **ALWAYS** revoke old refresh token before issuing new (rotation/replay).
- **ALWAYS** server-side money/logic, Zod validation at boundary, rate limit, redacted logs, mandatory pagination.
- No `TODO`/`FIXME`/`DEPRECATED` markers exist — the DO-NOT rules live in Vietnamese comments; respect them.

## UNIQUE STYLES
- Vietnamese code comments + Vietnamese test descriptions citing SRS IDs (e.g. `(AUTH-005)`).
- `creators` module is the canonical end-to-end template — new modules copy it exactly.
- Demo accounts seeded only when `NODE_ENV !== 'production'` (`creator@demo.vn` / `brand@demo.vn` / `admin@demo.vn`, pw `Demo@1234`).
- `client/README.md` is stale Vite boilerplate — ignore it.

## COMMANDS
```bash
npm install              # install all workspaces (Node >= 20 required)
npm run dev              # server :4000 + client :5173 (concurrently)
npm run dev:server       # tsx watch (hot reload)
npm run dev:client       # vite, proxies /api → :4000
npm test                 # server vitest, then client vitest
npm run build            # server tsc, then client tsc -b && vite build
npm run lint             # CLIENT ONLY (oxlint)
npm run typecheck -w server
```

## NOTES
- **No CI/CD, no Docker, no deploy config** — buildable/testable locally only. Deploy would be `npm run build` + `npm start -w server` + static host for `client/dist/`.
- `server/.env.example` → `server/.env` (defaults valid; Zod fail-fast at boot; production throws if `JWT_SECRET` unchanged, >= 32 chars).
- Ports: server 4000 (`PORT`), client 5173; CORS whitelist must include the client origin.
- New module checklist: create `server/src/modules/<tên>/` per creators template → mount 1 line in `routes/v1.ts` → (future) add `*.repository.postgres.ts`.
