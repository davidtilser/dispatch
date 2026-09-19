import type { BookingSlot, RefillRun, WaitlistContact } from './index.js';
export interface DemoBooking extends BookingSlot {
  customerId: string;
  customerName: string;
  status: 'booked' | 'cancelled' | 'replacement' | 'alternative';
  cancellationFeeCents: number;
  feeStatus: 'not_due' | 'pending' | 'waived';
  replacesSlotId?: string;
}
// Facts emitted at backend boundaries, never inferred from a transcript or a timer.
export interface DemoAction {
  kind: 'cancelled' | 'offer_prepared' | 'call_started' | 'availability_checked' | 'booking_requested' | 'booking_saved' | 'fee_waived' | 'call_ended' | 'simulated_outcome' | 'alternative_booked';
  source: 'calendar' | 'manager' | 'voice_tool' | 'simulation';
  slotId: string;
  customerName?: string;
  startsAt?: string;
  date?: string; // Local date for a search that does not request a specific time.
  durationMinutes?: number;
  available?: boolean;
  reason?: string;
  conflict?: { bookingId: string; customerName: string; startsAt: string; durationMinutes: number };
  bookingId?: string;
  amountCents?: number;
  outcome?: string;
}
export interface DemoEvent { id: number; time: string; message: string; action?: DemoAction }
export interface DemoDashboard {
  businessName: string;
  date: string;
  timezone: string;
  bookings: DemoBooking[];
  waitlist: (WaitlistContact & { status: 'waiting' | 'booked' })[];
  events: DemoEvent[];
  run: RefillRun | null;
  offer: { attemptId: string; customerName: string; service: string; time: string; sessionActive: boolean } | null;
}
