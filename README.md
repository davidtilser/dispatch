# Dispatch

**Cancel free, as long as we fill your spot.**

**Finalist at [Dream AI Hackathon 2026](https://luma.com/upjkn37w).**

Dispatch went from idea to working AI product in a single day at Frontier Tower in San Francisco. The idea and all of the code were developed during the hackathon, and the project advanced to the finals.

Co-hosted by **LIKELION US, Founder Institute, and Sazze Partners**, the event challenged teams to solve a real problem, build a working AI-powered MVP, and turn it into a startup pitch—all in one day. Projects were judged on what teams built during the event, product quality, and startup potential.

Built by [David Tilser](https://github.com/davidtilser), [Robin Desandre](https://github.com/doodsito), [Lucas Yoo](https://github.com/yoocas), and [Harshith Ande](https://github.com/Hershey-Bar).

When a customer cancels, Dispatch offers the opening to the shop's waitlist one person at a time. The first acceptance gets booked; the original customer's cancellation fee is waived only after the replacement exists. The business model is a percentage of recovered bookings (5–10%, TBD).

The hackathon demo now has a shared SQLite calendar, seeded clients, a shop dashboard at `/`, and an English ElevenLabs web call at `/voice`. Both pages use the same booking state. Calendar, waitlist and fees are explicitly simulated; ElevenLabs audio is real when configured. No Booksy/Square integration, phone calls, Twilio or payment processing.

## Start

Use **Node 24**, matching `.nvmrc` and CI (the demo uses built-in `node:sqlite` and runs TypeScript tests directly). From the repository root:

```sh
npm ci
test -f .env || cp .env.example .env
npm run dev
```

Keep the existing `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` in `.env`. Do not recreate a working voice agent. For a fresh account only, follow [voice setup](docs/voice.md).

- Shop dashboard: http://localhost:5173
- Customer web call: http://localhost:5173/voice
- Client portal and demo sign-in: http://localhost:5173/client
- API health: http://127.0.0.1:3001/api/health
- Verify types, tests and builds: `npm run check`

The dev command builds packages, starts the API, Vite and TypeScript watchers. Stop it with Ctrl-C when finished. API and web ports default to 3001/5173. For another API port, set `PORT` for the API and `API_PROXY_TARGET=http://127.0.0.1:<port>` when starting Vite. The API defaults to loopback.

For example, `PORT=3002 API_PROXY_TARGET=http://127.0.0.1:3002 npm run dev` starts the API on 3002 and keeps the web app on 5173. Export `API_PROXY_TARGET` in the shell; Vite's configuration does not load the root `.env`. Vite uses a strict port, so stop another process on 5173 before starting it.

### Configuration

| Variables | Used for |
| --- | --- |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` | Real browser audio; optional for calendar and simulated refill demos |
| `ANTHROPIC_API_KEY`, `DISPATCH_ENV_ID`, `DISPATCH_CRAWL_AGENT_ID` | Optional Claude website crawler; otherwise preview uses public HTML with a manual fallback |
| `ANTHROPIC_API_KEY`, `DISPATCH_ENV_ID`, `DISPATCH_MANAGER_AGENT_ID` | Optional Claude call briefs; otherwise the manager uses a template |
| `HOST`, `PORT` | API listener; defaults to `127.0.0.1:3001` |
| `DEMO_DB_PATH` | SQLite location; use an absolute path or `:memory:` |
| `API_PROXY_TARGET` | Vite development proxy target, supplied through the shell |

Claude agent IDs refer to agents already configured in your account; this repository does not provision them. `NEBIUS_API_KEY` is a reserved placeholder and is not used by the application. The `agents/` Python runner and JSON examples are standalone experiments, not part of `npm run dev` or `npm run check`.

`npm run build` compiles the packages/API and produces the web bundle in `apps/web/dist`. `npm run start -w @dispatch/api` starts the compiled API only; it does not serve the web bundle. A deployment must serve that bundle separately and route `/api` to the API. The included proxy configuration is for Vite development.

## Exact demo flow

These prices and availability examples assume the default **Apblendzz / Haircut / $45 / 45 minutes** setup. Importing a business changes the service, price and duration. **Reset demo preserves that business configuration.** To repeat this exact flow, use the default setup or activate a 45-minute $45 haircut through business setup.

1. Open the dashboard and `/voice` in two tabs or side by side. Click **Reset demo** on the dashboard.
2. Cancel **Chris Brooks's 3:00 PM** haircut. The calendar changes to cancelled and his **$15 fee is pending**.
3. Lucas's `DispatchManager` reads the SQLite waitlist, selects **Jordan Davis**, and prepares a call brief. The dashboard shows the current candidate and activity. The voice page automatically receives that offer.
4. On `/voice`, click **Answer · Jordan**, allow the microphone and use headphones. This is a manually answered browser call, not an outbound phone call.
5. Ask “Could I do three thirty instead?” The agent's `check_availability` tool checks the same calendar. **15:30 is available** for the 45-minute haircut. **16:00 is unavailable** because it overlaps Oliver's 16:30 booking.
6. Explicitly agree to the offered day at 15:30. `accept_slot` goes through the manager, saves Jordan's replacement booking, and then waives Chris's fee. On the next successful poll (about once per second), the dashboard shows **Jordan at 3:30 PM**, **$45 recovered**, **$15 waived**, and the ordered activity log. Connecting or ending a call does not book anything.
7. The agent says goodbye and ends the call after a successful booking or decline. Reset to repeat. Alternatively, decline or end without accepting: the fee stays pending and the manager prepares Sam, then Taylor. Wait for the current audio call to finish before answering the next one. An exhausted waitlist leaves the fee pending. For an older ElevenLabs agent, run `npm run voice:update` once to enable automatic hangup.

No credentials are required to use the calendar, reset, or run automated tests. A real microphone conversation requires ElevenLabs credentials. For an explicitly simulated, audio-free backend demo, `POST /api/refills/:runId/simulate` accepts `{ "type": "accepted", "startsAt": "<ISO timestamp from the current offer>" }` or a declined/no_answer outcome; it is labeled simulated in the log and cannot run during an open web call.

## Data and reset

### Import a business website

Click **Set up your business** on the dashboard. The example is
`https://www.thecuttingroomsf.com/`. **Find my business** reads public metadata,
structured offers and service/price headings. When Claude crawler credentials are
configured, the existing crawler is used first. Unreadable sites fall back to an
explicitly manual form, never invented details.

Review the name, choose a service, confirm its USD price and duration, then click
**Activate demo business**. Missing duration defaults visibly to 45 minutes.
Activation starts a fresh sample calendar. The dashboard, manager brief, voice
variables, replacement booking and recovered revenue all use the confirmed data.
The profile survives Reset demo and API restart. Changing businesses is blocked
during an active refill or open call. No real booking platform is connected:
hours stay 9 AM–6 PM Pacific, customers are seeded and the $15 fee is simulated.
Only one business and one selected service are active in the demo.

Routes: `POST /api/business/preview` with `{ "url": "https://…" }`, and
`GET`/`POST /api/demo/business` for the reviewed setup.

### Calendar and persistence

The seed uses **tomorrow in America/Los_Angeles**, calculated when the API starts with the correct date-specific UTC offset: one barber, five bookings on the seeded demo day, one occupied 1 PM appointment the following day, and three waitlist clients. The default service is a 45-minute $45 haircut; an activated business supplies its own service, price and duration. Original bookings have a $15 simulated cancellation fee. The calendar supports seven days starting on the seeded demo day, with daily demo business hours 09:00–18:00. Search produces up to six real free starts on a 15-minute grid from service duration and current SQLite collisions. The original start and +30 minutes count as replacements; every other start, including another day, is a separate appointment. Separate bookings keep the original cancellation fee pending and recovered revenue unchanged, while preparing the next waitlist candidate. Another browser call cannot begin until the current audio ends.

For the cross-day demo, ask for the afternoon of the day after the original offer. The call supplies an explicit business-local reference date for “today”; “tomorrow” is resolved relative to it. The day after the seeded demo date has an occupied 13:00 appointment; 14:00 is initially free. Agree to the exact named day and time. The saved confirmation includes the date, and the dashboard's day selector shows the separate appointment. The booking tool requires `confirmed: true` for dated requests; legacy `{ time: "15:30" }` calls retain the existing explicit-acceptance tool semantics. Availability searches never reserve a slot.

SQLite is created automatically at **`.demo/dispatch.sqlite` in the repo root**, independent of the API working directory. It is ignored by Git. Set `DEMO_DB_PATH` to an absolute path to override it (`:memory:` for tests). No database installation or migrations command is needed.

**Reset demo** calls `POST /api/demo/reset`, reseeds the calendar/clients, clears manager runs and logs, and invalidates old voice sessions. Any open old voice page closes its audio on the next session check. Bookings, waitlist status, fees and activity survive API restarts on the same demo day. Starting the API on a new day automatically reseeds the stored calendar for tomorrow. Restart the API before a demo if it has been running overnight. Manager runs and browser sessions are in memory: after a restart, an unfinished cancellation starts a fresh offer from the remaining waitlist. Previous declines are not persisted as exclusions. Reset before a presentation for a predictable starting state.

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
| `POST /api/refills/:runId/simulate` | Audio-free simulated call outcome; blocked while a browser call is open |
| `POST /api/business/preview` | Website preview for review; does not activate a business |
| `GET` / `POST /api/demo/business` | Read / activate the persisted business and service |
| `GET /api/voice/config` | Setup status and current manager-selected offer |
| `POST /api/voice/sessions` | Claim offer with optional `{ "attemptId": "…" }`, obtain WebRTC token |
| `GET /api/voice/sessions/:id` | Current session and confirmed booking state |
| `POST /api/voice/sessions/:id/check-availability` | `{ date, partOfDay: "afternoon" }` or legacy `{ time: "15:30" }`; choose a date in the current demo week |
| `POST /api/voice/sessions/:id/accept` | Exact agreed `{ date, time, confirmed: true }`; only replacements waive the original fee |
| `POST /api/voice/sessions/:id/decline` | Advance waitlist without booking |
| `POST /api/voice/sessions/:id/end` | `{ "reason": "ended" }` or `failed`; never books or undoes a booking |

The older `POST /api/business/import` and `GET /api/business/:id` routes store Claude-crawled profiles in memory. They do not activate the shared demo business; use preview and `/api/demo/business` for the dashboard flow.

This is a local demo API without application login. Keep credentials in `.env`, never in browser code or Git. Nebius Token Factory credits are inference credits, not hosting.

## Web-client design and client portal

The visual design and client screens were adapted from `web-client` into the
existing React 19 application. The shop dashboard at `/` and browser call at
`/voice` still use the original NestJS API, DispatchManager and shared SQLite
calendar. They remain accessible without signing in. Business mode in the
client portal opens this same shop dashboard.

`/client` (also `/login`) adds the demo sign-in, service categories, filtered
service search, booking/waitlist dialogs and My Appointments & Queue screens.
Use `login` / `password`, or the Client Demo and Business Demo shortcuts.
Authentication is explicitly a browser demo, not a server login. The sign-in marker persists in local storage until logout; restored sessions open in client mode. The portal's
sample businesses, distances, bookings and waitlists are separate from the
shared shop calendar. Client demo state survives navigation in the same browser
tab through session storage; its Reset button restores only the client samples.
The original shop Reset still resets the shared calendar and voice sessions.
No simulated client voice engine replaces the real `/voice` implementation.

## Existing voice agent calendar upgrade

Run `npm run voice:update -- --inspect` for a read-only preflight, then `npm run voice:update` from the configured checkout. Do not run `voice:setup` for an existing agent. The update requires exactly one attached `check_availability` and `accept_slot` client tool, rejects either calendar tool if shared with another agent, and checks that `decline_slot` is attached. It updates calendar schemas in place, refreshes the greeting and date/consent/discount instructions, and configures `end_call`. Tool IDs, voice, LLM and unrelated instructions are preserved; obsolete Dispatch instructions are replaced. It is safe to repeat after a partial failure. Start the current API and browser code before making a fresh call; an existing conversation keeps its previous configuration.

The browser forwards the full client-tool parameters to the API. Deploying only the agent update against an older API that discards the date is incompatible. Automated tests use temporary/in-memory databases and mock external provider calls and website import responses. They cover booking behavior and builds, but do not exercise a browser UI or verify real microphone speech recognition or a live audio conversation.
