import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { DispatchManager, ManagerBookings } from '@dispatch/agents';
import type { CallOutcome, VoiceDemoContext, VoiceDemoSession } from '@dispatch/contracts';
import { DemoBookings } from '../refill/demo-bookings.js';
import { DemoVoice } from '../refill/demo-voice.js';
import { localDate, localHHmm, toIso } from '../refill/time.js';
import { BOOKINGS, MANAGER, VOICE } from '../refill/tokens.js';
import { VoiceService } from './voice.service.js';

interface Link {
  runId: string;
  attemptId: string;
  date: string;
  timezone: string;
}

// Connects browser voice sessions to the refill manager.
// Start: the session talks to whoever the manager is calling right now.
// Accept/decline/hang-up: reported back so the manager books, waives, or calls the next person.
@Injectable()
export class VoiceBridge {
  private readonly links = new Map<string, Link>();

  constructor(
    @Inject(MANAGER) private readonly manager: DispatchManager,
    @Inject(VOICE) private readonly calls: unknown,
    @Inject(BOOKINGS) private readonly bookings: ManagerBookings,
    @Inject(VoiceService) private readonly voice: VoiceService,
  ) {}

  isLinked(sessionId: string): boolean {
    return this.links.has(sessionId);
  }

  // Build the voice agent's context from the manager's active call for this run.
  async contextFor(runId: string): Promise<{ context: VoiceDemoContext; link: Link }> {
    const run = await this.manager.getRun(runId);
    if (!run) throw new NotFoundException(`No refill run ${runId}. Cancel a slot first.`);
    if (!run.activeAttemptId) throw new ConflictException(`Nobody to call: this run is ${run.status}.`);
    const call = this.calls instanceof DemoVoice ? this.calls.latestFor(runId) : undefined;
    if (!call || call.attemptId !== run.activeAttemptId) {
      throw new ConflictException('The next call is still being prepared. Try again in a few seconds.');
    }

    const timezone = call.business.timezone;
    const offeredTime = localHHmm(call.slot.startsAt, timezone);
    const alternatives =
      this.bookings instanceof DemoBookings
        ? (this.bookings.openTimes.get(call.slot.id) ?? []).map((iso) => localHHmm(iso, timezone))
        : [];
    const context: VoiceDemoContext = {
      businessName: call.business.name,
      customerName: call.contact.name,
      service: call.slot.service,
      price: `$${(call.slot.priceCents / 100).toFixed(0)}`,
      date: localDate(call.slot.startsAt, timezone),
      timezone,
      offeredTime,
      availableTimes: [...new Set([offeredTime, ...alternatives])],
    };
    return { context, link: { runId, attemptId: call.attemptId, date: context.date, timezone } };
  }

  link(sessionId: string, link: Link): void {
    this.links.set(sessionId, link);
  }

  async accept(sessionId: string, time: string): Promise<VoiceDemoSession> {
    const link = this.mustGet(sessionId);
    const session = this.voice.get(sessionId);
    if (session.status === 'accepted') return this.voice.accept(sessionId, time); // idempotent retry
    if (!this.voice.check(sessionId, time).available) {
      throw new ConflictException('That time is unavailable. Ask for one of the available times.');
    }
    // Manager books and waives the fee. Only then mark the voice session accepted.
    const run = await this.manager.recordCallOutcome({
      runId: link.runId,
      attemptId: link.attemptId,
      outcome: { type: 'accepted', startsAt: toIso(link.date, time, link.timezone) },
    });
    if (run.status !== 'filled') throw new ConflictException('Could not confirm that booking.');
    return this.voice.accept(sessionId, time);
  }

  decline(sessionId: string): VoiceDemoSession {
    const result = this.voice.decline(sessionId);
    this.report(sessionId, { type: 'declined' });
    return result;
  }

  end(sessionId: string, reason: 'ended' | 'failed'): VoiceDemoSession {
    const before = this.voice.get(sessionId).status;
    const result = this.voice.end(sessionId, reason);
    // Hung up without accepting or declining: move on to the next person.
    if (before === 'active') {
      this.report(sessionId, reason === 'failed' ? { type: 'failed', reason: 'voice connection failed' } : { type: 'no_answer' });
    }
    return result;
  }

  // Fire and forget: the manager may spend up to 30s writing the next script,
  // and the voice tool times out after 15s. The dashboard shows the result.
  private report(sessionId: string, outcome: CallOutcome): void {
    const link = this.links.get(sessionId);
    if (!link) return;
    void this.manager
      .recordCallOutcome({ runId: link.runId, attemptId: link.attemptId, outcome })
      .catch((error: unknown) => console.error('[voice bridge] could not report outcome', error));
  }

  private mustGet(sessionId: string): Link {
    const link = this.links.get(sessionId);
    if (!link) throw new NotFoundException('This voice session is not linked to a refill run.');
    return link;
  }
}
