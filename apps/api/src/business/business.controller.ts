import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ClaudeCrawlAgent } from '@dispatch/agents';
import { businessUrlSchema, type BusinessProfile } from '@dispatch/contracts';
import { BusinessStore } from './business.store.js';

@Controller('business')
export class BusinessController {
  constructor(@Inject(BusinessStore) private readonly store: BusinessStore) {}

  // POST /api/business/import  { "url": "https://..." }
  @Post('import')
  async import(@Body() body: unknown): Promise<BusinessProfile> {
    const parsed = businessUrlSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Send { "url": "https://..." }');

    const crawler = new ClaudeCrawlAgent({
      environmentId: requireEnv('DISPATCH_ENV_ID'),
      crawlAgentId: requireEnv('DISPATCH_CRAWL_AGENT_ID'),
    });
    const profile = await crawler.learnBusiness(parsed.data.url);
    return this.store.save(profile);
  }

  // GET /api/business/:id
  @Get(':id')
  async get(@Param('id') id: string): Promise<BusinessProfile> {
    const profile = await this.store.get(id);
    if (!profile) throw new NotFoundException(`No business ${id}`);
    return profile;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env`);
  return value;
}
