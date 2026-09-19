# Web voice demo

English conversation with ElevenLabs over WebRTC. No Twilio, telephone number, or server webhook is required for the local demo. Booking tools run through the browser to the same-origin NestJS API. Audio flows directly between the browser and ElevenLabs.

## Setup

1. Run `npm ci` from the repository root (Node 24).
2. Copy `.env.example` to `.env` if it does not exist. Set `ELEVENLABS_API_KEY` to a key with Agents and Tools permissions. Keep it out of chat and Git.
3. Run `npm run voice:setup`. It creates three client tools and a private English agent, then saves `ELEVENLABS_AGENT_ID` to `.env`. Existing agent IDs are left unchanged; tool IDs are saved for resuming partial setup.
4. Run (or restart) `npm run dev`. Open the shop dashboard at <http://localhost:5173> and the call page at <http://localhost:5173/voice> side by side.
5. Reset the demo and cancel Chris’s 3:00 PM appointment on the dashboard. Then click **Answer · Jordan** on the call page, allow the microphone, and speak. Use headphones.

If an ElevenLabs agent already works, reuse its ID and skip agent creation.

For an existing agent, run `npm run voice:update -- --inspect` first. This read-only preflight checks the attached calendar tools and rejects missing, duplicate or shared calendar tools. Then run `npm run voice:update`: it updates the `check_availability` and `accept_slot` schemas in place for dated searches and explicit booking consent, refreshes the greeting and speech/discount instructions, and configures the built-in `end_call` tool. Tool IDs, voice, LLM and unrelated instructions are preserved. The update also requires `decline_slot` to be attached. Start the current API/browser code and make a new call after the update.

An appointment can supply an optional `discount` description, such as `"20% off"` or `"$10 off"`. Its `priceCents` must already contain the final discounted price. The manager forwards the discount to the call brief and voice context, and the agent highlights it in its opening offer without subtracting it again. Missing or blank discounts are not mentioned. The default seed has no discount. After updating application code, rebuild/restart the API before starting a call with the updated agent.

New-agent setup leaves voice/LLM selection to ElevenLabs' defaults and sets a five-minute conversation cap. You can change these in the ElevenLabs dashboard; updating an existing agent preserves its duration setting. The agent receives shop/customer/appointment information via dynamic variables. API keys remain on the backend; the browser receives only a conversation token.

For a phone, expose Vite port 5173 through an HTTPS tunnel and allow that hostname in Vite if necessary. Plain `http://192.168…` will not provide browser microphone access. Both the page and `/api` must use the same origin. The current endpoints are for a trusted hackathon demo, with no application login.

## Incoming call experience

On `/voice`, click **Enable ringtone** once before the demo. Browsers require a click to unlock sound; this setting lasts while the tab stays open. A new manager offer shows the shop and selected customer with animated ringing and a soft two-burst ringtone. **Answer** stops ringing before microphone setup; **Silence** only mutes the current offer and does not decline it. The next offer rings again. Ringing stops when another tab claims the call, the demo resets, or the page closes. Reduced-motion preferences disable the pulsing animations.

## Try these conversations

- “Yes, three PM works.” → agent calls `accept_slot` → booking confirmed, mock cancellation fee waived.
- “Could I do three thirty instead?” → `check_availability` for the appointment date and `15:30` → agent offers the exact day/time → after agreement, `accept_slot` with that date, `15:30` and `confirmed: true`.
- Ask for the afternoon of the day after the original offer → search with that date and `partOfDay: "afternoon"` → agree to one returned day/time → a separate appointment is saved; the original fee remains pending and the next waitlist candidate is prepared.
- “Could I come at six?” → unavailable; no booking or fee waiver.
- “No thanks.” → `decline_slot` → goodbye → automatic `end_call`; fee remains pending and the next candidate can answer a new web call.
- End a call without accepting → no booking. Ending after an acceptance preserves the booking.

The seeded demo day is tomorrow in America/Los_Angeles, calculated when the API starts; seven days are available for booking. The default business is Apblendzz with a 45-minute $45 haircut. An activated business replaces that name, service, price and duration, and survives Reset demo. A new demo day automatically reseeds an older database. Restart the API before a demo if it has been running overnight. The manager selects the customer from SQLite's waitlist. With the default service, for the 15:00 cancellation, 15:30 is available; 16:00 is unavailable because the service would overlap a 16:30 appointment. Only the original start or +30 minutes refills the cancellation; any other available start is a separate booking. Every call uses the same calendar as the shop dashboard. See [the exact flow and reset behavior](../README.md#exact-demo-flow).

