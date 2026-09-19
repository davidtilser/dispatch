import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller.js';
import { BusinessStore } from './business.store.js';
import { BusinessImporter } from './business-importer.js';

@Module({
  controllers: [BusinessController],
  providers: [BusinessStore, BusinessImporter],
  exports: [BusinessStore],
})
export class BusinessModule {}
