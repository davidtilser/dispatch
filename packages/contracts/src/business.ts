import { z } from 'zod';

export const publicWebsiteSchema = z.string().url().max(2000).refine(value => {
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
}, 'Use a public http or https website.');

export const demoBusinessSetupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  website: publicWebsiteSchema,
  service: z.object({
    name: z.string().trim().min(1).max(120),
    priceCents: z.number().int().min(100).max(100000),
    durationMinutes: z.number().int().min(15).max(90),
  }),
});
export type DemoBusinessSetup = z.infer<typeof demoBusinessSetupSchema>;
export interface BusinessImportPreview {
  website: string;
  name: string;
  services: { name: string; priceCents?: number; durationMinutes?: number }[];
  source: 'website' | 'managed_agent' | 'manual';
  notice: string;
}
