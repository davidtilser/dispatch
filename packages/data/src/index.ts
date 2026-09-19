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
  }): Promise<{ bookingId: string }>;
  waiveCancellationFee(slotId: string): Promise<void>;
}
export { SqliteBookings, DEMO_DATE, TIMEZONE, demoDate, demoTime, localTime } from './sqlite.js';
