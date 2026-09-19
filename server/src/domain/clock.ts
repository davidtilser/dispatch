/**
 * server/src/domain/clock.ts
 *
 * Injectable Clock and Scheduler interfaces.
 * Tests use fake implementations for deterministic, instant-advance timing.
 */

/** Provides the current time as a unix timestamp (ms). */
export interface Clock {
  now(): number;
}

/** Provides setTimeout / clearTimeout without binding to global. */
export interface Scheduler {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

// ─── Real (wall-clock) implementations ───────────────────────────────────────

export const realClock: Clock = {
  now: () => Date.now(),
};

export const realScheduler: Scheduler = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

// ─── Fake implementations for tests ──────────────────────────────────────────

export class FakeClock implements Clock {
  private _now: number;

  constructor(startMs: number = Date.now()) {
    this._now = startMs;
  }

  now(): number {
    return this._now;
  }

  advance(ms: number): void {
    this._now += ms;
  }

  set(ms: number): void {
    this._now = ms;
  }
}

interface PendingTimer {
  id: number;
  runAt: number;
  fn: () => void;
  cancelled: boolean;
}

export class FakeScheduler implements Scheduler {
  private _nextId = 1;
  private _pending: PendingTimer[] = [];

  constructor(private readonly clock: FakeClock) {}

  setTimeout(fn: () => void, ms: number): number {
    const id = this._nextId++;
    this._pending.push({ id, runAt: this.clock.now() + ms, fn, cancelled: false });
    return id;
  }

  clearTimeout(handle: unknown): void {
    const id = handle as number;
    const t = this._pending.find(p => p.id === id);
    if (t) t.cancelled = true;
  }

  /**
   * Fire all timers whose runAt <= clock.now().
   * Call after advancing the FakeClock.
   */
  tick(): void {
    const now = this.clock.now();
    // Take a snapshot so newly-added timers in callbacks don't re-run this tick
    const due = this._pending.filter(p => !p.cancelled && p.runAt <= now);
    this._pending = this._pending.filter(p => p.cancelled || p.runAt > now);
    for (const t of due) {
      if (!t.cancelled) t.fn();
    }
  }

  /** Drain ALL pending timers in chronological order (advances the clock automatically). */
  drainAll(): void {
    while (true) {
      const remaining = this._pending.filter(p => !p.cancelled);
      if (remaining.length === 0) break;
      const next = remaining.reduce((a, b) => (a.runAt <= b.runAt ? a : b));
      this.clock.set(next.runAt);
      this.tick();
    }
  }

  get pendingCount(): number {
    return this._pending.filter(p => !p.cancelled).length;
  }
}
