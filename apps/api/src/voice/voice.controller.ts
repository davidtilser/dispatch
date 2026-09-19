import { BadRequestException, Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { voiceAcceptSchema, voiceAvailabilitySchema, voiceEndSchema } from '@dispatch/contracts';
import { VoiceService } from './voice.service.js';

@Controller('voice')
export class VoiceController {
  constructor(private readonly voice: VoiceService) {}

  @Get('config')
  config() { return this.voice.configuration(); }

  @Post('sessions')
  @Header('Cache-Control', 'no-store')
  start(@Body() body: { attemptId?: unknown } = {}) {
    if (body.attemptId !== undefined && typeof body.attemptId !== 'string') throw new BadRequestException('Invalid attempt ID');
    return this.voice.start(body.attemptId as string | undefined);
  }

  @Get('sessions/:id')
  session(@Param('id') id: string) { return this.voice.get(id); }

  @Post('sessions/:id/check-availability')
  check(@Param('id') id: string, @Body() body: unknown) {
    const parsed = voiceAvailabilitySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Use date YYYY-MM-DD, time HH:mm, and/or partOfDay morning, afternoon or evening.');
    return this.voice.check(id, parsed.data);
  }

  @Post('sessions/:id/accept')
  accept(@Param('id') id: string, @Body() body: unknown) {
    const parsed = voiceAcceptSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Use an exact date YYYY-MM-DD and time HH:mm with confirmed: true after explicit agreement.');
    return this.voice.accept(id, parsed.data);
  }

  @Post('sessions/:id/decline')
  decline(@Param('id') id: string) { return this.voice.decline(id); }

  @Post('sessions/:id/end')
  end(@Param('id') id: string, @Body() body: unknown) {
    const parsed = voiceEndSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Expected reason: ended or failed');
    return this.voice.end(id, parsed.data.reason);
  }

}
