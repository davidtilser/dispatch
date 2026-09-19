import type { BookingSlot, WaitlistContact } from '@dispatch/contracts';

// Shared booking contract; SqliteBookings implements the local demo calendar.
// Production adapters will connect to the shop's booking platform.
export interface BookingRepository {
  getSlot(slotId: string): Promise<BookingSlot | null>;
  getWaitlist(businessId: string): Promise<WaitlistContact[]>;
  cancelBooking(slotId: string): Promise<void>;
  isAvailable(slotId: string, startsAt: string): Promise<boolean>;
  bookReplacement(input: {
    slotId: string;
    contactId: string;
    startsAt: string;
    idempotencyKey: string;
  }): Promise<{ bookingId: string; kind?: 'replacement' | 'alternative' }>;
  waiveCancellationFee(slotId: string): Promise<void>;
}
export { SqliteBookings } from './sqlite.js';
export { DEMO_DATE, DEMO_LAST_DATE, demoDate, demoTime, localTime, localDate, TIMEZONE, BUSINESS_TIMEZONE, addDays, validDemoDate, spokenCalendarDate } from './calendar.js';
