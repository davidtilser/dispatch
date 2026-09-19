import { RefillModule } from '../refill/refill.module.js';
import { Module } from '@nestjs/common';
import { VoiceController } from './voice.controller.js';
import { VoiceService } from './voice.service.js';

@Module({ imports: [RefillModule], controllers: [VoiceController], providers: [VoiceService], exports: [VoiceService] })
export class VoiceModule {}
