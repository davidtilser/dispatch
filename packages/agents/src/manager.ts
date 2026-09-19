import type { CallOutcome, RefillRun } from '@dispatch/contracts';

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
