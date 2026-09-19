# GetItDone

> **Cancel free, as long as we fill your spot.**

A re-scheduling and waitlist web app bridging clients and small local businesses (barbers, salons, spas, plumbers, electricians, etc.). When a booked slot opens up, the app "calls" the waitlist in order, holds the slot while the person decides, and never double-books.

**Hackathon demo — local only.**

---

## Setup

```powershell
# 1. Clone and enter the repo
git clone <repo-url>
cd getitdone

# 2. Copy environment file and fill in values (optional — app runs without a key)
Copy-Item server\.env.example server\.env

# 3. Install all workspaces
npm install

# 4. Start everything (server + client)
npm run dev
```

Open **http://127.0.0.1:5173** in your browser.

> Dev machine is Windows + PowerShell — see [AGENTS.md](./AGENTS.md#environment-windows)
> for terminal conventions (no bash-only commands, one command per line, etc.)
> and for the two-browser-context tip when testing two roles at once.

---

## Run Commands

| Command | Description |
|---|---|
| `npm run dev` | Start server (port 8787) and client (port 5173) concurrently |
| `npm test` | Run Vitest in all three workspaces |
| `npm run typecheck` | TypeScript check across all workspaces |
| `npm run build` | Build server and client for production |
| `npm start` | Run the production build (Express serves built client) |
| `npm run check:security` | Run security audit script |

---

## Environment Variables

All vars live in **`server/.env`** (gitignored). Copy from `server/.env.example`.

| Variable | Default | Description |
|---|---|---|
| `ELEVENLABS_API_KEY` | _(empty)_ | ElevenLabs API key. Leave blank → voice disabled, silent demo mode. **Never commit this.** |
| `ELEVENLABS_VOICE_ID` | _(empty)_ | ElevenLabs voice ID to use for outbound calls |
| `ELEVENLABS_MODEL_ID` | `eleven_turbo_v2_5` | ElevenLabs TTS model |
| `DEMO_MODE` | `true` | Seed fake data and skip real telephony |
| `DEMO_FAST` | `false` | Shorten call timeout to 12 s for rapid demos |
| `CALL_TIMEOUT_SECONDS` | `30` (or `12` if `DEMO_FAST`) | How long a slot is held while a waitlist contact decides |
| `BUSINESS_PROVIDER` | `mock` | `mock` = seeded fake data; `crawler` = web-crawler agent |

> **HOST and PORT are not in `.env`.** The server always binds `127.0.0.1:8787`. This is enforced in code and cannot be overridden.

---

## Stack

| Area | Technology |
|---|---|
| **Client** | Vite 5, React 18, TypeScript, Tailwind CSS v4, Framer Motion, lucide-react, Inter Variable font |
| **Server** | Node 20+, Express 4, TypeScript via tsx, Zod, helmet, express-rate-limit |
| **Shared** | TypeScript interfaces + Zod schemas (`shared/src/index.ts`) |
| **Tests** | Vitest in each workspace |

---

## Security Posture

> These rules are enforced in every milestone and must never be violated.

- **Server binds `127.0.0.1:8787`. Vite binds `127.0.0.1:5173` with `strictPort`.** Never `--host`, `0.0.0.0`, or `host: true`. No CORS: the browser talks to `/api` through the Vite proxy. The URL is `http://127.0.0.1:5173`.
- **Secrets (`ELEVENLABS_API_KEY`) live only in `server/.env`** (gitignored). Never `VITE_`-prefixed, never sent to the client, never logged.
- **All data is fake.** No real PII. NO real telephony or SMS: "calls" are on-screen UI plus browser audio. No analytics, no tunnels, no third-party requests except the server's ElevenLabs call.
- **Strict Zod validation on every request.** Role and ownership checks server-side. Never use `dangerouslySetInnerHTML`; render external strings as plain text.

Run `npm run check:security` to verify these invariants automatically.

---

## Workspace Layout

```
getitdone/
├── client/          # Vite + React 18 + Tailwind frontend
│   └── src/
│       ├── App.tsx
│       └── main.tsx
├── server/          # Express + tsx backend
│   ├── .env.example
│   └── src/
│       ├── config.ts       # Typed config, redact helper
│       ├── app.ts          # Express app factory
│       ├── index.ts        # Entry point (binds 127.0.0.1:8787)
│       ├── middleware/
│       │   ├── logger.ts
│       │   └── errorHandler.ts
│       └── routes/
│           └── health.ts
├── shared/          # Shared TypeScript types + Zod schemas
│   └── src/index.ts
├── scripts/
│   └── check-security.mjs
└── package.json     # npm workspaces root
```

---

## Assumptions

<!-- Ambiguity decisions logged here instead of asking -->

- **Tailwind v4**: Used `@tailwindcss/vite` plugin + `@import "tailwindcss"` in CSS (v4 approach). No separate `tailwind.config.js` needed for v4. If tooling conflicts arise in later milestones, will fall back to Tailwind v3.4 and note it here.
- **Shared package**: Rather than a full TypeScript project-reference build, `shared/src/index.ts` is consumed directly by both client and server via `paths` aliases in each `tsconfig.json`. This avoids a build step for shared in dev.
- **Server tests**: Using `supertest` to test the Express app in-process — no real socket needed.
- **`start` script**: Per milestone spec ("Express serves the built client"), `npm start` runs the server which would serve `client/dist` as static files. The static-file serving middleware will be added in the build milestone; for now `start` starts the API server only.
- **HOST not in .env**: The dispatch team starter allows `HOST` to be overridden by env. GetItDone spec explicitly forbids this — `HOST` is a hardcoded constant in `server/src/config.ts`.
