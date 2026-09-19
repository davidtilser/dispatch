import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller.js';
import { BusinessStore } from './business.store.js';

@Module({
  controllers: [BusinessController],
  providers: [BusinessStore],
  exports: [BusinessStore],
})
export class BusinessModule {}
