import type {
  BookingSlot,
  BusinessProfile,
  CallBrief,
  CallOutcome,
  CallRequest,
  RefillRun,
  WaitlistContact,
} from '@dispatch/contracts';
import {
  asString,
  asStringArray,
  createClient,
  extractJson,
  runManagedAgent,
  withTimeout,
  type ManagedAgentConfig,
} from './managed.js';

// Lucas: orchestration using BookingRepository and VoiceGateway.
// One active call per run. Book the first acceptance, then waive the fee.
// Check negotiated times against availability and deduplicate callbacks.
export interface ManagerAgent {
  startRefill(slotId: string): Promise<RefillRun>;
  recordCallOutcome(input: {
    runId: string;
    attemptId: string;
    outcome: CallOutcome;
  }): Promise<RefillRun>;
  getRun(runId: string): Promise<RefillRun | null>;
}

// Structural copies of BookingRepository (@dispatch/data) and VoiceGateway (@dispatch/voice),
// so this package only depends on contracts. Their real implementations fit these shapes.
export interface ManagerBookings {
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
export interface ManagerVoice {
  startCall(input: CallRequest): Promise<{ conversationId: string }>;
}

export interface AttemptView {
  attemptId: string;
  contactName: string;
  conversationId?: string;
  outcome?: CallOutcome;
}
export interface RunDetails {
  run: RefillRun;
  attempts: AttemptView[];
  bookingId?: string;
}

export interface ManagerDeps {
  bookings: ManagerBookings;
  voice: ManagerVoice;
  getBusiness(businessId: string): Promise<BusinessProfile | null>;
  // Other times the voice agent may offer ("3:30pm"). Defaults to none.
  alternativesFor?(slot: BookingSlot): Promise<string[]>;
  // Claude writes each call's brief. If missing, slow, or broken, a template brief is used.
  briefWriter?: BriefWriter;
}

interface RunState {
  run: RefillRun;
  slot: BookingSlot;
  business: BusinessProfile;
  waitlist: WaitlistContact[];
  nextIndex: number;
  attempts: Map<string, AttemptView & { contactId: string }>;
  handled: Set<string>;
  bookingId?: string;
}

export class DispatchManager implements ManagerAgent {
  private readonly runs = new Map<string, RunState>();
  private runCounter = 0;

  constructor(private readonly deps: ManagerDeps) {}

  async startRefill(slotId: string): Promise<RefillRun> {
    // Idempotent: a slot that's already being refilled returns its active run.
    for (const state of this.runs.values()) {
      if (state.run.slotId === slotId && ['pending', 'calling'].includes(state.run.status)) {
        return { ...state.run };
      }
    }

    const slot = await this.deps.bookings.getSlot(slotId);
    if (!slot) throw new Error(`Unknown slot ${slotId}`);
    const business = await this.deps.getBusiness(slot.businessId);
    if (!business) throw new Error(`Unknown business ${slot.businessId}`);

    await this.deps.bookings.cancelBooking(slotId);
    const waitlist = await this.deps.bookings.getWaitlist(slot.businessId);

    const state: RunState = {
      run: { id: `run_${++this.runCounter}`, slotId, status: 'pending', feeWaived: false },
      slot,
      business,
      waitlist,
      nextIndex: 0,
      attempts: new Map(),
      handled: new Set(),
    };
    this.runs.set(state.run.id, state);

    await this.callNext(state);
    return { ...state.run };
  }

  async recordCallOutcome(input: {
    runId: string;
    attemptId: string;
    outcome: CallOutcome;
  }): Promise<RefillRun> {
    const state = this.runs.get(input.runId);
    if (!state) throw new Error(`Unknown run ${input.runId}`);

    // Ignore duplicate callbacks and outcomes for attempts that are no longer active.
    if (state.handled.has(input.attemptId) || state.run.activeAttemptId !== input.attemptId) {
      return { ...state.run };
    }
    state.handled.add(input.attemptId);

    const attempt = state.attempts.get(input.attemptId);
    if (attempt) attempt.outcome = input.outcome;
    delete state.run.activeAttemptId;

    if (input.outcome.type === 'accepted' && attempt) {
      const { startsAt } = input.outcome;
      const available = await this.deps.bookings.isAvailable(state.slot.id, startsAt);
      if (available) {
        const booking = await this.deps.bookings.bookReplacement({
          slotId: state.slot.id,
          contactId: attempt.contactId,
          startsAt,
          idempotencyKey: input.attemptId,
        });
        state.bookingId = booking.bookingId;
        await this.deps.bookings.waiveCancellationFee(state.slot.id);
        state.run.status = 'filled';
        state.run.feeWaived = true;
        return { ...state.run };
      }
      // Asked for a time that isn't open: treat as a decline and move on.
    }

    await this.callNext(state);
    return { ...state.run };
  }

