import { Module } from '@nestjs/common';
import { ClaudeBriefWriter, DispatchManager, type ManagerVoice } from '@dispatch/agents';
import { BusinessModule } from '../business/business.module.js';
import { BusinessStore } from '../business/business.store.js';
import { SqliteBookings, localTime } from '@dispatch/data';
import { fileURLToPath } from 'node:url';
import { DemoCoordinator } from './demo-coordinator.js';
import { DemoVoice } from './demo-voice.js';
import { RefillController } from './refill.controller.js';
import { BOOKINGS, MANAGER, VOICE } from './tokens.js';

@Module({
  imports: [BusinessModule],
  controllers: [RefillController],
  providers: [
    DemoCoordinator,
    // Shared SQLite calendar and manually accepted browser-call offers.
    { provide: BOOKINGS, useFactory: () => new SqliteBookings(process.env.DEMO_DB_PATH ?? fileURLToPath(new URL('../../../../.demo/dispatch.sqlite', import.meta.url))) },
    { provide: VOICE, inject: [BOOKINGS], useFactory: (bookings: SqliteBookings) => new DemoVoice((message, action) => bookings.log(message, action)) },
    {
      provide: MANAGER,
      inject: [BusinessStore, BOOKINGS, VOICE],
      useFactory: (business: BusinessStore, bookings: SqliteBookings, voice: ManagerVoice) => {
        const { DISPATCH_ENV_ID, DISPATCH_MANAGER_AGENT_ID } = process.env;
        return new DispatchManager({
          bookings,
          voice,
          getBusiness: (id) => business.get(id),
          alternativesFor: async (slot) => (await bookings.availableTimes(slot.id)).map(localTime),
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
  exports: [MANAGER, DemoCoordinator],
})
export class RefillModule {}
