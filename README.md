# Dispatch

**Cancel free, as long as we fill your spot.**

When a customer cancels, Dispatch offers the opening to the shop's waitlist one person at a time. The first acceptance gets booked; the original customer's cancellation fee is waived only after the replacement exists. The business model is a percentage of recovered bookings (5–10%, TBD).

The hackathon demo now has a shared SQLite calendar, seeded clients, a shop dashboard at `/`, and an English ElevenLabs web call at `/voice`. Both pages use the same booking state. Calendar, waitlist and fees are explicitly simulated; ElevenLabs audio is real when configured. No Booksy/Square integration, phone calls, Twilio or payment processing.

## Start

Use **Node 24** (the demo uses built-in `node:sqlite`). From the repository root:

```sh
npm ci
cp .env.example .env  # only if .env does not already exist
npm run dev
```

Keep the existing `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` in `.env`. Do not recreate a working voice agent. For a fresh account only, follow [voice setup](docs/voice.md).

- Shop dashboard: http://localhost:5173
- Customer web call: http://localhost:5173/voice
- API health: http://127.0.0.1:3001/api/health
- Verify types, tests and builds: `npm run check`

The dev command builds packages, starts the API, Vite and TypeScript watchers. Stop it with Ctrl-C when finished. API and web ports default to 3001/5173. For another API port, set `PORT` for the API and `API_PROXY_TARGET=http://127.0.0.1:<port>` when starting Vite. The API defaults to loopback.

## Exact demo flow

1. Open the dashboard and `/voice` in two tabs or side by side. Click **Reset demo** on the dashboard.
2. Cancel **Chris Brooks's 3:00 PM** haircut. The calendar changes to cancelled and his **$15 fee is pending**.
3. Lucas's `DispatchManager` reads the SQLite waitlist, selects **Jordan Davis**, and prepares a call brief. The dashboard shows the current candidate and activity. The voice page automatically receives that offer.
4. On `/voice`, click **Accept call · Jordan**, allow the microphone and use headphones. This is a manually answered browser call, not an outbound phone call.
5. Ask “Could I do three thirty instead?” The agent's `check_availability` tool checks the same calendar. **15:30 is available** for the 45-minute haircut. **16:00 is unavailable** because it overlaps Oliver's 16:30 booking.
6. Explicitly agree to 15:30. `accept_slot` goes through the manager, saves Jordan's replacement booking, and then waives Chris's fee. Within one second, the dashboard shows **Jordan at 3:30 PM**, **$45 recovered**, **$15 waived**, and the ordered activity log. Connecting or ending a call does not book anything.
7. End the call. Reset to repeat. Alternatively, decline or end without accepting: the fee stays pending and the manager prepares Sam, then Taylor. Finish the current audio call before answering the next one. An exhausted waitlist leaves the fee pending.

No credentials are required to use the calendar, reset, or run automated tests. A real microphone conversation requires ElevenLabs credentials. For an explicitly simulated, audio-free backend demo, `POST /api/refills/:runId/simulate` accepts `{ "type": "accepted", "startsAt": "2026-09-19T15:30:00-07:00" }` or a declined/no_answer outcome; it is labeled simulated in the log and cannot run during an open web call.

## Data and reset

The seed is a fixed demo day, **September 19, 2026**, America/Los_Angeles, one barber, five 45-minute $45 bookings and three waitlist clients. Original bookings have a $15 simulated cancellation fee. Alternative starts are the cancelled start or 30 minutes later, subject to business hours, service duration and calendar collisions.

SQLite is created automatically at **`.demo/dispatch.sqlite` in the repo root**, independent of the API working directory. It is ignored by Git. Set `DEMO_DB_PATH` to an absolute path to override it (`:memory:` for tests). No database installation or migrations command is needed.

**Reset demo** calls `POST /api/demo/reset`, reseeds the calendar/clients, clears manager runs and logs, and invalidates old voice sessions. Any open old voice page closes its audio on the next session check. Bookings, waitlist status, fees and activity survive API restarts. Manager runs and browser sessions are in memory: after a restart, an unfinished cancellation starts a fresh offer from the remaining waitlist. Previous declines are not persisted as exclusions. Reset before a presentation for a predictable starting state.

Brand colors and export formats live in [docs/design](docs/design/README.md).

## Ownership and architecture

| Area | Implementation |
| --- | --- |
| Contracts | `packages/contracts`: TypeScript + Zod payloads |
| Shared demo calendar | `packages/data`: `SqliteBookings`, clients, bookings, waitlist, activity |
| Crawl and manager | Lucas's `packages/agents`: crawler and `DispatchManager`; selects contacts and owns refill transitions |
| NestJS API | `apps/api/src/refill`: shared providers and serialized demo operations; `src/voice`: token and client-tool routes |
| Browser call | `packages/voice`: ElevenLabs adapter; `apps/web/src/voice`: existing WebRTC transport and transcript |
| Shop dashboard | React/Vite `apps/web/src/App.tsx`: agenda, waitlist, fees and activity; polls every second |

The data flow is **SQLite → DispatchManager → CallRequest (contact, shop, slot, brief) → VoiceService → ElevenLabs web call**. Shop and customer variables come from the manager's selected request; its brief is sent as a contextual update once audio connects. When `DISPATCH_ENV_ID`, `DISPATCH_MANAGER_AGENT_ID` and `ANTHROPIC_API_KEY` are configured, the existing Claude brief writer is used. Otherwise (or on brief-generation failure), the manager uses its template. A template brief does not bypass the manager or booking tools.

On acceptance, the path returns **client tool → VoiceService → DispatchManager → SQLite booking → fee waiver**. There is one active candidate/refill and one open web call across tabs. Cancellation and same-time acceptance are idempotent; late callbacks cannot undo a confirmed booking. The original isolated `VoiceDemoStore` remains only as a package fixture; the application does not use it.

| Route | Purpose |
| --- | --- |
| `GET /api/demo/dashboard` | Shared agenda, waitlist, current offer, run, fees and events |
| `POST /api/demo/reset` | Reseed and invalidate sessions |
| `POST /api/slots/:slotId/cancel` | Cancel and start/reuse the manager run |
| `GET /api/refills/:runId` | Manager run, attempts and brief |
| `GET /api/voice/config` | Setup status and current manager-selected offer |
| `POST /api/voice/sessions` | Claim offer with optional `{ "attemptId": "…" }`, obtain WebRTC token |
| `POST /api/voice/sessions/:id/check-availability` | `{ "time": "15:30" }` |
| `POST /api/voice/sessions/:id/accept` | Explicit agreed time; save replacement and waive fee |
| `POST /api/voice/sessions/:id/decline` | Advance waitlist without booking |
| `POST /api/voice/sessions/:id/end` | `{ "reason": "ended" }` or `failed`; never books or undoes a booking |

This is a local demo API without application login. Keep credentials in `.env`, never in browser code or Git. Nebius Token Factory credits are inference credits, not hosting.