Relative dates use the call's `reference_date` (the local day when the session is created), not the original appointment date. Say the exact named day when demonstrating a booking beyond the original offer.

The manager's `CallRequest` supplies customer/shop/slot variables and the call brief. The browser forwards that brief as a contextual update using the existing SDK; WebRTC transport and the configured ElevenLabs agent stay unchanged. Booking tools return to the manager and shared repository. A second browser cannot start a concurrent call, and ending a call without acceptance advances the waitlist without creating a booking.

## Files and handoff

- `packages/voice/src/agent-config.ts`: English prompt and client tool definitions.
- `packages/voice/src/elevenlabs.ts`: backend-only WebRTC token adapter.
- `packages/data/src/sqlite.ts`: shared demo booking/calendar persistence.
- `apps/api/src/refill/demo-coordinator.ts`: serializes API mutations around Lucas’s manager.
- `packages/voice/src/demo.ts`: dynamic-variable helper and legacy isolated fixture (unused by the app).
- `apps/api/src/voice`: NestJS routes and service.
- `apps/web/src/voice`: customer call UI, transcript, and client tool handlers.
- `packages/contracts/src/voice.ts`: shared request validation and response types.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/voice/config` | Read setup status and demo context, never secrets |
| `POST /api/voice/sessions` | Claim the current manager offer and create WebRTC token |
| `GET /api/voice/sessions/:id` | Observe demo booking/fee state |
| `POST /api/voice/sessions/:id/check-availability` | Optional `date` (YYYY-MM-DD), `time` (HH:mm), and `partOfDay` (`morning`, `afternoon`, `evening`); omitted date uses the original offer date |
| `POST /api/voice/sessions/:id/accept` | `{ date, time, confirmed: true }`; idempotent for the same accepted date/time |
| `POST /api/voice/sessions/:id/decline` | Explicit refusal |
| `POST /api/voice/sessions/:id/end` | `{ "reason": "ended" }` or `failed`; never undoes a booking |

Client tools are `check_availability`, `accept_slot`, and `decline_slot`. The configured provider schema requires `date` for `check_availability`, with optional `time` and `partOfDay`. `accept_slot` requires `date`, `time` and `confirmed`; the API accepts a dated booking only when `confirmed` is `true`. `decline_slot` takes no parameters. All three have **Wait for response** enabled. Browser handlers forward the full parameters, add `ok: true` to successful API results and return `ok: false` for errors; the agent must never confirm a failed booking.

For compatibility, the HTTP API also accepts `{ "time": "15:30" }` without a date or confirmation flag for the original offer date. Current voice agents use the explicit dated schema. Searches return up to six available starts and never reserve a slot. After a successful booking or decline, the agent says goodbye and uses `end_call`; the browser also ends the call after eight seconds if it remains open.

The integrated app preserves manager run/attempt IDs. Browser transport needs a participant to open the page and click **Answer**. Do not mark a booking successful merely because the voice session connected or ended. A disconnect before booking is recorded as no answer, not a refusal, and the fee stays pending; disconnecting after acceptance preserves the booking. The demo relies on the open browser; use Reset after a crashed browser leaves a call claimed. API restarts retain SQLite bookings but restart unfinished manager offers. There are no provider webhooks or real phone calls in this demo.

## Nebius

This demo does not call Nebius or read `NEBIUS_API_KEY`. The optional crawl/manager integrations use Anthropic's managed-agent API. A Nebius model integration would require separate implementation.

## Verification

`npm run check` runs type checks, Node tests and production builds. Tests cover calendar searches, consent, separate bookings, fee waivers, import activation, persistence, voice state and agent configuration. External provider calls and website import responses are mocked. Browser interaction and a real microphone conversation require separate manual checks; audio needs a configured ElevenLabs account and a human listener. Record a backup after the first successful call.

References: [React SDK](https://elevenlabs.io/docs/eleven-agents/libraries/react), [session tokens](https://elevenlabs.io/docs/api-reference/conversations/get-webrtc-token), [client tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools), [Token Factory](https://dev.nebius.com/token-factory).
