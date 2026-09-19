import { BadRequestException, Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { voiceEndSchema, voiceTimeSchema } from '@dispatch/contracts';
import { VoiceService } from './voice.service.js';

@Controller('voice')
export class VoiceController {
  constructor(private readonly voice: VoiceService) {}

  @Get('config')
  config() { return this.voice.configuration(); }

  @Post('sessions')
  @Header('Cache-Control', 'no-store')
  start() { return this.voice.start(); }

  @Get('sessions/:id')
  session(@Param('id') id: string) { return this.voice.get(id); }

  @Post('sessions/:id/check-availability')
  check(@Param('id') id: string, @Body() body: unknown) {
    return this.voice.check(id, this.parseTime(body));
  }

  @Post('sessions/:id/accept')
  accept(@Param('id') id: string, @Body() body: unknown) {
    return this.voice.accept(id, this.parseTime(body));
  }

  @Post('sessions/:id/decline')
  decline(@Param('id') id: string) { return this.voice.decline(id); }

  @Post('sessions/:id/end')
  end(@Param('id') id: string, @Body() body: unknown) {
    const parsed = voiceEndSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Expected reason: ended or failed');
    return this.voice.end(id, parsed.data.reason);
  }

  private parseTime(body: unknown): string {
    const parsed = voiceTimeSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Expected time in HH:mm format, e.g. 15:30');
    return parsed.data.time;
  }
}
