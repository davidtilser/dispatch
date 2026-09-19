import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { BusinessModule } from './business/business.module.js';
import { RefillModule } from './refill/refill.module.js';
import { VoiceModule } from './voice/voice.module.js';

@Module({ imports: [BusinessModule, RefillModule, VoiceModule], controllers: [HealthController] })
export class AppModule {}
