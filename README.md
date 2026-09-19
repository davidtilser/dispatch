# Dispatch

**Cancel free, as long as we fill your spot.**

When a customer cancels, a voice agent calls the shop's waitlist one person at a time. The first acceptance gets booked; the original customer's fee is waived after the slot is refilled. The business pays a percentage of the recovered booking (5–10%, TBD).

This repository is a **team starter**, not an implemented demo. It contains a running NestJS health endpoint, a React placeholder, and TypeScript integration contracts. Crawling, calls, calendar, waitlist, booking, and fee handling still need implementation.

## Agreed stack

| Area | Technology |
| --- | --- |
| Language | TypeScript everywhere in application code |
| Workspace | npm workspaces; one repo, shared packages |
| Backend | NestJS 12 on Node.js 24, default Express adapter |
| Dashboard | React 19 + Vite 7 |
| Shared validation | Zod 4 and TypeScript contracts |
| Crawl + manager agents | TypeScript; agent/LLM SDK chosen by Lucas |
| Voice | ElevenLabs Agents + connected telephony number; adapter to implement |
| Calendar + waitlist | In-memory mocks for the demo; adapter to implement |
| Dashboard updates | Start with polling run status; SSE can follow if needed |

No database, Redis, queue, microservices, or custom audio streaming required for the starter. The voice worker is a logical adapter in the API process for now, not another deployed service.

## Start

Use Node 24 (`nvm use` if you use nvm).

```sh
npm ci
cp .env.example .env
npm run dev
```

- Dashboard: http://localhost:5173
- API health: http://127.0.0.1:3001/api/health
- Check types and build: `npm run check`

Run commands from the repository root. The dev command builds shared packages, watches TypeScript, restarts the API on compiled changes, and starts Vite. TypeScript compilation preserves Nest's decorator metadata. Vite proxies `/api` to port 3001; update its proxy if you change the API port. No API keys are needed to run the starter.

## Ownership

```text
apps/
  api/src/
    business/       Nest module for importing shop information
    refill/         Nest module for cancellation and refill orchestration
    voice/          Nest module for voice callbacks and agent tools
  web/src/          Dashboard owner: React UI
packages/
  agents/src/       Lucas: crawler.ts and manager.ts
  voice/src/        Voice owner: ElevenLabs adapter and callback normalization
  data/src/         Backend owner: mock calendar and waitlist repository
  contracts/src/    Shared payloads; coordinate changes across owners
docs/
  demo.md           Slides/business owner: story, business model, demo checklist
```

Nest modules are empty wiring points. Implement agents as regular TypeScript classes in `packages/agents`, then provide them through Nest services/factory providers in `apps/api`. Keep ElevenLabs-specific code in `packages/voice`; keep browser code and all secrets separate.

TypeScript interfaces disappear at runtime. When injecting an interface in Nest, use a symbol/string provider token with `@Inject(...)`, or inject a concrete service class.

## Target flow and handoffs

1. Dashboard submits a shop URL → Nest business module → Lucas's `CrawlAgent` → `BusinessProfile`.
2. Dashboard cancels a seeded 3pm slot → Nest refill module → `ManagerAgent`.
3. Manager reads the mock waitlist through `BookingRepository`, then requests one call through `VoiceGateway`.
4. Voice adapter receives authenticated provider events/tools and maps them to a `CallOutcome` with run and attempt IDs.
5. Decline/no answer advances the waitlist. Acceptance checks availability, books once, then waives the original fee.
6. Dashboard polls the run and displays calls, booking, and fee status.

Suggested routes to implement together (only health exists today):

| Route | Owner / purpose |
| --- | --- |
| `POST /api/business/import` | Lucas: URL → business profile |
| `POST /api/slots/:slotId/cancel` | Lucas/backend: cancel and start one refill run |
| `GET /api/refills/:runId` | Backend: dashboard status |
| `POST /api/voice/webhook` | Voice: verified provider outcomes |
| `POST /api/voice/tools/check-availability` | Voice/backend: negotiated time check |
| `POST /api/voice/tools/accept-slot` | Voice/backend: confirm a booking during the call |

The manager owns state transitions. A call-start response is not a booking. Enforce one active attempt, idempotent callbacks/cancellation, first acceptance wins, and fee waiver only after booking success. A request for 3:30 is accepted only if the mock calendar explicitly permits it. On ambiguous call failures, reconcile provider state before dialing again. Add tests for these rules with the implementation.

The live voice integration needs a configured ElevenLabs agent, a connected phone number, opted-in demo contacts, a public HTTPS callback URL, and webhook/tool authentication. The adapter must support both successful conversations and no-answer/failure events. Credentials stay in `.env`; the starter binds the API to loopback and has no application auth yet.

Official references: [Nest modules](https://docs.nestjs.com/modules), [Vite](https://vite.dev/guide/), [ElevenLabs outbound calls](https://elevenlabs.io/docs/api-reference/integrations/twilio/outbound-call), [post-call webhooks](https://elevenlabs.io/docs/eleven-agents/workflows/post-call-webhooks).
