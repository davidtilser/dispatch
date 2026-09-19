import { Module } from '@nestjs/common';
import { ClaudeBriefWriter, DispatchManager, type ManagerBookings, type ManagerVoice } from '@dispatch/agents';
import { BusinessModule } from '../business/business.module.js';
import { BusinessStore } from '../business/business.store.js';
import { DemoBookings } from './demo-bookings.js';
import { DemoVoice } from './demo-voice.js';
import { RefillController } from './refill.controller.js';
import { BOOKINGS, MANAGER, VOICE } from './tokens.js';

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Los_Angeles',
};

@Module({
  imports: [BusinessModule],
  controllers: [RefillController],
  providers: [
    // Swap these two for the real packages/data and packages/voice adapters when ready.
    { provide: BOOKINGS, useFactory: () => new DemoBookings() },
    { provide: VOICE, useFactory: () => new DemoVoice() },
    {
      provide: MANAGER,
      inject: [BusinessStore, BOOKINGS, VOICE],
      useFactory: (business: BusinessStore, bookings: ManagerBookings, voice: ManagerVoice) => {
        const { DISPATCH_ENV_ID, DISPATCH_MANAGER_AGENT_ID } = process.env;
        return new DispatchManager({
          bookings,
          voice,
          getBusiness: (id) => business.get(id),
          alternativesFor: async (slot) =>
            bookings instanceof DemoBookings
              ? (bookings.openTimes.get(slot.id) ?? []).map((t) =>
                  new Date(t).toLocaleTimeString('en-US', TIME_FORMAT),
                )
              : [],
          // Claude writes each call's script when configured; otherwise a template is used.
          ...(DISPATCH_ENV_ID && DISPATCH_MANAGER_AGENT_ID
            ? {
                briefWriter: new ClaudeBriefWriter({
                  environmentId: DISPATCH_ENV_ID,
                  managerAgentId: DISPATCH_MANAGER_AGENT_ID,
                }),
              }
            : {}),
        });
      },
    },
  ],
  exports: [MANAGER, VOICE, BOOKINGS],
})
export class RefillModule {}
