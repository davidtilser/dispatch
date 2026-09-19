import { Injectable } from '@nestjs/common';
import type { BusinessProfile } from '@dispatch/contracts';

// In-memory shop profiles. Seeded so the refill demo works before anyone crawls.
@Injectable()
export class BusinessStore {
  private readonly profiles = new Map<string, BusinessProfile>([
    [
      'biz_001',
      {
        id: 'biz_001',
        name: 'Apblendzz',
        website: 'https://booksy.com/en-us/967270_apblendzz-348-broadway-millbrae_barber-shop_103239_millbrae',
        timezone: 'America/Los_Angeles',
        services: ['Haircut ($45)'],
      },
    ],
  ]);

  async get(id: string): Promise<BusinessProfile | null> {
    return this.profiles.get(id) ?? null;
  }

  save(profile: BusinessProfile): BusinessProfile {
    this.profiles.set(profile.id, profile);
    return profile;
  }
}
