import type { BookingSlot, WaitlistContact } from '@dispatch/contracts';

// TODO: in-memory adapter with seeded calendar and waitlist fixtures.
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
