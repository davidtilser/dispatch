# Live refill presentation

`LiveRefill` is shared by the shop dashboard and browser-call page. It displays the shared SQLite calendar and backend activity; it never derives bookings or customer statements from a transcript. The existing ElevenLabs SDK transport, tools and transcript are retained.

- The main timeline uses 45-minute blocks with the cancelled opening on a separate row. A real rejected availability check adds a collision row. Booking Jordan at 15:30 leaves 15:00–15:30 open and preserves Oliver at 16:30.
- The success summary requires an actual `replacement` booking linked to the original slot on the same day **and** the original fee marked `waived`. Merely checking availability, requesting a booking, disconnecting or declining cannot produce the summary.
- The day selector covers the demo week and any other dates present in returned bookings. `alternative` bookings have their own date and do not contribute to recovered revenue or trigger the refill summary. The separate other-day booking task supplies those bookings; this change does not implement other-day booking tools.
- Reset removes persisted events and bookings, resets the selected calendar day, and clears the voice page's session result and transcript. Motion respects reduced-motion preferences.

## Integration points

- New UI: `apps/web/src/refill/LiveRefill.tsx`, `live-refill.css`, and `useLiveDashboard.ts`.
- Dashboard: import and render `LiveRefill` above metrics; `refill-live` class compacts the hero during a run. Other-day agenda rows show their date and separate-booking status.
- Voice: retain the call card and transcript in `voice-call-column`; render `LiveRefill` beside them. Dashboard polling is read-only. No ElevenLabs setup or credentials changes.
- `DemoEvent.action` is optional, so historical text events remain valid. `SqliteBookings.log(message, action?)` persists JSON in a nullable `events.action` column added automatically to an existing database.
- Structured facts are emitted by the coordinator's check/accept/end/simulate routes, manager offer preparation, and SQLite cancellation/booking/waiver methods. `availability()` returns `{ available, reason, conflict? }`; `isAvailable()` keeps its boolean interface.
- The independent other-day implementation also changes `sqlite.ts` and `demo-coordinator.ts`. Preserve these event emissions when combining its date-aware methods. After saving a separate booking emit `kind: 'alternative_booked'`, `source: 'calendar'`, `slotId` of the original cancellation, `customerName`, ISO `startsAt`, `durationMinutes`, `bookingId` and `amountCents`. The UI labels it as separate and leaves today's fee unchanged.

## Verification

`npm run check` exercises the HTTP booking flow with a mocked provider token, including structured availability results, actual conflicting reservation, request-before-save-before-waiver ordering, duplicate acceptance, decline, reset, and persisted events after reopening SQLite. Browser checks use isolated ports/database and the same API routes. Live microphone audio requires a separate manual check with the existing configured ElevenLabs agent.
