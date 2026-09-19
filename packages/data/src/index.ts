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
export { SqliteBookings, DEMO_DATE, demoTime, localTime } from './sqlite.js';

export { localDate, DEMO_LAST_DATE, BUSINESS_TIMEZONE, validDemoDate, spokenCalendarDate } from './calendar.js';
