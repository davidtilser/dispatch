# Live refill presentation

`LiveRefill` is shared by the shop dashboard and browser-call page. It displays the shared SQLite calendar and backend activity; it never derives bookings or customer statements from a transcript. The existing ElevenLabs SDK transport, tools and transcript are retained.

- The main timeline uses each booking's service duration (45 minutes in the default setup), with the cancelled opening on a separate row. A rejected availability check that overlaps a saved reservation adds a collision row when it falls in the visible timeline window. With the default service, booking Jordan at 15:30 leaves 15:00–15:30 open and preserves Oliver at 16:30.
- The success summary requires an actual `replacement` booking linked to the original slot on the same day **and** the original fee marked `waived`. Merely checking availability, requesting a booking, disconnecting or declining cannot produce the summary.
- The day selector covers the demo week and any other dates present in returned bookings. The integrated calendar/voice tools support searches and bookings across that week. `alternative` bookings have their own date and do not contribute to recovered revenue or trigger the refill summary. Any available start outside the original start/+30-minute refill window is a separate appointment, even on the same day.
- Reset removes persisted events and bookings, resets the selected calendar day, and clears the voice page's session result and transcript. Motion respects reduced-motion preferences.

## Integration points

- UI: `apps/web/src/refill/LiveRefill.tsx`, `live-refill.css`, and `useLiveDashboard.ts`.
- Dashboard: renders `LiveRefill` above metrics; `refill-live` class compacts the hero during a run. Other-day agenda rows show their date and separate-booking status.
- Voice: renders `LiveRefill` beside the call card and transcript in `voice-call-column`. Dashboard polling is read-only. See [voice setup](voice.md#setup) to update an existing agent's calendar tools.
- `DemoEvent.action` is optional, so historical text events remain valid. `SqliteBookings.log(message, action?)` persists JSON in a nullable `events.action` column added automatically to an existing database.
- Structured facts are emitted by the coordinator's check/accept/end/simulate routes, manager offer preparation, and SQLite cancellation/booking/waiver methods. `availability()` returns `{ available, reason, conflict? }`; `isAvailable()` keeps its boolean interface.
- `sqlite.ts` emits `kind: 'alternative_booked'`, `source: 'calendar'`, the original cancellation's `slotId`, `customerName`, ISO `startsAt`, `durationMinutes`, `bookingId` and `amountCents` after saving a separate booking. The UI labels it as separate and leaves the original cancellation's fee unchanged.

## Verification

`npm run check` exercises the HTTP booking flow with a mocked provider token, including structured availability results, actual conflicting reservation, request-before-save-before-waiver ordering, duplicate acceptance, decline, reset, and persisted events after reopening SQLite. It also covers dated calendar searches and separate bookings. It does not automate a browser. For manual browser checks, use isolated ports and `DEMO_DB_PATH` so the same API routes operate on a separate demo database. Live microphone audio requires a separate manual check with the configured ElevenLabs agent.
