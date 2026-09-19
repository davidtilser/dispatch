import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import type { DispatchManager } from '@dispatch/agents';
import type { CallOutcome } from '@dispatch/contracts';
import { DemoVoice } from './demo-voice.js';
import { MANAGER, VOICE } from './tokens.js';

@Controller()
export class RefillController {
  constructor(
    @Inject(MANAGER) private readonly manager: DispatchManager,
    @Inject(VOICE) private readonly voice: unknown,
  ) {}

  // POST /api/slots/:slotId/cancel  -> starts calling the waitlist
  @Post('slots/:slotId/cancel')
  async cancel(@Param('slotId') slotId: string) {
    return this.manager.startRefill(slotId);
  }

  // GET /api/refills/:runId  -> dashboard polls this
  @Get('refills/:runId')
  async get(@Param('runId') runId: string) {
    const details = await this.manager.getRunDetails(runId);
    if (!details) throw new NotFoundException(`No run ${runId}`);
    const currentCall = this.voice instanceof DemoVoice ? this.voice.latestFor(runId) : undefined;
    return { ...details, currentBrief: currentCall?.brief ?? null };
  }

  // POST /api/refills/:runId/simulate  { "type": "declined" } or { "type": "accepted", "startsAt": "..." }
  // Demo/testing only: pretends the active call ended with this outcome.
  @Post('refills/:runId/simulate')
  async simulate(@Param('runId') runId: string, @Body() outcome: CallOutcome) {
    const run = await this.manager.getRun(runId);
    if (!run) throw new NotFoundException(`No run ${runId}`);
    if (!run.activeAttemptId) throw new BadRequestException('No call in progress');
    return this.manager.recordCallOutcome({ runId, attemptId: run.activeAttemptId, outcome });
  }
}
