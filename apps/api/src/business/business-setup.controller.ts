import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { demoBusinessSetupSchema } from '@dispatch/contracts';
import { DemoCoordinator } from '../refill/demo-coordinator.js';

@Controller('demo/business')
export class BusinessSetupController {
  constructor(private readonly demo: DemoCoordinator) {}
  @Get()
  get() { return this.demo.businessSetup(); }
  @Post()
  activate(@Body() body: unknown) {
    const parsed = demoBusinessSetupSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Check the business name, website, service, price and duration (15–90 minutes).');
    return this.demo.activateBusiness(parsed.data);
  }
}
