import { BadRequestException, Body, Controller, Get, Header, Inject, Optional, Param, Post } from '@nestjs/common';
import { voiceEndSchema, voiceTimeSchema } from '@dispatch/contracts';
import { VoiceBridge } from './voice-bridge.service.js';
import { VoiceService } from './voice.service.js';

@Controller('voice')
export class VoiceController {
  constructor(
    private readonly voice: VoiceService,
    @Optional() @Inject(VoiceBridge) private readonly bridge?: VoiceBridge,
  ) {}

  @Get('config')
  config() { return this.voice.configuration(); }

  // Body { "runId": "run_1" } talks to whoever the manager is calling. No runId = standalone demo.
  @Post('sessions')
  @Header('Cache-Control', 'no-store')
  async start(@Body() body: unknown) {
    const runId = typeof body === 'object' && body !== null && 'runId' in body && typeof body.runId === 'string' ? body.runId : undefined;
    if (!runId || !this.bridge) return this.voice.start();
    const { context, link } = await this.bridge.contextFor(runId);
    const started = await this.voice.start(context);
    this.bridge.link(started.session.id, link);
    return started;
  }

  @Get('sessions/:id')
  session(@Param('id') id: string) { return this.voice.get(id); }

  @Post('sessions/:id/check-availability')
  check(@Param('id') id: string, @Body() body: unknown) {
    return this.voice.check(id, this.parseTime(body));
  }

  @Post('sessions/:id/accept')
  accept(@Param('id') id: string, @Body() body: unknown) {
    const time = this.parseTime(body);
    return this.bridge?.isLinked(id) ? this.bridge.accept(id, time) : this.voice.accept(id, time);
  }

  @Post('sessions/:id/decline')
  decline(@Param('id') id: string) {
    return this.bridge?.isLinked(id) ? this.bridge.decline(id) : this.voice.decline(id);
  }

  @Post('sessions/:id/end')
  end(@Param('id') id: string, @Body() body: unknown) {
    const parsed = voiceEndSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Expected reason: ended or failed');
    return this.bridge?.isLinked(id) ? this.bridge.end(id, parsed.data.reason) : this.voice.end(id, parsed.data.reason);
  }

  private parseTime(body: unknown): string {
    const parsed = voiceTimeSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Expected time in HH:mm format, e.g. 15:30');
    return parsed.data.time;
  }
}
