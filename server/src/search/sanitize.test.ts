import { describe, it, expect } from 'vitest';
import { sanitizeBusiness } from './sanitize.js';

function validBusiness(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'biz_1',
    name: 'Test Barber',
    category: 'barber',
    description: 'A test shop.',
    address: '1 Main St',
    lat: 37.5,
    lng: -121.9,
    phone: '555-0100',
    priceLevel: 2,
    rating: 4.5,
    services: [{ id: 'svc_1', name: 'Haircut', durationMin: 30, priceCents: 2000 }],
    hours: { mon: { open: '09:00', close: '17:00' } },
    resources: [{ id: 'res_1', name: 'Chair 1' }],
    ...overrides,
  };
}

describe('sanitizeBusiness', () => {
  it('passes a well-formed business through unchanged', () => {
    const result = sanitizeBusiness(validBusiness());
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Test Barber');
    expect(result?.category).toBe('barber');
  });

  it('strips HTML tags from name and description', () => {
    const result = sanitizeBusiness(
      validBusiness({
        name: '<b>Bob\'s</b> Barber Shop',
        description: 'Great cuts <script>alert(1)</script> in town.',
      }),
    );
    expect(result?.name).toBe("Bob's Barber Shop");
    expect(result?.description).toBe('Great cuts alert(1) in town.');
    // No tag characters should survive.
    expect(result?.name).not.toMatch(/[<>]/);
    expect(result?.description).not.toMatch(/[<>]/);
  });

  it('strips control characters from name', () => {
    const result = sanitizeBusiness(validBusiness({ name: 'Bob\x00\x07 Barber' }));
    expect(result?.name).toBe('Bob Barber');
  });

  it('drops the record if the name is nothing but HTML/control chars', () => {
    const result = sanitizeBusiness(validBusiness({ name: '<script></script>' }));
    expect(result).toBeNull();
  });

  it('caps name at 80 characters', () => {
    const longName = 'A'.repeat(120);
    const result = sanitizeBusiness(validBusiness({ name: longName }));
    expect(result?.name.length).toBe(80);
  });

  it('caps description at 300 characters', () => {
    const longDescription = 'B'.repeat(500);
    const result = sanitizeBusiness(validBusiness({ description: longDescription }));
    expect(result?.description.length).toBe(300);
  });

  it('clamps rating above 5 down to 5', () => {
    const result = sanitizeBusiness(validBusiness({ rating: 9.9 }));
    expect(result?.rating).toBe(5);
  });

  it('clamps rating below 0 up to 0', () => {
    const result = sanitizeBusiness(validBusiness({ rating: -3 }));
    expect(result?.rating).toBe(0);
  });

  it('clamps priceLevel above 3 down to 3', () => {
    const result = sanitizeBusiness(validBusiness({ priceLevel: 7 }));
    expect(result?.priceLevel).toBe(3);
  });

  it('clamps priceLevel below 1 up to 1', () => {
    const result = sanitizeBusiness(validBusiness({ priceLevel: -2 }));
    expect(result?.priceLevel).toBe(1);
  });

  it('drops the record when lat is out of range', () => {
    expect(sanitizeBusiness(validBusiness({ lat: 200 }))).toBeNull();
    expect(sanitizeBusiness(validBusiness({ lat: -200 }))).toBeNull();
  });

  it('drops the record when lng is out of range', () => {
    expect(sanitizeBusiness(validBusiness({ lng: 200 }))).toBeNull();
    expect(sanitizeBusiness(validBusiness({ lng: -200 }))).toBeNull();
  });

  it('drops the record when a required field is missing', () => {
    const { id: _id, ...withoutId } = validBusiness();
    expect(sanitizeBusiness(withoutId)).toBeNull();
  });

  it('drops the record when category is not a known category', () => {
    expect(sanitizeBusiness(validBusiness({ category: 'not-a-real-category' }))).toBeNull();
  });

  it('drops non-object input', () => {
    expect(sanitizeBusiness(null)).toBeNull();
    expect(sanitizeBusiness('a string')).toBeNull();
    expect(sanitizeBusiness(42)).toBeNull();
  });
});
