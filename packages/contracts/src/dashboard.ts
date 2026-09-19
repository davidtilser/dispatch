import type { BookingSlot, RefillRun, WaitlistContact } from './index.js';
export interface DemoBooking extends BookingSlot {
  customerId: string;
  customerName: string;
  status: 'booked' | 'cancelled' | 'replacement' | 'alternative';
  cancellationFeeCents: number;
  feeStatus: 'not_due' | 'pending' | 'waived';
  replacesSlotId?: string;
}
export interface DemoEvent { id: number; time: string; message: string }
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
