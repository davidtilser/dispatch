/**
 * server/src/domain/index.ts
 *
 * Public surface of the domain module.
 */

export { Engine } from './engine.js';
export type { DomainEvent, CallStartedEvent, CallUpdatedEvent, BookingChangedEvent, SlotOpenedEvent, WaitlistUpdatedEvent } from './engine.js';
export { DomainError } from './errors.js';
export { Store } from './store.js';
export { FakeClock, FakeScheduler, realClock, realScheduler } from './clock.js';
export type { Clock, Scheduler } from './clock.js';
export { availableSlots, isOpenAt } from './availability.js';
export { overlaps, addMinutes, durationMs } from './intervals.js';