  async getRun(runId: string): Promise<RefillRun | null> {
    const state = this.runs.get(runId);
    return state ? { ...state.run } : null;
  }

  // For the dashboard: who was called and what happened.
  async getRunDetails(runId: string): Promise<RunDetails | null> {
    const state = this.runs.get(runId);
    if (!state) return null;
    return {
      run: { ...state.run },
      attempts: [...state.attempts.values()].map(({ contactId: _contactId, ...view }) => view),
      ...(state.bookingId ? { bookingId: state.bookingId } : {}),
    };
  }

  private async callNext(state: RunState): Promise<void> {
    while (state.nextIndex < state.waitlist.length) {
      const contact = state.waitlist[state.nextIndex++]!;
      const attemptId = `${state.run.id}_a${state.nextIndex}`;
      state.attempts.set(attemptId, {
        attemptId,
        contactId: contact.id,
        contactName: contact.name,
      });
      state.run.status = 'calling';
      state.run.activeAttemptId = attemptId;

      const brief = await this.writeBrief(state, contact);
      try {
        const { conversationId } = await this.deps.voice.startCall({
          runId: state.run.id,
          attemptId,
          business: state.business,
          slot: state.slot,
          contact,
          brief,
        });
        const attempt = state.attempts.get(attemptId);
        if (attempt) attempt.conversationId = conversationId;
        return; // Wait for recordCallOutcome.
      } catch (error) {
        // Call never started: record it and try the next person.
        const attempt = state.attempts.get(attemptId);
        if (attempt) attempt.outcome = { type: 'failed', reason: errorMessage(error) };
        state.handled.add(attemptId);
        delete state.run.activeAttemptId;
      }
    }
    state.run.status = 'exhausted';
    delete state.run.activeAttemptId;
  }

  private async writeBrief(state: RunState, contact: WaitlistContact): Promise<CallBrief> {
    const alternatives = (await this.deps.alternativesFor?.(state.slot)) ?? [];
    const fallback = templateBrief(state.business, state.slot, contact, alternatives);
    if (!this.deps.briefWriter) return fallback;
    try {
      return await this.deps.briefWriter.write({
        business: state.business,
        slot: state.slot,
        contact,
        alternatives,
      });
    } catch (error) {
      console.warn(`Brief writer failed, using template: ${errorMessage(error)}`);
      return fallback;
    }
  }
}

export interface BriefInput {
  business: BusinessProfile;
  slot: BookingSlot;
  contact: WaitlistContact;
  alternatives: string[];
}
export interface BriefWriter {
  write(input: BriefInput): Promise<CallBrief>;
}

export interface ClaudeBriefWriterConfig extends ManagedAgentConfig {
  managerAgentId: string; // "Dispatch Manager agent" in Console
  timeoutMs?: number;
}

// Calls the Dispatch Manager managed agent to write the brief for one call.
export class ClaudeBriefWriter implements BriefWriter {
  private readonly client;

  constructor(private readonly config: ClaudeBriefWriterConfig) {
    this.client = createClient(config);
  }

  async write(input: BriefInput): Promise<CallBrief> {
    const { business, slot, contact, alternatives } = input;
    // Same shape the Console prompt expects; the waitlist holds only the person we're calling.
    const payload = {
      profile: { business_name: business.name, services: business.services },
      trigger: {
        type: 'cancellation',
        slot: {
          service: slot.service,
          start: formatTime(slot.startsAt, business.timezone),
          price_usd: slot.priceCents / 100,
          other_open_times: alternatives,
        },
        waitlist: [{ name: contact.name, phone: contact.phoneE164 }],
      },
      already_called: [],
    };

    const reply = await withTimeout(
      runManagedAgent(
        this.client,
        this.config.environmentId,
        this.config.managerAgentId,
        JSON.stringify(payload),
        'Dispatch manager',
      ),
      this.config.timeoutMs ?? 30_000,
    );
    const raw = extractJson(reply);
    const disclosure = asString(raw.disclosure);
    const offer = asString(raw.offer);
    if (!disclosure || !offer) throw new Error('Brief missing disclosure or offer');

    return {
      disclosure,
      offer,
      allowedAlternatives: asStringArray(raw.allowed_alternatives),
      mustNot: asStringArray(raw.must_not),
    };
  }
}

export function templateBrief(
  business: BusinessProfile,
  slot: BookingSlot,
  contact: WaitlistContact,
  alternatives: string[],
): CallBrief {
  const time = formatTime(slot.startsAt, business.timezone);
  const price = `$${(slot.priceCents / 100).toFixed(0)}`;
  return {
    disclosure: `Hi ${contact.name}, this is an AI assistant calling for ${business.name}.`,
    offer: `A ${slot.service.toLowerCase()} just opened up today at ${time} for ${price}. Would you like it?`,
    allowedAlternatives: alternatives,
    mustNot: ['offer discounts', 'pressure', 'say who cancelled'],
  };
}

function formatTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
