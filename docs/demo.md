# Demo and business handoff

Presenter guide for the current implementation. See [startup and configuration](../README.md#start) and [voice setup](voice.md).

## Story

“Cancel free, as long as we fill your spot.” Encourage early cancellations instead of no-shows, then recover the open slot through a voice conversation.

- Buyer: barbershop / appointment-based business.
- Revenue: 5–10% of refilled booking value, percentage TBD.
- Core customer experience: a shop-managed waitlist offer. The separate `/client` portal demonstrates service discovery and bookings with browser-only sample data.
- Difference from a notification-only waitlist: the agent talks and can check alternatives such as 3:30.

## Stage flow

1. Open `/` and `/voice` side by side. Confirm that ElevenLabs is configured. Enable the ringtone on `/voice` if wanted.
2. Optionally choose **Set up your business**, paste a public website URL, review the extracted details, and activate one service. If the site cannot be read, enter its details manually. Activation replaces the sample calendar; no booking platform is connected.
3. Click **Reset demo**, then cancel Chris Brooks's 3:00 PM appointment. The fee becomes pending and the manager prepares Jordan Davis's offer.
4. On `/voice`, click **Answer · Jordan** and allow microphone access. This is a browser audio call answered by the demo participant; no telephone call is placed.
5. Accept the offered day/time, or ask for 3:30 PM and then agree. With the default 45-minute service, 3:30 PM is free and 4:00 PM conflicts with Oliver's 4:30 PM booking.
6. Show the saved replacement, recovered booking value and $15 fee waiver. The dashboard refreshes about once per second. The agent says goodbye and hangs up.

The exact $45/45-minute example assumes the default Apblendzz setup. An imported service changes the price and availability. Reset preserves the activated business; it does not restore Apblendzz.

For a decline demo, say “No thanks.” The fee stays pending and the manager prepares Sam, then Taylor. Wait for the current audio to end before answering the next offer. A separate booking outside the original start/+30-minute refill window, including another day, also leaves the original fee pending.

Say explicitly that calendar and waitlist are mocked. Fee waiver is a demo state change, not a real payment operation. Production booking-platform integrations (for example Booksy or Square) require separate API/access validation.

## Before presenting

Run `npm run check`, then rehearse a real microphone conversation with the configured agent. Automated tests mock provider calls and do not verify live audio. Record a backup video after a successful rehearsal. For an audio-free fallback, use the [simulated outcome endpoint](../README.md#exact-demo-flow), which is explicitly labeled simulated in the activity log.

## Vision only

Automatic discount calculation, a production marketplace, ads, parallel calling, telephone calls and real booking/payment integrations are not implemented. `/client` is a sample marketplace UI with local state, separate from the shared shop calendar. The voice agent can mention an approved discount supplied on an appointment; its price must already be the final discounted price. The default seed and business setup form do not supply discounts.
