import type { BookingSlot, WaitlistContact } from '@dispatch/contracts';
import type { ManagerBookings } from '@dispatch/agents';

// TEMPORARY stand-in until packages/data ships the real in-memory repository.
// Waitlist phones come from DEMO_WAITLIST in .env so real numbers stay out of Git:
// DEMO_WAITLIST="Jordan:+16505550199,Sam:+16505550188"
const TODAY = '2026-09-19';
const OFFSET = '-07:00';
const at = (time: string) => `${TODAY}T${time}:00${OFFSET}`;

export class DemoBookings implements ManagerBookings {
  readonly slots = new Map<string, BookingSlot>([
    [
      'slot_3pm',
      {
        id: 'slot_3pm',
        businessId: 'biz_001',
        startsAt: at('15:00'),
        durationMinutes: 45,
        service: 'Haircut',
        priceCents: 4500,
        currency: 'USD',
      },
    ],
  ]);
  // Other open times the agent may offer instead of the cancelled one.
  readonly openTimes = new Map<string, string[]>([['slot_3pm', [at('15:30'), at('16:00')]]]);
  readonly log: string[] = [];

  async getSlot(slotId: string) {
    return this.slots.get(slotId) ?? null;
  }

  async getWaitlist(_businessId: string): Promise<WaitlistContact[]> {
    const raw = process.env.DEMO_WAITLIST ?? 'Jordan:+16505550199,Sam:+16505550188';
    return raw.split(',').map((entry, i) => {
      const [name = `Contact ${i + 1}`, phone = ''] = entry.split(':');
      return { id: `contact_${i + 1}`, name: name.trim(), phoneE164: phone.trim() };
    });
  }

  async cancelBooking(slotId: string) {
    this.log.push(`cancelled ${slotId}`);
  }

  async isAvailable(slotId: string, startsAt: string) {
    const slot = this.slots.get(slotId);
    if (!slot) return false;
    const allowed = [slot.startsAt, ...(this.openTimes.get(slotId) ?? [])];
    return allowed.some((t) => new Date(t).getTime() === new Date(startsAt).getTime());
  }

  async bookReplacement(input: { slotId: string; contactId: string; startsAt: string; idempotencyKey: string }) {
    this.log.push(`booked ${input.contactId} at ${input.startsAt}`);
    return { bookingId: `booking_${input.idempotencyKey}` };
  }

  async waiveCancellationFee(slotId: string) {
    this.log.push(`fee waived for ${slotId}`);
  }
}
