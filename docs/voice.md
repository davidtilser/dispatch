# Web voice demo

English conversation with ElevenLabs over WebRTC. No Twilio, telephone number, or server webhook is required for the local demo. Booking tools run through the browser to the same-origin NestJS API. Audio flows directly between the browser and ElevenLabs.

## Setup

1. Run `npm ci` from the repository root (Node 24).
2. Copy `.env.example` to `.env` if it does not exist. Set `ELEVENLABS_API_KEY` to a key with Agents and Tools permissions. Keep it out of chat and Git.
3. Run `npm run voice:setup`. It creates three client tools and a private English agent, then saves `ELEVENLABS_AGENT_ID` to `.env`. Existing agent IDs are left unchanged; tool IDs are saved for resuming partial setup.
4. Run (or restart) `npm run dev` and open <http://localhost:5173/voice>.
5. Click **Accept web call**, allow microphone access, and speak. Use headphones.

The setup uses ElevenLabs' default voice/LLM. You can change them in the ElevenLabs dashboard. The agent receives shop/customer/appointment information via dynamic variables. There is a five-minute conversation cap. API keys remain on the backend; the browser receives only a conversation token.

For a phone, expose Vite port 5173 through an HTTPS tunnel and allow that hostname in Vite if necessary. Plain `http://192.168…` will not provide browser microphone access. Both the page and `/api` must use the same origin. The current endpoints are for a trusted hackathon demo, with no application login.

## Try these conversations

- “Yes, three PM works.” → agent calls `accept_slot` → booking confirmed, mock cancellation fee waived.
- “Could I do three thirty instead?” → `check_availability` → agent asks for confirmation → `accept_slot` with `15:30`.
- “Could I come at six?” → unavailable; no booking or fee waiver.
- “No thanks.” → `decline_slot`; fee remains pending.
- End a call without accepting → no booking. Ending after an acceptance preserves the booking.

The mock appointment is tomorrow in America/Los_Angeles, at Apblendzz, for Jordan: a $45 haircut. Available times are 15:00, 15:30 and 16:00. Each new conversation has an independent mock cancelled slot so the voice owner can iterate without the manager. There is no real cancellation, payment processing, or shared waitlist yet. In-memory sessions disappear on API restart and are pruned after an hour when another session is created.

## Files and handoff

- `packages/voice/src/agent-config.ts`: English prompt and client tool definitions.
- `packages/voice/src/elevenlabs.ts`: backend-only WebRTC token adapter.
- `packages/voice/src/demo.ts`: isolated mock booking state; integration seam for Lucas's manager.
- `apps/api/src/voice`: NestJS routes and service.
- `apps/web/src/voice`: customer call UI, transcript, and client tool handlers.
- `packages/contracts/src/voice.ts`: shared request validation and response types.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/voice/config` | Read setup status and demo context, never secrets |
| `POST /api/voice/sessions` | Create WebRTC token and isolated demo session |
| `GET /api/voice/sessions/:id` | Observe demo booking/fee state |
| `POST /api/voice/sessions/:id/check-availability` | `{ "time": "15:30" }` |
| `POST /api/voice/sessions/:id/accept` | `{ "time": "15:30" }`; idempotent for the same acceptance |
| `POST /api/voice/sessions/:id/decline` | Explicit refusal |
| `POST /api/voice/sessions/:id/end` | `{ "reason": "ended" }` or `failed`; never undoes a booking |

Client tools are `check_availability`, `accept_slot`, and `decline_slot`. The first two require a string `time` in local HH:mm format. All three must have **Wait for response** enabled. Browser handlers add `ok: true` to successful API results and return `ok: false` for errors; the agent must never confirm a failed booking.

For integration, replace VoiceService's mock store with calls to the manager and booking repository, and create context from the selected waitlist contact. Preserve run/attempt IDs. Browser transport needs a participant to open the page and click Accept; the original telephony `VoiceGateway.startCall` contract is reserved for a future phone adapter. Do not mark a booking successful merely because the voice session connected or ended. A browser disconnect is not evidence of a refusal. Add provider webhooks for durable completion handling if needed later; the current demo relies on the open browser.

## Nebius

The hackathon **Token Factory** credits fund model inference, not hosting. They can be used by the crawl/manager agents independently. This demo does not call Nebius. A custom Nebius LLM for the voice agent is a separate integration; verify streaming/tool support and latency before switching it in.

## Verification

`npm run check` runs type checks, voice state/provider tests, and production builds. A real microphone conversation still requires a configured ElevenLabs account and a human listener. Record a backup after the first successful call.

References: [React SDK](https://elevenlabs.io/docs/eleven-agents/libraries/react), [session tokens](https://elevenlabs.io/docs/api-reference/conversations/get-webrtc-token), [client tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools), [Token Factory](https://dev.nebius.com/token-factory).
