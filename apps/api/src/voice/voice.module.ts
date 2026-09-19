import { Module } from '@nestjs/common';
import { RefillModule } from '../refill/refill.module.js';
import { VoiceBridge } from './voice-bridge.service.js';
import { VoiceController } from './voice.controller.js';
import { VoiceService } from './voice.service.js';

@Module({
  imports: [RefillModule],
  controllers: [VoiceController],
  providers: [VoiceService, VoiceBridge],
  exports: [VoiceService],
})
export class VoiceModule {}
